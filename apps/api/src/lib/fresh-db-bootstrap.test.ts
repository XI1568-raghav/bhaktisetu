import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  MIGRATIONS_DIR,
  PERF_INDEX_MIGRATION,
  listMigrations,
  readMigration,
  concurrentIndexStatements,
  describeIndexStatement,
  migrationsUsingConcurrently,
  stripSqlComments,
} from '../../scripts/lib/migration-inventory.mjs';

/**
 * Can this repository build its database FROM SCRATCH?
 *
 * Until 2026-09-02 the answer was no, and not for the reason everyone assumed.
 * The known hazard was `20260503_perf_indexes`, whose ten
 * `CREATE INDEX CONCURRENTLY` statements cannot run inside the transaction that
 * `prisma migrate deploy` wraps each migration in (SQLSTATE 25001). The actual
 * first failure is twelve migrations earlier. Measured on PostgreSQL 17.10 with
 * pgvector installed, against an empty database:
 *
 *     Applying migration `20260426_pgvector`
 *     Error: P3018   Database error code: 42P01
 *     ERROR: relation "content_items" does not exist
 *
 * There is no `0_init`; the core tables came from an original `prisma db push`.
 * So the fix is a baseline (`prisma/baseline/0_init.sql`) plus a bootstrap
 * script, and `20260503_perf_indexes` is never EXECUTED on that path — only
 * recorded, which is exactly what was done by hand on production.
 *
 * These tests guard the parts of that arrangement a reader cannot see by
 * looking at any single file.
 */

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(here, '..', '..');
const baselinePath = join(apiRoot, 'prisma', 'baseline', '0_init.sql');
const bootstrapPath = join(apiRoot, 'scripts', 'bootstrap-fresh-db.mjs');
const schemaPath = join(apiRoot, 'prisma', 'schema.prisma');

const baseline = () => readFileSync(baselinePath, 'utf8');
const bootstrap = () => readFileSync(bootstrapPath, 'utf8');
const schema = () => readFileSync(schemaPath, 'utf8');

/** The error codes the bootstrap treats as "the baseline already did this". */
function alreadyExistsCodes(): string[] {
  const src = bootstrap();
  const start = src.indexOf('const ALREADY_EXISTS = new Map([');
  expect(start, 'bootstrap-fresh-db.mjs no longer declares ALREADY_EXISTS').toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf('\n]);', start));
  return [...block.matchAll(/\['([0-9A-Z]{5})'/g)].map((m) => m[1]!);
}

describe('the baseline covers the datamodel', () => {
  it('exists', () => {
    expect(existsSync(baselinePath), `missing ${baselinePath} — see prisma/baseline/README.md`).toBe(
      true,
    );
  });

  it('creates a table for every model in schema.prisma', () => {
    // The drift that matters: a model is added, nobody regenerates the
    // baseline, and a fresh database silently comes up a table short. This
    // caught `account_deletion_requests` on 2026-09-02, added the same morning.
    const mapped = [...schema().matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]!);
    const tables = [...baseline().matchAll(/^CREATE TABLE "([^"]+)"/gm)].map((m) => m[1]!);
    const missing = mapped.filter((t) => !tables.includes(t));
    expect(
      missing,
      'schema.prisma has models the baseline does not create. Regenerate it:\n' +
        '  pnpm --filter @poojly/api exec prisma migrate diff --from-empty ' +
        '--to-schema-datamodel prisma/schema.prisma --script > prisma/baseline/0_init.sql',
    ).toEqual([]);
  });

  it('is a bare schema render, not a migration (it must never be applied twice)', () => {
    // If this ever gained IF NOT EXISTS guards someone would be tempted to move
    // it into prisma/migrations/, where `migrate deploy` would run it against
    // production and every CREATE would collide.
    expect(baseline()).not.toContain('CREATE TABLE IF NOT EXISTS');
    expect(existsSync(join(MIGRATIONS_DIR, '0_init'))).toBe(false);
  });
});

describe('the bootstrap replays everything, and that is safe', () => {
  /**
   * The baseline is NOT a complete description of this database, and a curated
   * "replay these few" list cannot be kept correct. Measured 2026-09-02, the
   * datamodel render omits three whole tables that `schema.prisma` never got,
   * every partial index, every opclass index, the money-key UNIQUE indexes, and
   * assorted plain indexes added in SQL and never back-ported. So the bootstrap
   * replays ALL migrations and lets "already exists" errors pass.
   */
  it('replays every migration except the CONCURRENTLY one', () => {
    const src = bootstrap();
    expect(src, 'the replay must be derived, never a hand-listed subset').toContain(
      'for (const mig of listMigrations())',
    );
    expect(src, 'the CONCURRENTLY migration must be skipped — replaying it raises 25001').toContain(
      `mig.name === PERF_INDEX_MIGRATION`,
    );
    expect(src).not.toContain('POST_BASELINE_REPLAY');
  });

  it('tolerates only "already exists" errors, never anything that could hide a real failure', () => {
    const codes = alreadyExistsCodes();
    expect(codes.length).toBeGreaterThan(0);

    // Every tolerated code must be a duplicate-object class (42Pxx / 427xx
    // "already there"), never a code that means the statement genuinely failed.
    const forbidden = [
      '42P01', // undefined_table — the object is NOT there
      '42703', // undefined_column
      '42601', // syntax_error
      '25001', // CONCURRENTLY in a transaction
      '42704', // undefined_object (a missing extension/access method)
      '23505', // unique_violation — real duplicate DATA
      '23503', // foreign_key_violation
    ];
    for (const bad of forbidden) {
      expect(
        codes,
        `${bad} must never be treated as benign — it means the statement really failed`,
      ).not.toContain(bad);
    }
  });

  /**
   * The invariant that makes replaying everything safe. If a future migration
   * drops a table or deletes rows, the bootstrap would run it against a
   * freshly-baselined database and destroy what the baseline just built.
   */
  it('no migration is destructive, so replaying them onto the baseline cannot lose data', () => {
    const offenders: Record<string, string[]> = {};
    for (const mig of listMigrations()) {
      const bare = stripSqlComments(mig.sql);
      const hits = [
        ...bare.matchAll(/\b(DROP\s+TABLE|DROP\s+COLUMN|DROP\s+SCHEMA|DELETE\s+FROM|TRUNCATE)\b/gi),
      ].map((m) => m[1]!.replace(/\s+/g, ' ').toUpperCase());
      if (hits.length > 0) offenders[mig.name] = [...new Set(hits)];
    }
    expect(
      offenders,
      'A destructive statement in a migration breaks the bootstrap: it replays every\n' +
        'migration onto a freshly-applied baseline, so a DROP/DELETE would remove what the\n' +
        'baseline just created. If this migration is genuinely required, teach\n' +
        'scripts/bootstrap-fresh-db.mjs to skip it the way it skips the CONCURRENTLY one.',
    ).toEqual({});
  });

  it('records every migration, so migrate deploy has nothing pending afterwards', () => {
    // Not a count assertion — counts rot. The bootstrap must derive the list.
    expect(bootstrap()).toContain('listMigrations()');
    expect(bootstrap()).toContain('_prisma_migrations');
  });

  it('verifies that every table any migration creates actually exists', () => {
    // Without this the three tables missing from schema.prisma would be absent
    // from a bootstrapped database and nothing would say so.
    expect(bootstrap()).toContain('CREATE\\s+TABLE');
    expect(bootstrap()).toContain('table missing:');
  });
});

describe('20260503_perf_indexes stays frozen, and stays covered', () => {
  const perf = () => readMigration(PERF_INDEX_MIGRATION);

  /**
   * Content freeze, hashed on LF-normalised bytes so it is stable on both
   * Windows (CRLF working copies) and Linux CI.
   *
   * Prisma's OWN checksum is sha256 of the RAW bytes — measured 2026-09-02
   * against Prisma 6.19.3 by applying a CRLF migration and reading back
   * `_prisma_migrations.checksum`. That makes the real checksum line-ending
   * sensitive, which is why this test deliberately does NOT pin it: a CI
   * checkout with different line endings would fail for no good reason. See
   * docs/runbooks/fresh-database-bootstrap.md for both values.
   */
  const FROZEN_LF_SHA256 = '6ccc35b2c53219568e2401314860217e26267ebea734d3384dfd510ea028bbc0';

  it('is byte-frozen', () => {
    const lf = Buffer.from(perf().sql.replace(/\r\n/g, '\n'), 'utf8');
    expect(
      createHash('sha256').update(lf).digest('hex'),
      `${PERF_INDEX_MIGRATION}/migration.sql changed.\n` +
        'It is recorded as applied in production, with a checksum computed from its bytes.\n' +
        'Measured on Prisma 6.19.3, neither `migrate deploy` nor `migrate status` re-verifies\n' +
        'that checksum, so this is not the immediate outage it was long believed to be — but\n' +
        'the API start command is `prisma migrate deploy && node dist/server.js`, so if a future\n' +
        'Prisma starts enforcing, a mismatch here is a crash-loop rather than a failed command.\n' +
        'Nothing executes this file any more (the bootstrap records it instead), so changing it\n' +
        'buys nothing. If the change is deliberate, read\n' +
        'docs/runbooks/fresh-database-bootstrap.md first, then update this hash.',
    ).toBe(FROZEN_LF_SHA256);
  });

  it('still holds exactly the ten indexes the ops script will create', () => {
    const names = concurrentIndexStatements(perf().sql).map((s) => describeIndexStatement(s).index);
    expect(names).toEqual([
      'puja_bookings_user_id_status_created_at_idx',
      'puja_bookings_temple_id_scheduled_date_status_idx',
      'leads_role_status_last_contacted_at_idx',
      'outreach_logs_lead_id_channel_sent_at_idx',
      'daily_panchang_date_location_city_perf_idx',
      'temples_city_state_status_perf_idx',
      'puja_types_is_active_category_idx',
      'content_items_type_status_idx',
      'donations_gaushala_id_status_created_at_idx',
      'service_ratings_provider_id_created_at_perf_idx',
    ]);
  });

  it('is covered by an ops script and a bootstrap that reads it, never a second copy of the SQL', () => {
    // The original bug was a claim about this file that no second copy ever
    // corrected. Guard against anyone pasting the ten statements somewhere.
    const ops = readFileSync(join(apiRoot, 'scripts', 'apply-perf-indexes.mjs'), 'utf8');
    expect(ops).toContain('concurrentIndexStatements');
    expect(bootstrap()).toContain('concurrentIndexStatements');
    for (const src of [ops, bootstrap()]) {
      expect(src, 'the CONCURRENTLY SQL must be read from the migration, not copied').not.toMatch(
        /CREATE\s+INDEX\s+CONCURRENTLY\s+IF\s+NOT\s+EXISTS\s+"/i,
      );
    }
  });

  it('is the only migration using CONCURRENTLY, and the bootstrap skips it', () => {
    expect(migrationsUsingConcurrently()).toEqual([PERF_INDEX_MIGRATION]);
    // Replaying it would raise 25001 on every statement, so the bootstrap must
    // skip it by name and leave those ten indexes to the ops script.
    expect(bootstrap()).toContain('mig.name === PERF_INDEX_MIGRATION');
    expect(bootstrap()).toContain('applied out of band');
  });
});
