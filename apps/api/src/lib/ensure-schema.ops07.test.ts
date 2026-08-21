import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * OPS-07 — two schema-application mechanisms contradicted each other.
 *
 * The API's start command is, verbatim from `apps/api/package.json`:
 *
 *     "start": "prisma migrate deploy && node dist/server.js"
 *
 * and `render.yaml` runs exactly that (`startCommand: pnpm --filter @poojly/api
 * start`). So `prisma migrate deploy` runs FIRST, to completion, before the Node
 * process exists. Then `bootstrap()` immediately called `ensureSchemaInvariants`,
 * which replayed ~95 hand-written DDL statements against the same database.
 *
 * Two mechanisms, no declared winner, and the boot-time one was justified by a
 * premise that is false: its header claimed "Render's start command bypasses our
 * `pnpm start` wrapper that runs `prisma migrate deploy`, which means pending
 * migrations never apply in prod". `render.yaml` disproves that on its face.
 *
 * The contradiction is not theoretical. `20260511_user_blocked/migration.sql`
 * contains plain, non-idempotent DDL:
 *
 *     ALTER TABLE "users" ADD COLUMN "blocked" ...
 *     CREATE INDEX "users_blocked_idx" ON "users" ("blocked") WHERE ...
 *
 * and `ensure-schema.ts` creates the same two objects with IF NOT EXISTS. On any
 * database where the boot-time replay reached those objects before Prisma
 * recorded that migration, `prisma migrate deploy` fails 42701/42P07, `&&`
 * short-circuits, `node dist/server.js` never runs, and the container
 * crash-loops — with the migration now marked FAILED, which blocks every later
 * migration until someone runs `prisma migrate resolve` by hand.
 *
 * What is asserted here:
 *   1. `prisma migrate deploy` is the declared winner: the boot-time replay is
 *      inert in production unless an operator explicitly forces it.
 *   2. Forcing it still works, so the documented recovery path is intact.
 *   3. The overlap between the two mechanisms is frozen. It cannot silently grow
 *      — a new ensure-schema statement that collides with plain migration DDL
 *      fails this test.
 *
 * See docs/runbooks/schema-authority.md.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  } as Record<string, any>,
}));

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

import {
  ensureSchemaInvariants,
  SCHEMA_INVARIANT_STATEMENTS,
  schemaReplayDecision,
} from './ensure-schema.js';

const log = { info: vi.fn(), error: vi.fn() };
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://localhost:5432/test';
  delete process.env.SCHEMA_INVARIANTS_FORCE;
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('no marker table'));
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe('OPS-07 — prisma migrate deploy is the schema authority', () => {
  it('runs no DDL at all in production: migrate deploy already ran, and won', async () => {
    process.env.NODE_ENV = 'production';

    await ensureSchemaInvariants(log);

    // Not one statement, and not even the marker read — the whole mechanism is
    // inert. Before this fix, ~95 ALTER/CREATE statements ran here on the first
    // boot after every deploy that changed the statement list.
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('names the winner in the boot log rather than skipping silently', async () => {
    process.env.NODE_ENV = 'production';

    await ensureSchemaInvariants(log);

    const said = log.info.mock.calls.map((c) => String(c[0])).join('\n');
    expect(said).toContain('prisma migrate deploy');
    expect(said).toContain('SCHEMA_INVARIANTS_FORCE');
  });

  it('still replays in production when an operator forces it — the recovery path survives', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SCHEMA_INVARIANTS_FORCE = 'true';

    await ensureSchemaInvariants(log);

    const ddl = prismaMock.$executeRawUnsafe.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((sql: string) => !sql.includes('_schema_invariants'));
    expect(ddl.length).toBe(SCHEMA_INVARIANT_STATEMENTS.length);
  });

  it('leaves non-production boots alone — local dev has no migrate-deploy wrapper', async () => {
    process.env.NODE_ENV = 'development';

    await ensureSchemaInvariants(log);

    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('summarises DDL failures in one error line instead of scattering them', async () => {
    process.env.NODE_ENV = 'development';
    let n = 0;
    prismaMock.$executeRawUnsafe.mockImplementation(async () => {
      if (++n <= 2) throw new Error('permission denied for schema public');
      return 0;
    });

    await ensureSchemaInvariants(log);

    const summary = log.error.mock.calls.find((c) =>
      String(c[1] ?? '').includes('statement(s) FAILED'),
    );
    expect(summary).toBeDefined();
    expect(summary![0]).toMatchObject({ failed: 2 });
    expect(String(summary![1])).toContain('prisma migrate deploy');
  });

  it('exposes the decision so it can be asserted rather than inferred', () => {
    const DB = 'postgres://localhost:5432/test';

    expect(schemaReplayDecision({ NODE_ENV: 'production', DATABASE_URL: DB })).toEqual({
      replay: false,
      authority: 'prisma migrate deploy',
      reason: 'authority-owns-production',
    });
    expect(
      schemaReplayDecision({
        NODE_ENV: 'production',
        DATABASE_URL: DB,
        SCHEMA_INVARIANTS_FORCE: 'true',
      }),
    ).toEqual({ replay: true, authority: 'prisma migrate deploy', reason: 'forced' });
    expect(schemaReplayDecision({ NODE_ENV: 'development', DATABASE_URL: DB }).replay).toBe(true);
    expect(schemaReplayDecision({ NODE_ENV: 'production', DATABASE_URL: undefined })).toEqual({
      replay: false,
      authority: 'prisma migrate deploy',
      reason: 'no-database-url',
    });
  });
});

/**
 * The overlap guard.
 *
 * Reads every committed migration, strips SQL comments FIRST (a `--` line
 * mentioning a column is not DDL, and a guard that counts commented-out text as
 * real DDL is a guard that lies), and collects the objects each migration
 * creates with NON-idempotent DDL — the statements that will abort
 * `prisma migrate deploy` if the object already exists.
 *
 * Then it intersects that with the objects `ensure-schema.ts` creates. The
 * statement list is IMPORTED, not scraped from source text, so a commented-out
 * statement cannot be mistaken for a live one.
 */
const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'prisma', 'migrations');

/** Remove `--` line comments and block comments before any pattern matching. */
export function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/**
 * Drop `DO $$ … $$` blocks that carry their own existence guard. Both files use
 * that shape for enums and constraints:
 *
 *     DO $$ BEGIN CREATE TYPE "X" AS ENUM (…);
 *     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
 *
 * The CREATE inside is guarded, so counting it as non-idempotent would freeze a
 * collision that does not exist. Only guarded blocks are removed — an
 * unguarded `DO $$` still gets scanned.
 */
export function stripGuardedDoBlocks(sql: string): string {
  return sql.replace(/\bDO\s+\$\$[\s\S]*?\$\$/gi, (block) =>
    /EXCEPTION\s+WHEN\s+duplicate_\w+/i.test(block) || /IF\s+NOT\s+EXISTS\s*\(/i.test(block)
      ? ' '
      : block,
  );
}

/** Objects a migration creates WITHOUT an existence guard, lowercased. */
function nonIdempotentObjects(sql: string): Set<string> {
  const body = stripGuardedDoBlocks(stripSqlComments(sql));
  const found = new Set<string>();

  // CREATE [UNIQUE] INDEX "x"  /  CREATE TABLE "x"  /  CREATE TYPE "x"
  const createRe =
    /\bCREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX|TYPE)\s+(?!IF\s+NOT\s+EXISTS)"?([A-Za-z0-9_]+)"?/gi;
  for (const m of body.matchAll(createRe)) found.add(m[2]!.toLowerCase());

  // ALTER TABLE "t" ... ADD COLUMN "c"  (without IF NOT EXISTS) -> "t.c"
  const alterRe = /\bALTER\s+TABLE\s+(?:ONLY\s+)?"?([A-Za-z0-9_]+)"?([\s\S]*?);/gi;
  for (const m of body.matchAll(alterRe)) {
    const table = m[1]!.toLowerCase();
    const tail = m[2]!;
    for (const c of tail.matchAll(
      /\bADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)"?([A-Za-z0-9_]+)"?/gi,
    )) {
      found.add(`${table}.${c[1]!.toLowerCase()}`);
    }
  }
  return found;
}

/** Objects ensure-schema.ts creates, from the imported statements. */
function ensureSchemaObjects(): Set<string> {
  const found = new Set<string>();
  for (const raw of SCHEMA_INVARIANT_STATEMENTS) {
    const sql = stripSqlComments(raw);
    for (const m of sql.matchAll(
      /\bCREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TYPE)\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi,
    )) {
      found.add(m[1]!.toLowerCase());
    }
    for (const m of sql.matchAll(
      /\bALTER\s+TABLE\s+"?([A-Za-z0-9_]+)"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi,
    )) {
      found.add(`${m[1]!.toLowerCase()}.${m[2]!.toLowerCase()}`);
    }
  }
  return found;
}

/**
 * The overlap as it stands on 2026-08-21, each entry verified by hand against
 * the migration that owns it. These are the objects that would abort
 * `prisma migrate deploy` if the boot-time replay reached the database first —
 * which is why the replay is now off in production.
 *
 * Do NOT add to this list to make a red test green. A new entry means a new way
 * to crash-loop production; write the migration with IF NOT EXISTS, or drop the
 * statement from ensure-schema.ts.
 */
const KNOWN_OVERLAP = [
  // 20260511_user_blocked/migration.sql:7-15 — one bare ALTER adding three
  // columns, plus a bare CREATE INDEX.
  'users.blocked',
  'users.blocked_reason',
  'users.blocked_at',
  'users_blocked_idx',

  // 20260514000000_reading_progress/migration.sql:2,17,20
  'reading_progress',
  'reading_progress_user_id_book_slug_key',
  'reading_progress_user_id_idx',

  // 20260519000000_gaushala_cows_volunteers/migration.sql:2,20,21,24,37,43,60
  'cows',
  'cows_gaushala_id_tag_number_key',
  'cows_gaushala_id_created_at_idx',
  'cow_health_records',
  'cow_health_records_cow_id_recorded_at_idx',
  'volunteers',
  'volunteers_gaushala_id_active_idx',

  // 20260428_provider_kyc/migration.sql:10,41
  'provider_kyc',
  'provider_kyc_verified_idx',
];

describe('OPS-07 — the two mechanisms must not fight over the same objects', () => {
  const migrationSql: Array<{ name: string; sql: string }> = readdirSync(MIGRATIONS_DIR)
    .filter((entry) => {
      const p = join(MIGRATIONS_DIR, entry);
      return statSync(p).isDirectory();
    })
    .map((dir) => ({
      name: dir,
      sql: readFileSync(join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8'),
    }));

  it('reads a non-empty set of migrations (guard against a silently empty scan)', () => {
    expect(migrationSql.length).toBeGreaterThan(20);
    expect(SCHEMA_INVARIANT_STATEMENTS.length).toBeGreaterThan(50);
  });

  it('strips comments before matching, so commented-out DDL never counts', () => {
    const commented = `
      -- CREATE TABLE "ghost_table" (id int);
      /* CREATE INDEX "ghost_index" ON x (y); */
      CREATE TABLE "real_table" (id int);
    `;
    const objs = nonIdempotentObjects(commented);
    expect(objs.has('ghost_table')).toBe(false);
    expect(objs.has('ghost_index')).toBe(false);
    expect(objs.has('real_table')).toBe(true);
  });

  it('does not count a DO-block CREATE that carries its own duplicate guard', () => {
    const guarded = `
      DO $$ BEGIN
        CREATE TYPE "GuardedEnum" AS ENUM ('a');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "UnguardedEnum" AS ENUM ('a');
      END $$;
    `;
    const objs = nonIdempotentObjects(guarded);
    expect(objs.has('guardedenum')).toBe(false);
    expect(objs.has('unguardedenum')).toBe(true);
  });

  it('the overlap between migrations and the boot replay has not grown', () => {
    const replayed = ensureSchemaObjects();
    const collisions = new Set<string>();
    for (const { sql } of migrationSql) {
      for (const obj of nonIdempotentObjects(sql)) {
        if (replayed.has(obj)) collisions.add(obj);
      }
    }
    expect([...collisions].sort()).toEqual([...KNOWN_OVERLAP].sort());
  });
});
