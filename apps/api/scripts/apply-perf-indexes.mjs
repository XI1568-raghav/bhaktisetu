/**
 * TD8 performance indexes — applied OUT OF BAND, because they cannot be applied
 * by `prisma migrate deploy`.
 *
 * Background. `prisma/migrations/20260503_perf_indexes/migration.sql` contains
 * ten `CREATE INDEX CONCURRENTLY IF NOT EXISTS` statements. Its header claims
 * "prisma migrate deploy executes each statement separately, which is fine".
 * That is false. `migrate deploy` wraps each migration in a transaction, and
 * PostgreSQL refuses CONCURRENTLY inside a transaction block with SQLSTATE
 * 25001 — measured 2026-09-02 on PostgreSQL 17.10, including the case where the
 * index ALREADY EXISTS: the transaction-block check runs before `IF NOT EXISTS`
 * is ever considered, so the statement cannot be made into a no-op by
 * pre-creating the index. A migration containing it can only be *not executed*.
 *
 * Production's `_prisma_migrations` row for that migration has `finished_at`
 * set with `applied_steps_count = 0` — it was marked applied by hand with
 * `prisma migrate resolve --applied` and never ran.
 *
 * That USED to be written up here as "so these ten indexes were most likely
 * never created". Measured 2026-09-02 against production: false. All ten exist
 * and are `indisvalid` — someone created them out of band. `applied_steps_count
 * = 0` says the migration did not RUN, and nothing about whether its objects
 * are there. `--check` is what answers that, for whichever database you point
 * it at; it is read-only and safe to run against production. The same holds for
 * the other five migrations recorded that way — see
 * scripts/verify-migration-objects.mjs, which checks any of them object by
 * object.
 *
 * The SQL is not copied into this script. It is READ OUT OF the migration file,
 * so there is exactly one copy and it cannot drift. The migration file is left
 * byte-for-byte untouched on purpose: Prisma checksums migrations by SHA-256
 * over the raw file bytes, and this one is already recorded as applied in
 * production.
 *
 * Usage (from apps/api):
 *   node scripts/apply-perf-indexes.mjs --check
 *   node scripts/apply-perf-indexes.mjs --check --env-file .env.production
 *   node scripts/apply-perf-indexes.mjs --yes
 *   node scripts/apply-perf-indexes.mjs --yes --no-concurrently   # empty DB only
 *
 * Each statement is sent on its own via `$executeRawUnsafe`, which runs in
 * autocommit — no enclosing transaction, so CONCURRENTLY is legal.
 *
 * Exit codes: 0 = every index present (or created). 1 = at least one missing,
 * invalid, or failed. 2 = usage error. Usable as a gate, not just a report.
 */
import { PrismaClient } from '@prisma/client';
import {
  PERF_INDEX_MIGRATION,
  readMigration,
  concurrentIndexStatements,
  describeIndexStatement,
} from './lib/migration-inventory.mjs';
import { resolveDbTargetOrExit } from './lib/resolve-db-target.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

const checkOnly = has('--check');
const concurrent = !has('--no-concurrently');

if (!checkOnly && !has('--yes')) {
  console.error(
    'Refusing to modify a database without --yes.\n' +
      'Run with --check first; it is read-only and reports what is missing.',
  );
  process.exit(2);
}

// DIRECT_URL, not the pooled URL: pgbouncer in transaction mode breaks
// schema-level work, and CONCURRENTLY in particular needs a real session.
//
// OPS-14 (F456). Resolved from the env file the operator NAMED, never from
// process.env — the hoisted `@prisma/client` import above has already loaded
// apps/api/.env (production) by this line, and a named file that happens not to
// define DIRECT_URL used to let that production value win silently. This script
// CREATES INDEXES, so that silent substitution was a production write.
const { url } = resolveDbTargetOrExit({ argv: args });

const migration = readMigration(PERF_INDEX_MIGRATION);
const statements = concurrentIndexStatements(migration.sql);
if (statements.length === 0) {
  console.error(
    `${PERF_INDEX_MIGRATION}/migration.sql contains no CONCURRENTLY statements.\n` +
      'If that migration was intentionally rewritten, this script and the tests\n' +
      'that reference it need updating together.',
  );
  process.exit(2);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

/** Index state from the catalog: absent, valid, or present-but-INVALID. */
async function indexState(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT c.relname::text AS name, i.indisvalid AS valid, i.indisready AS ready
       FROM pg_class c
       JOIN pg_index i ON i.indexrelid = c.oid
      WHERE c.relname = $1`,
    name,
  );
  if (rows.length === 0) return { present: false };
  return { present: true, valid: rows[0].valid === true, ready: rows[0].ready === true };
}

console.log(`Migration : ${migration.name}`);
console.log(`Checksum  : ${migration.checksum} (sha256 of raw file bytes, as Prisma computes it)`);
console.log(`Statements: ${statements.length}`);
console.log(`Mode      : ${checkOnly ? 'CHECK (read-only)' : concurrent ? 'APPLY CONCURRENTLY' : 'APPLY (non-concurrent)'}`);
console.log('');

/**
 * Compare this file against the migration ledger row. Read-only, and the whole
 * point of running this against production: it answers "does the database still
 * agree with the file on disk", and "was this migration ever actually executed".
 */
async function reportLedgerRow() {
  let rows;
  try {
    rows = await prisma.$queryRawUnsafe(
      `SELECT checksum, finished_at, rolled_back_at, applied_steps_count
         FROM "_prisma_migrations" WHERE migration_name = $1`,
      migration.name,
    );
  } catch (e) {
    console.log(`ledger    : could not read _prisma_migrations (${errShort(e)})`);
    console.log('');
    return;
  }
  if (rows.length === 0) {
    console.log(`ledger    : NO ROW — this database has never recorded ${migration.name}.`);
    console.log('            On an empty database use scripts/bootstrap-fresh-db.mjs instead.');
    console.log('');
    return;
  }
  const row = rows[0];
  const steps = Number(row.applied_steps_count ?? 0);
  const match = row.checksum === migration.checksum;
  console.log(`ledger    : checksum ${match ? 'MATCHES the file' : 'DIFFERS from the file'}`);
  if (!match) {
    console.log(`            stored ${row.checksum}`);
    console.log('            A mismatch is not currently fatal — Prisma 6.19.3 does not re-verify');
    console.log('            checksums of applied migrations — but it means the file changed since');
    console.log('            it was recorded. See docs/runbooks/fresh-database-bootstrap.md.');
  }
  console.log(
    `            applied_steps_count = ${steps}` +
      (steps === 0
        ? ' → RECORDED BUT NEVER EXECUTED (marked applied by hand),'
        : ' → executed by migrate deploy,') +
      ` rolled_back_at = ${row.rolled_back_at ?? 'null'}`,
  );
  if (steps === 0) {
    console.log('            so the indexes below were never created by the migration itself.');
  }
  console.log('');
}

function errShort(e) {
  return `${e?.code ? `${e.code} ` : ''}${String(e?.message ?? '').split('\n').slice(-1)[0]}`.trim();
}

await reportLedgerRow();

let missing = 0;
let created = 0;
let failed = 0;
let invalid = 0;

for (const stmt of statements) {
  const { index, table } = describeIndexStatement(stmt);
  const label = `${index}`.padEnd(50);
  const before = await indexState(index);

  if (before.present && before.valid) {
    console.log(`  ok      ${label} present`);
    continue;
  }
  if (before.present && !before.valid) {
    // A CONCURRENTLY build that failed part-way leaves an INVALID index behind.
    // It is not used by the planner and will not be repaired by IF NOT EXISTS —
    // that clause sees the name as taken and does nothing. It must be dropped.
    invalid++;
    console.log(
      `  INVALID ${label} present but indisvalid=false — a previous CONCURRENTLY build failed.\n` +
        `          Fix: DROP INDEX CONCURRENTLY IF EXISTS "${index}"; then re-run this script.`,
    );
    continue;
  }

  if (checkOnly) {
    missing++;
    console.log(`  MISSING ${label} on ${table}`);
    continue;
  }

  const sql = concurrent ? stmt : stmt.replace(/\bCONCURRENTLY\b/i, '');
  try {
    // One statement per call. $executeRawUnsafe runs in autocommit, so there is
    // no enclosing transaction and CONCURRENTLY is legal here.
    await prisma.$executeRawUnsafe(sql);
    created++;
    console.log(`  created ${label} on ${table}`);
  } catch (e) {
    failed++;
    console.log(`  FAILED  ${label} ${e.code ? `[${e.code}] ` : ''}${String(e.message).split('\n')[0]}`);
  }
}

await prisma.$disconnect();

console.log('');
if (checkOnly) {
  console.log(`present: ${statements.length - missing - invalid}, missing: ${missing}, invalid: ${invalid}`);
} else {
  console.log(`created: ${created}, failed: ${failed}, invalid: ${invalid}`);
}
process.exit(missing + failed + invalid > 0 ? 1 : 0);
