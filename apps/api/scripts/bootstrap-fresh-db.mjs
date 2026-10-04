/**
 * Build this database FROM SCRATCH — a new environment, CI, or a
 * disaster-recovery restore onto an empty Postgres.
 *
 * WHY THIS EXISTS, AND WHY `prisma migrate deploy` CANNOT DO IT
 *
 * `prisma/migrations/` has no `0_init`. Its first migration, `20260426_pgvector`,
 * opens with `alter table content_items add column ...` — against a table that
 * nothing in the migration history ever creates. The core tables were created
 * by an original `prisma db push` and were never captured as a migration.
 *
 * Measured 2026-09-02 on PostgreSQL 17.10 with pgvector present, pointing
 * `prisma migrate deploy` at an empty database:
 *
 *     Applying migration `20260426_pgvector`
 *     Error: P3018   Database error code: 42P01
 *     ERROR: relation "content_items" does not exist
 *
 * So a fresh database fails on migration #1. The CONCURRENTLY problem in
 * `20260503_perf_indexes` is the SECOND barrier, twelve migrations later, and
 * fixing it alone would not have produced a working fresh database.
 *
 * THE SHAPE OF THE FIX
 *
 * Baseline first, then replay. We create the schema from
 * `prisma/baseline/0_init.sql` (generated from schema.prisma), then replay every
 * migration except the CONCURRENTLY one — letting "already exists" errors pass —
 * and finally record every migration as applied. `migrate deploy` afterwards has
 * nothing pending, and every FUTURE migration applies normally.
 *
 * The replay is not belt-and-braces: the baseline is genuinely incomplete,
 * because `schema.prisma` is not a full description of this database. It is
 * missing three whole tables, every partial index, every opclass index and the
 * money-key UNIQUE indexes. See the note above POST-BASELINE REPLAY below.
 *
 * This is also what makes `20260503_perf_indexes` harmless: on this path it is
 * never EXECUTED, only recorded — exactly what was done by hand on production.
 * Its ten indexes are created out of band by `scripts/apply-perf-indexes.mjs`,
 * which reads them out of the migration file itself.
 *
 * Usage (from apps/api):
 *   node scripts/bootstrap-fresh-db.mjs --yes
 *   node scripts/bootstrap-fresh-db.mjs --yes --allow-remote --env-file .env.staging
 *   node scripts/bootstrap-fresh-db.mjs --verify-only
 *
 * Refuses to touch a database that is not empty, so it can never be pointed at
 * production by accident: production is not empty. Exit 0 = bootstrapped and
 * verified, 1 = verification found something missing, 2 = usage/safety refusal.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  API_ROOT,
  PERF_INDEX_MIGRATION,
  listMigrations,
  readMigration,
  concurrentIndexStatements,
  describeIndexStatement,
  splitStatements,
} from './lib/migration-inventory.mjs';
import { resolveDbTargetOrExit } from './lib/resolve-db-target.mjs';

/**
 * Prisma's `$executeRawUnsafe` goes through the extended query protocol, which
 * carries exactly ONE statement. Handing it a whole .sql file fails with P2010
 * and an empty message, so everything here is split first.
 */
function errText(e) {
  const meta = e?.meta ? ` ${JSON.stringify(e.meta)}` : '';
  const msg = String(e?.message ?? '').split('\n').filter(Boolean).slice(-1)[0] ?? '';
  return `${e?.code ? `[${e.code}] ` : ''}${msg}${meta}`.trim();
}

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

const verifyOnly = has('--verify-only');
const allowRemote = has('--allow-remote');

if (!verifyOnly && !has('--yes')) {
  console.error('Refusing to write without --yes. Use --verify-only to inspect a database.');
  process.exit(2);
}

// OPS-14 (F456). Resolved from the env file the operator NAMED, never from
// process.env — the hoisted `@prisma/client` import has already loaded
// apps/api/.env (production) by this line. The host guard below used to be the
// only thing standing between `--env-file .env.local` and production, and
// `--verify-only` walks straight past it.
const { url, host, local } = resolveDbTargetOrExit({ argv: args });

if (!local && !allowRemote && !verifyOnly) {
  console.error(
    `Target host is ${host}, which is not local.\n` +
      'Provisioning a remote environment is legitimate, but say so explicitly: --allow-remote.',
  );
  process.exit(2);
}

const BASELINE = join(API_ROOT, 'prisma', 'baseline', '0_init.sql');

/**
 * Extensions the schema itself depends on. `vector` is REQUIRED — three tables
 * have `Unsupported("vector(1024)")` columns and the baseline cannot be applied
 * without the type. `pg_trgm` is optional: migration 20260824010000 already
 * treats it as optional and warns rather than failing, so we match that.
 */
const EXTENSIONS = [
  { name: 'vector', required: true },
  { name: 'pg_trgm', required: false },
];

/**
 * After the baseline, EVERY migration is replayed except the CONCURRENTLY one.
 *
 * The obvious cheaper design — a hand-picked list of "the migrations that create
 * things the datamodel cannot express" — was tried first and is wrong, because
 * that list cannot be kept correct. Audited 2026-09-02, the baseline is missing:
 *
 *   - three whole TABLES that `schema.prisma` never got at all
 *     (`DonationExportAuditLog`, `WeeklyDigestOptOut`, `WeeklyDigestRun`);
 *   - partial indexes (`users_blocked_idx`, and four in the account-deletion
 *     migration) — Prisma has no datamodel syntax for a `WHERE` clause;
 *   - opclass indexes (ivfflat, gin/trgm);
 *   - the money-key UNIQUE indexes, none of which are `@@unique`;
 *   - assorted plain indexes that were added in SQL and never back-ported
 *     (`orgs_owner_user_id_idx`, `donations_temple_id_idx`, …).
 *
 * Three separate migrations landed in this repo on the day this script was
 * written. A curated list would have been stale before it was committed.
 *
 * Replaying everything is safe here because the baseline has already created
 * most of these objects, so the expected outcome of a replayed statement is
 * "already exists" — and because no migration in this tree is destructive: the
 * only DROPs are `DROP INDEX`, `DROP NOT NULL` and one `DROP TRIGGER`, and every
 * backfill `UPDATE` matches zero rows on an empty database.
 */

/**
 * Error codes that mean "the baseline already made this", and nothing else.
 * Deliberately narrow: anything outside this set is a real failure and stops
 * the bootstrap. `IF NOT EXISTS` guards mean most statements never raise at all.
 */
const ALREADY_EXISTS = new Map([
  ['42P07', 'duplicate_table'],
  ['42701', 'duplicate_column'],
  ['42710', 'duplicate_object'],
  ['42P06', 'duplicate_schema'],
  ['42723', 'duplicate_function'],
  ['42P16', 'invalid_table_definition (duplicate primary key)'],
]);

/**
 * Migrations whose replay failures are reported as warnings rather than
 * stopping the bootstrap. Each entry needs a reason that says why the failure
 * is harmless ON A FRESH DATABASE specifically. This is not a dumping ground:
 * anything not listed here is fatal.
 */
const TOLERATED_FAILURES = new Map([
  ['20260426_pgvector', 'ivfflat embedding indexes need real pgvector; the extension and the vector columns themselves are already in place'],
  ['20260824010000_scal09_user_search_trgm', 'gin trgm indexes need pg_trgm, which the migration itself already treats as optional'],
]);

const prisma = new PrismaClient({ datasources: { db: { url } } });
const warnings = [];
const failures = [];

const q = (sql, ...p) => prisma.$queryRawUnsafe(sql, ...p);

async function tableExists(name) {
  // Quote the identifier: three tables in this schema are CamelCase
  // (`DonationExportAuditLog`, `WeeklyDigestOptOut`, `WeeklyDigestRun`) and an
  // unquoted to_regclass folds to lower case, reporting them absent.
  const r = await q(`SELECT to_regclass($1)::text AS t`, `public."${name}"`);
  return r[0].t !== null;
}

async function indexValid(name) {
  const r = await q(
    `SELECT i.indisvalid AS valid FROM pg_class c JOIN pg_index i ON i.indexrelid=c.oid WHERE c.relname=$1`,
    name,
  );
  return r.length > 0 && r[0].valid === true;
}

console.log(`Target host : ${host}`);
console.log(`Baseline    : ${BASELINE}`);
console.log('');

// ── Safety: the database must be empty ──────────────────────────────────────
const existing = await q(
  `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`,
);
const tableCount = existing[0].n;

if (!verifyOnly) {
  if (tableCount > 0) {
    console.error(
      `Refusing: "public" already has ${tableCount} table(s). This script bootstraps an EMPTY\n` +
        'database. That refusal is also the reason it can never hit production by accident.\n' +
        'To inspect instead, re-run with --verify-only.',
    );
    await prisma.$disconnect();
    process.exit(2);
  }

  // ── 1. Extensions (before the baseline: it declares vector(1024) columns) ──
  console.log('1. extensions');
  for (const ext of EXTENSIONS) {
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "${ext.name}"`);
      console.log(`   ok      ${ext.name}`);
    } catch (e) {
      const msg = `${ext.name} unavailable: ${String(e.message).split('\n')[0]}`;
      if (ext.required) {
        console.error(`   FATAL   ${msg}`);
        console.error('   The baseline declares vector(1024) columns and cannot be applied without it.');
        await prisma.$disconnect();
        process.exit(1);
      }
      warnings.push(msg);
      console.log(`   WARN    ${msg}`);
    }
  }

  // ── 2. Baseline ───────────────────────────────────────────────────────────
  console.log('2. baseline schema');
  if (!existsSync(BASELINE)) {
    console.error(`   FATAL   missing ${BASELINE}`);
    console.error('   Regenerate: see prisma/baseline/README.md');
    await prisma.$disconnect();
    process.exit(1);
  }
  const baselineStatements = splitStatements(readFileSync(BASELINE, 'utf8'));
  try {
    // One transaction: a half-applied baseline is worse than none, and the
    // caller can simply drop and retry.
    await prisma.$transaction(baselineStatements.map((s) => prisma.$executeRawUnsafe(s)));
    console.log(`   ok      applied (${baselineStatements.length} statements)`);
  } catch (e) {
    console.error(`   FATAL   ${errText(e)}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── 3. Replay every migration except the CONCURRENTLY one ─────────────────
  console.log('3. replay migrations (everything the baseline could not express)');
  let benignTotal = 0;
  for (const mig of listMigrations()) {
    if (mig.name === PERF_INDEX_MIGRATION) {
      // Replaying it would raise 25001 for every statement. Step 4 owns it.
      console.log(`   skip    ${mig.name} (CONCURRENTLY — applied out of band in step 4)`);
      continue;
    }
    const errs = [];
    let benign = 0;
    for (const stmt of splitStatements(mig.sql)) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (e) {
        if (ALREADY_EXISTS.has(e?.meta?.code)) benign++;
        else errs.push(errText(e));
      }
    }
    benignTotal += benign;
    const suffix = benign > 0 ? ` (${benign} already present)` : '';
    if (errs.length === 0) {
      console.log(`   ok      ${mig.name}${suffix}`);
      continue;
    }
    const line = `${mig.name}: ${errs[0]}${errs.length > 1 ? ` (+${errs.length - 1} more)` : ''}`;
    const why = TOLERATED_FAILURES.get(mig.name);
    if (why) {
      warnings.push(`${line} — ${why}`);
      console.log(`   WARN    ${line}`);
    } else {
      failures.push(line);
      console.log(`   FAILED  ${line}`);
    }
  }
  console.log(`   ${benignTotal} statement(s) were already satisfied by the baseline`);

  // ── 4. The TD8 perf indexes, out of band ──────────────────────────────────
  console.log(`4. ${PERF_INDEX_MIGRATION} indexes (out of band — CONCURRENTLY cannot run in a tx)`);
  const perf = readMigration(PERF_INDEX_MIGRATION);
  for (const stmt of concurrentIndexStatements(perf.sql)) {
    const { index } = describeIndexStatement(stmt);
    try {
      // Autocommit: $executeRawUnsafe opens no transaction, so CONCURRENTLY is legal.
      await prisma.$executeRawUnsafe(stmt);
      console.log(`   ok      ${index}`);
    } catch (e) {
      failures.push(`${index}: ${errText(e)}`);
      console.log(`   FAILED  ${index} ${errText(e)}`);
    }
  }

  // ── 5. Record every migration as applied ──────────────────────────────────
  // This is `prisma migrate resolve --applied` for all 40, done in one pass.
  // applied_steps_count = 0 marks "recorded, not executed", which is precisely
  // what a baseline is — and is the same shape production's own
  // 20260503_perf_indexes row already has.
  console.log('5. record migrations as applied (baseline)');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum"            VARCHAR(64) NOT NULL,
      "finished_at"         TIMESTAMPTZ,
      "migration_name"      VARCHAR(255) NOT NULL,
      "logs"                TEXT,
      "rolled_back_at"      TIMESTAMPTZ,
      "started_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`);
  const all = listMigrations();
  for (const m of all) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, now(), $3, $4, NULL, now(), 0)
       ON CONFLICT (id) DO NOTHING`,
      randomUUID(),
      m.checksum,
      m.name,
      'baselined by scripts/bootstrap-fresh-db.mjs',
    );
  }
  console.log(`   ok      ${all.length} migrations recorded`);
  console.log('');
}

// ── Verification ────────────────────────────────────────────────────────────
console.log('verification');

const schemaTables = (
  await q(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`)
)[0].n;
console.log(`   tables in public: ${schemaTables}`);

// Every table any migration creates must exist — including the three that
// schema.prisma never got (DonationExportAuditLog, WeeklyDigestOptOut,
// WeeklyDigestRun), which the baseline alone would silently omit.
const wantTables = new Set();
for (const mig of listMigrations()) {
  for (const m of splitStatements(mig.sql).join(';\n').matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi,
  )) {
    wantTables.add(m[1]);
  }
}
const missingTables = [];
for (const t of wantTables) {
  if (!(await tableExists(t))) missingTables.push(t);
}
console.log(
  `   ${missingTables.length === 0 ? 'ok     ' : 'MISSING'} all ${wantTables.size} tables created by migrations exist`,
);
for (const t of missingTables) failures.push(`table missing: ${t}`);

const MONEY_KEYS = [
  'commissions_booking_id_key',
  'commissions_store_order_id_key',
  'commissions_wellness_enrollment_id_key',
  'temple_payouts_booking_id_key',
  'priest_payouts_booking_id_key',
];
for (const k of MONEY_KEYS) {
  const ok = await indexValid(k);
  console.log(`   ${ok ? 'ok     ' : 'MISSING'} money key ${k}`);
  if (!ok) failures.push(`money key index missing: ${k}`);
}

const trig = await q(
  `SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'money_audit_events_no_mutate' AND NOT tgisinternal`,
);
const fn = await q(`SELECT count(*)::int AS n FROM pg_proc WHERE proname = 'money_audit_events_append_only'`);
const appendOnly = trig[0].n > 0 && fn[0].n > 0;
console.log(`   ${appendOnly ? 'ok     ' : 'MISSING'} money_audit_events append-only trigger + function`);
if (!appendOnly) failures.push('money_audit_events append-only trigger/function missing');

const perfMig = readMigration(PERF_INDEX_MIGRATION);
for (const stmt of concurrentIndexStatements(perfMig.sql)) {
  const { index } = describeIndexStatement(stmt);
  const ok = await indexValid(index);
  console.log(`   ${ok ? 'ok     ' : 'MISSING'} perf index ${index}`);
  if (!ok) failures.push(`perf index missing: ${index}`);
}

const recorded = await q(`SELECT count(*)::int AS n FROM "_prisma_migrations"`).catch(() => [{ n: 0 }]);
const expected = listMigrations().length;
console.log(`   migrations recorded: ${recorded[0].n}/${expected}`);
if (recorded[0].n !== expected) failures.push(`_prisma_migrations has ${recorded[0].n}, expected ${expected}`);

await prisma.$disconnect();

console.log('');
for (const w of warnings) console.log(`WARN    ${w}`);
for (const f of failures) console.log(`MISSING ${f}`);
if (failures.length === 0) {
  console.log(
    warnings.length
      ? `\nBootstrapped and verified, with ${warnings.length} tolerated warning(s) above.\n` +
          'Every warning is a named, explained case — read them before treating this as clean.'
      : '\nBootstrapped and fully verified.',
  );
  console.log('Next: `prisma migrate deploy` should report "No pending migrations to apply."');
}
process.exit(failures.length > 0 ? 1 : 0);
