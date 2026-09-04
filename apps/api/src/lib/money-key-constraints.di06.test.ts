import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * DI-06 — the money-key UNIQUE constraints, and the denominator that hid one.
 *
 * Migration 20260824000000_di0607_money_key_indexes declared four keys and its
 * report script printed "All four UNIQUE constraints are present". Four was
 * wrong: `payment.service.ts` `createPriestPayout` guards "at most one
 * PriestPayout per booking" with the identical findFirst-then-throw shape and
 * had no constraint behind it — and `priest_payouts` is the LEGACY rail that
 * actually moves money to a pandit on the temple booking path, so a duplicate
 * row there is a duplicate real bank transfer.
 *
 * A hand-maintained list in a script and a hand-written .sql file are exactly
 * the pair that drifts, so this test welds them together:
 *
 *   1. every key the checker reports on has a real CREATE UNIQUE INDEX in a
 *      migration (this FAILS on the pre-2026-09-02 tree, where
 *      priest_payouts_booking_id_key exists nowhere);
 *   2. every one of those CREATEs is guarded — a bare unconditional UNIQUE over
 *      a money table aborts `prisma migrate deploy`, which auto-runs on API
 *      boot, so a dirty key would mean the API never starts;
 *   3. no migration anywhere contains CONCURRENTLY. `migrate deploy` wraps each
 *      migration in a transaction and CONCURRENTLY inside one fails with 25001
 *      and then blocks every LATER migration. This repo lost two months to
 *      that, and the only way it comes back is someone pasting the
 *      copy-pasteable psql line the checker itself prints.
 */

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(here, '..', '..');
const migrationsDir = join(apiRoot, 'prisma', 'migrations');
const checkerPath = join(apiRoot, 'scripts', 'check-money-key-duplicates.mjs');

/** Every migration.sql in the repo, as { name, sql }. */
function allMigrations(): { name: string; sql: string }[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, file: join(migrationsDir, e.name, 'migration.sql') }))
    .filter((m) => existsSync(m.file))
    .map((m) => ({ name: m.name, sql: readFileSync(m.file, 'utf8') }));
}

/**
 * The checker's KEYS array, read out of the source rather than imported —
 * importing it would open a database connection at module load.
 */
function checkerKeys(): { table: string; column: string; index: string }[] {
  const source = readFileSync(checkerPath, 'utf8');
  const start = source.indexOf('const KEYS = [');
  expect(start, 'check-money-key-duplicates.mjs no longer declares `const KEYS = [`').toBeGreaterThan(
    -1,
  );
  const end = source.indexOf('\n];', start);
  const block = source.slice(start, end);

  const keys: { table: string; column: string; index: string }[] = [];
  const entry = /table:\s*'([^']+)',\s*\n\s*column:\s*'([^']+)',\s*\n\s*index:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = entry.exec(block)) !== null) {
    keys.push({ table: m[1]!, column: m[2]!, index: m[3]! });
  }
  return keys;
}

describe('DI-06 — every money key the checker reports on is backed by a migration', () => {
  const keys = checkerKeys();
  const migrations = allMigrations();

  it('parses the checker key list and it covers the seven known money guards', () => {
    const labels = keys.map((k) => `${k.table}.${k.column}`).sort();
    expect(labels).toEqual([
      'commissions.booking_id',
      'commissions.store_order_id',
      'commissions.wellness_enrollment_id',
      // The two the WHOLE-TABLE omission hid. The checker's closing note
      // explained why `payments`' per-booking guard is not expressible as a
      // plain UNIQUE (it is state-scoped: a captured payment legitimately
      // coexists with a later one on the same booking) — and that single
      // correct sentence was then read as excusing the entire table. These two
      // are not state-scoped: one Razorpay order id and one Razorpay payment id
      // each identify exactly one Payment row, and every rail resolves by them
      // with `findFirst`, which given a duplicate picks an arbitrary row.
      'payments.gateway_order_id',
      'payments.gateway_payment_id',
      // The one the "four" denominator hid.
      'priest_payouts.booking_id',
      'temple_payouts.booking_id',
    ]);
  });

  it.each(checkerKeys())(
    'creates UNIQUE index $index on $table($column) in a migration',
    ({ table, column, index }) => {
      const owner = migrations.find((mig) => mig.sql.includes(`"${index}"`));
      expect(
        owner,
        `no migration creates ${index}; the checker reports on ${table}.${column} but nothing creates the constraint`,
      ).toBeDefined();

      // The literal statement, not merely the name in a comment.
      expect(owner!.sql).toContain(
        `CREATE UNIQUE INDEX IF NOT EXISTS "${index}" ON "${table}" ("${column}")`,
      );
    },
  );

  it.each(checkerKeys())(
    '$index is created only after its own duplicate pre-check, and skips loudly instead of aborting',
    ({ index }) => {
      const owner = migrations.find((mig) => mig.sql.includes(`"${index}"`))!;
      // A migration that fails on a dirty key stops `prisma migrate deploy`,
      // which runs on API boot — so an unguarded CREATE is an outage, not a
      // failed constraint.
      expect(owner.sql).toContain('EXCEPTION WHEN OTHERS THEN');
      expect(owner.sql).toContain(`UNIQUE index ${index}`);
      expect(owner.sql).toMatch(new RegExp(`RAISE WARNING[^;]*${index}`));
    },
  );
});

/**
 * The one migration that already contains CONCURRENTLY, and stays as it is.
 *
 * `20260503_perf_indexes` opens with "prisma migrate deploy executes each
 * statement separately, which is fine" — which is false, and is the belief that
 * cost this repo two months of blocked migrations. Measured on production
 * 2026-09-02: its `_prisma_migrations` row is `finished_at` set with
 * `applied_steps_count = 0`, i.e. it was marked applied by hand
 * (`prisma migrate resolve --applied`) rather than executed.
 *
 * RESOLVED 2026-09-02 — but not by editing this file, and this entry stays.
 * What changed is that the entry is no longer a bare name on an allowlist: the
 * `is neutralised` test below now requires the mechanism that makes it
 * harmless, so the grandfathering cannot outlive its justification.
 *
 * Three measured facts drove that choice (PostgreSQL 17.10, Prisma 6.19.3):
 *
 *   1. The statement fails with 25001 inside a transaction EVEN WHEN THE INDEX
 *      ALREADY EXISTS — the transaction-block check precedes `IF NOT EXISTS`.
 *      So it cannot be defused by pre-creating the indexes; a migration holding
 *      CONCURRENTLY can only ever be NOT EXECUTED.
 *   2. A database built from scratch never reaches this migration anyway. It
 *      dies on the FIRST migration — `20260426_pgvector` does
 *      `alter table content_items add column` and there is no `0_init` that
 *      creates `content_items` (`P3018` / `42P01`). Editing this file would
 *      have fixed a barrier that nothing gets to.
 *   3. Neither `migrate deploy` NOR `migrate status` re-verifies the checksum of
 *      an already-applied migration. Tested on the production-shaped case — an
 *      applied migration edited to a no-op WITH a genuinely pending migration
 *      behind it: status listed only the pending one, deploy applied it and
 *      exited 0, and the edited migration's stored checksum was never rewritten.
 *      (The earlier version of this comment asserted deploy aborts on drift.
 *      That was wrong, and it is why this file was feared more than it deserved.)
 *      Editing it is therefore not the outage it was believed to be — it is
 *      simply pointless, because the bootstrap means nothing ever executes it,
 *      and it would leave production holding a checksum for content that no
 *      longer exists if a future Prisma starts enforcing.
 *
 * The real fix is `scripts/bootstrap-fresh-db.mjs` + `prisma/baseline/0_init.sql`,
 * which build a fresh database from a baseline and RECORD this migration instead
 * of running it, and `scripts/apply-perf-indexes.mjs`, which creates its ten
 * indexes out of band by reading them out of the migration file itself.
 * See `docs/runbooks/fresh-database-bootstrap.md` and
 * `src/lib/fresh-db-bootstrap.test.ts`.
 */
const GRANDFATHERED_CONCURRENTLY = ['20260503_perf_indexes'];

describe('DI-06 — the CONCURRENTLY footgun stays out of every NEW migration', () => {
  /** Comments stripped: the money-key migrations discuss CONCURRENTLY at length
   *  in their headers, and banning the word outright would delete the
   *  explanation of why it is banned. */
  function concurrentlyOffenders(): string[] {
    return allMigrations()
      .filter((m) => /\bCONCURRENTLY\b/i.test(m.sql.replace(/--[^\n]*/g, '')))
      .map((m) => m.name)
      .sort();
  }

  it('no migration outside the grandfathered one executes CREATE INDEX CONCURRENTLY', () => {
    const nueva = concurrentlyOffenders().filter(
      (n) => !GRANDFATHERED_CONCURRENTLY.includes(n),
    );
    expect(
      nueva,
      'a new migration uses CONCURRENTLY — `prisma migrate deploy` wraps each migration in a transaction, so this fails with 25001 and then blocks every LATER migration. Run the statement by hand in psql instead.',
    ).toEqual([]);
  });

  it('the grandfathered list has not silently grown, and still names a real file', () => {
    // Both directions: the allowlist may not gain entries, and it may not keep
    // stale ones that would mask a genuine new offender under the same name.
    expect(concurrentlyOffenders()).toEqual([...GRANDFATHERED_CONCURRENTLY].sort());
  });

  it('there are migrations to check, so the assertions above are not vacuous', () => {
    expect(allMigrations().length).toBeGreaterThan(30);
  });

  it('the grandfathered migration is neutralised, not merely tolerated', () => {
    // The entry above is allowed to exist ONLY while the machinery that makes
    // it harmless exists. Delete the bootstrap or the ops script and this fails,
    // so the allowlist can never quietly outlive its justification.
    const baseline = join(apiRoot, 'prisma', 'baseline', '0_init.sql');
    const bootstrap = join(apiRoot, 'scripts', 'bootstrap-fresh-db.mjs');
    const opsScript = join(apiRoot, 'scripts', 'apply-perf-indexes.mjs');

    for (const [path, why] of [
      [baseline, 'the baseline a fresh database is built from — without it migrate deploy dies on migration 1'],
      [bootstrap, 'the only supported way to build this database from scratch'],
      [opsScript, 'the out-of-band runner for the ten CONCURRENTLY indexes'],
    ] as const) {
      expect(existsSync(path), `${path} is missing — ${why}`).toBe(true);
    }

    // Both consumers must READ the statements out of the migration rather than
    // hold a second copy. A second copy is what let the original false claim
    // ("migrate deploy executes each statement separately") survive unchallenged.
    for (const path of [bootstrap, opsScript]) {
      const src = readFileSync(path, 'utf8');
      expect(src, `${path} must read the SQL from the migration`).toContain(
        'concurrentIndexStatements',
      );
      expect(src, `${path} must not contain a pasted copy of the CONCURRENTLY SQL`).not.toMatch(
        /CREATE\s+INDEX\s+CONCURRENTLY\s+IF\s+NOT\s+EXISTS\s+"/i,
      );
    }

    // And the bootstrap must RECORD this migration rather than run it.
    const bootstrapSrc = readFileSync(bootstrap, 'utf8');
    expect(bootstrapSrc).toContain('_prisma_migrations');
    const replayBlock = bootstrapSrc.slice(
      bootstrapSrc.indexOf('const POST_BASELINE_REPLAY = ['),
      bootstrapSrc.indexOf('\n];', bootstrapSrc.indexOf('const POST_BASELINE_REPLAY = [')),
    );
    expect(
      replayBlock,
      'the bootstrap must never replay the CONCURRENTLY migration as a migration',
    ).not.toContain(GRANDFATHERED_CONCURRENTLY[0]!);
  });
});
