/**
 * SCAL-04 — `?role=…` on the admin user list is a Prisma relation predicate,
 * resolved by Postgres, with no hand-written SQL and no whole-user-base read.
 *
 * WHAT THIS REPLACES, AND WHY THE FILE IT REPLACES IS GONE.
 *
 * `admin.service.getUsers` has now had three shapes:
 *
 *   1. (until 2026-08-21) read EVERY `user_role_assignment` row holding the
 *      role, map it to a bare uuid list, send that list BACK to Postgres as an
 *      `IN (...)` in both the page query and the count. The one read in this
 *      service that scaled with the whole USER BASE — and it scaled outbound
 *      too: ~7 MB of uuids per statement, twice per request, at 200k holders.
 *   2. (2026-08-21) a hand-written `$queryRaw` JOIN, with the shape above kept
 *      behind a logged catch as a fallback, because production is suspended and
 *      no statement in this repo could be executed against a database to prove
 *      the identifiers. `admin.service.role-filter-sql.scal04.test.ts` existed
 *      to re-derive every quoted table and column from prisma/schema.prisma,
 *      since the schema file was the only oracle available.
 *   3. (this change) `where: { roleAssignments: { some: { role } } }`.
 *
 * Shape 3 is what shapes 1 and 2 were both working around. It was rejected
 * outright by Prisma — `Unknown argument 'roleAssignments'` — for exactly one
 * reason: `UserRoleAssignment` declared `userId` as a bare `@db.Uuid` column
 * with no `@relation` to `User`, and `User` had no back-reference. That is a
 * schema change, and three previous passes refused it on one specific ground:
 * migrations auto-apply on API boot (render.yaml -> apps/api/package.json
 * `prisma migrate deploy && node dist/server.js`), no migration in
 * prisma/migrations mentions `user_role_assignments` at all, so whether the
 * foreign key already exists in production could not be established from this
 * repo — and a migration that fails converts a slow screen into a boot failure.
 *
 * THAT GROUND IS ANSWERED, NOT WAVED AWAY, and the answer is asserted below
 * rather than merely written in prose: the migration adds the constraint
 * `NOT VALID`, which by definition does not read a single existing row and
 * therefore cannot fail on data no matter what production holds; it is guarded
 * by a `pg_constraint` existence check so a pre-existing foreign key is a
 * no-op; and it is wrapped in `EXCEPTION WHEN OTHERS` so the migration commits
 * and the API boots even in a case nobody predicted. A skipped constraint
 * leaves the database exactly as it is today, and the query still works —
 * Prisma generates the join from the SCHEMA, never from the constraint.
 *
 * WHY THE SQL GUARD FILE WAS DELETED RATHER THAN LEFT PASSING. Its entire
 * subject — two `$queryRaw` statements and the id-resolution fallback under
 * them — no longer exists in admin.service.ts. Every guarantee it held that
 * still means something is carried into this file: the page is bounded and
 * offset, `total` comes from a COUNT and never from the page length, the page
 * and the count are constrained by the SAME predicate (SCAL-09's lying-number
 * invariant), an unknown role never reaches the database, and no read touches
 * the assignment table except the page-bounded roles hydration. What it can no
 * longer hold is the identifier derivation, because there are no longer any
 * hand-written identifiers to derive — which is the point of the change.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

const PRISMA_DIR = join(import.meta.dirname, '..', '..', 'prisma');
const SCHEMA = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf8');

/**
 * The body of ONE `model X { … }` block, brace-balanced.
 *
 * Deliberately NOT a regex over the whole schema: this sweep has now shipped
 * eight source-text guards that tested a nested structure while meaning the top
 * level, and "the schema contains `roleAssignments`" would be satisfied by any
 * other model in the file declaring a field with that name.
 */
function modelBlock(model: string): string {
  const start = SCHEMA.search(new RegExp(`^model\\s+${model}\\s*\\{`, 'm'));
  if (start === -1) throw new Error(`model ${model} not found in schema.prisma`);
  const open = SCHEMA.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < SCHEMA.length; i += 1) {
    if (SCHEMA[i] === '{') depth += 1;
    else if (SCHEMA[i] === '}') {
      depth -= 1;
      if (depth === 0) return SCHEMA.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated model block: ${model}`);
}

/**
 * Line comments stripped — both blocks explain the relation in prose that names
 * the very attributes these assertions look for.
 */
const stripLineComments = (s: string) => s.replace(/\/\/[^\n]*/g, ' ');

const USER_BLOCK_RAW = modelBlock('User');
const URA_BLOCK_RAW = modelBlock('UserRoleAssignment');
const USER_BLOCK = stripLineComments(USER_BLOCK_RAW);
const URA_BLOCK = stripLineComments(URA_BLOCK_RAW);

/**
 * COMPILE-TIME PROOF that the predicate is a legal Prisma argument, and the
 * only place that proof exists.
 *
 * `getUsers` builds its filter into a `Record<string, unknown>` and hands that
 * to `prisma.user.findMany`, so TypeScript checks NOTHING about the keys inside
 * it — a misspelt `roleAssignment` (singular) would compile, ship, and become
 * "Unknown argument" at runtime on the operator's main screen. This repo has
 * already lost an endpoint for six days to exactly that (a `groupBy` naming a
 * field `model Waitlist` has never had, behind a swallowing catch).
 *
 * Annotating the literal as `Prisma.UserWhereInput` moves that check to build
 * time, and the assertions below compare the object the service actually built
 * against THIS literal — so the runtime shape and the type-checked shape cannot
 * drift apart. Verified by probe: changing `roleAssignments` to
 * `roleAssignment` here fails `tsc --noEmit` with
 * "Object literal may only specify known properties".
 */
const ROLE_PREDICATE = (role: 'PANDIT' | 'ADMIN'): Prisma.UserWhereInput => ({
  roleAssignments: { some: { role } },
});

let service: AdminService;

const userRow = (id: string, createdAt = new Date('2026-08-01')) => ({
  id,
  fullName: id.toUpperCase(),
  email: null,
  phone: null,
  subscriptionTier: null,
  blocked: false,
  blockedAt: null,
  blockedReason: null,
  createdAt,
});

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
  prismaMock.user.findMany.mockResolvedValue([userRow('u-newest'), userRow('u-older')]);
  prismaMock.user.count.mockResolvedValue(2);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
});

// ─── the schema declaration that makes the predicate legal ──────────────────

describe('SCAL-04 — the relation the role predicate needs is declared', () => {
  it('the comment stripper and the block extractor are actually doing something', () => {
    // A guard that scans source text and matches nothing passes green over code
    // it never read. Both halves of the extraction are proved before use.
    expect(USER_BLOCK_RAW).toMatch(/\/\//);
    expect(USER_BLOCK).not.toMatch(/\/\//);
    expect(URA_BLOCK_RAW).toMatch(/^model UserRoleAssignment \{/);
    expect(URA_BLOCK).not.toMatch(/model User \{/);
    expect(USER_BLOCK).not.toMatch(/model UserRoleAssignment/);
  });

  it('UserRoleAssignment.user points at User.id on the mapped column', () => {
    expect(URA_BLOCK).toMatch(
      /\buser\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\]/,
    );
    // The scalar the relation is built on must still be the mapped uuid column,
    // or the generated SQL joins on something the database does not have.
    expect(URA_BLOCK).toMatch(/\buserId\s+String\s+@map\("user_id"\)\s+@db\.Uuid/);
  });

  it('User carries the back-reference, at the TOP LEVEL of its own model', () => {
    // Prisma requires both sides. Without this list field the `some` filter is
    // still `Unknown argument 'roleAssignments'`.
    expect(USER_BLOCK).toMatch(/\broleAssignments\s+UserRoleAssignment\[\]/);
  });

  it('the delete rule can never block a delete that succeeds today', () => {
    // Cascade, not the Prisma default of Restrict for a required relation.
    // Nothing in apps/api/src deletes a User today, but if that ever changes,
    // Restrict would turn a working delete into a foreign-key error the moment
    // the constraint lands — a behaviour change smuggled in by a scale fix.
    expect(URA_BLOCK).toMatch(/onDelete:\s*Cascade/);
  });
});

// ─── the migration that carries it, and cannot fail on live data ────────────

describe('SCAL-04 — the foreign-key migration is un-failable by construction', () => {
  const dirs = readdirSync(join(PRISMA_DIR, 'migrations'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const dir = dirs.find((d) => /scal04_user_role_assignment_fk$/.test(d));

  it('the migration exists', () => {
    expect(dir, 'no *_scal04_user_role_assignment_fk migration').toBeTruthy();
  });

  const sqlRaw = dir
    ? readFileSync(join(PRISMA_DIR, 'migrations', dir, 'migration.sql'), 'utf8')
    : '';
  /** SQL line comments stripped: this file explains every rule below in prose. */
  const sql = sqlRaw.replace(/--[^\n]*/g, ' ');

  it('the SQL comment stripper is actually doing something', () => {
    expect(sqlRaw).toMatch(/--/);
    expect(sql).not.toMatch(/--/);
  });

  it('names the constraint exactly as Prisma would, so migrate dev reports no drift', () => {
    expect(sql).toMatch(/"user_role_assignments_user_id_fkey"/);
  });

  it('adds the constraint NOT VALID — it reads no existing row, so no data can abort it', () => {
    const add = sql.match(/ADD\s+CONSTRAINT[\s\S]*?;/i)?.[0] ?? '';
    expect(add, 'no ADD CONSTRAINT statement found').toMatch(/FOREIGN\s+KEY/i);
    expect(add).toMatch(/NOT\s+VALID/i);
    expect(add).toMatch(/ON\s+DELETE\s+CASCADE/i);
  });

  it('is a no-op when the constraint already exists — the table predates tracked history', () => {
    expect(sql).toMatch(/pg_constraint/i);
  });

  it('cannot abort the boot migration even in an unforeseen case', () => {
    // Two independent guards, the same doctrine as the DI-06 money migration:
    // the existence check handles the predictable case, the handler handles the
    // rest. A skipped constraint is announced, never silent.
    expect(sql).toMatch(/EXCEPTION\s+WHEN\s+OTHERS\s+THEN/i);
    expect((sql.match(/RAISE\s+WARNING/gi) ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('additive only, and never CONCURRENTLY', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/i);
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)\b/i);
    expect(sql).not.toMatch(/\bALTER\s+COLUMN\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+"?user_role_assignments"?\b/i);
  });
});

// ─── the read itself ────────────────────────────────────────────────────────

describe('SCAL-04 — the role page is one bounded relation query', () => {
  it('sends no raw SQL at all', async () => {
    await service.getUsers({ role: 'PANDIT' });
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('never reads the assignment table by role — the whole-user-base scan is gone', async () => {
    await service.getUsers({ role: 'PANDIT' });
    const roleScans = prismaMock.userRoleAssignment.findMany.mock.calls.filter(
      (c: unknown[]) => (c[0] as { where?: { role?: unknown } })?.where?.role !== undefined,
    );
    expect(roleScans).toHaveLength(0);
    // The only read of that table left is the page-bounded roles hydration.
    for (const call of prismaMock.userRoleAssignment.findMany.mock.calls) {
      const where = (call[0] as { where?: Record<string, { in?: unknown }> })?.where ?? {};
      expect(Object.keys(where)).toEqual(['userId']);
      expect(where.userId!.in).toBeInstanceOf(Array);
    }
  });

  it('constrains the page with the relation predicate, bounded and offset', async () => {
    await service.getUsers({ role: 'PANDIT', page: 3, limit: 25 });

    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    const page = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(page.where.roleAssignments).toEqual(ROLE_PREDICATE('PANDIT').roleAssignments);
    expect(page.take).toBe(25);
    expect(page.skip).toBe(50);
    expect(page.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('counts with the IDENTICAL predicate — page and total cannot disagree', async () => {
    await service.getUsers({ role: 'PANDIT', search: 'priya', status: 'blocked' });

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    const countWhere = prismaMock.user.count.mock.calls[0]![0]!.where;
    // SCAL-09's defect is a page filtered one way and a total counted another.
    expect(countWhere).toEqual(listWhere);
    expect(listWhere.roleAssignments).toEqual(ROLE_PREDICATE('PANDIT').roleAssignments);
    expect(listWhere.blocked).toBe(true);
  });

  it('keeps the same three search columns and the same case rules', async () => {
    await service.getUsers({ role: 'PANDIT', search: 'priya' });

    const where = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    // fullName + email were `mode: 'insensitive'`; phone never was. The role
    // predicate must not have quietly changed the search semantics.
    expect(where.OR).toEqual([
      { fullName: { contains: 'priya', mode: 'insensitive' } },
      { email: { contains: 'priya', mode: 'insensitive' } },
      { phone: { contains: 'priya' } },
    ]);
    expect(where.roleAssignments).toEqual(ROLE_PREDICATE('PANDIT').roleAssignments);
  });

  it('reports the total from count(), not from the page length', async () => {
    prismaMock.user.count.mockResolvedValue(4173);
    prismaMock.user.findMany.mockResolvedValue([userRow('u-1')]);

    const out = await service.getUsers({ role: 'PANDIT', limit: 20 });

    expect(out.total).toBe(4173);
    expect(out.users).toHaveLength(1);
  });

  it('preserves the newest-first order the query asked for', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      userRow('u-newest', new Date('2026-08-01')),
      userRow('u-older', new Date('2026-01-01')),
    ]);
    const out = await service.getUsers({ role: 'PANDIT' });
    expect(out.users.map((u: { id: string }) => u.id)).toEqual(['u-newest', 'u-older']);
  });

  it('an unknown role never reaches Postgres at all', async () => {
    const out = await service.getUsers({ role: 'NOT_A_ROLE' });

    expect(out).toEqual({ users: [], total: 0, page: 1, limit: 20 });
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    expect(prismaMock.user.count).not.toHaveBeenCalled();
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it('leaves the no-role page exactly as it was', async () => {
    await service.getUsers({ search: 'priya' });
    const where = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    expect(where.roleAssignments).toBeUndefined();
    expect(where.OR).toHaveLength(3);
  });
});
