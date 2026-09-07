/**
 * Does the database actually contain what a migration says it creates?
 *
 * Six of production's recorded migrations carry `applied_steps_count = 0` —
 * `prisma migrate resolve --applied`, never executed by `migrate deploy`. A
 * zero there does NOT by itself mean the objects are missing: someone may have
 * applied the DDL by hand and then resolved the row, which is exactly what
 * happened to `20260709020000_store_order_store_profile` (column, index and FK
 * all present). It also does not mean they are present. Only the catalog knows.
 *
 * This answers that, read-only, for any migration you name. Every statement it
 * issues is a SELECT against information_schema / pg_class / pg_constraint;
 * there is no write path in this file and no --yes flag to add one.
 *
 * The expected objects are PARSED OUT OF the migration SQL, never hand-listed,
 * so this cannot drift from the file the way a copied checklist would.
 *
 * Usage (from apps/api):
 *   node scripts/verify-migration-objects.mjs 20260511_user_blocked
 *   node scripts/verify-migration-objects.mjs --all-resolved --env-file .env.production
 *   node scripts/verify-migration-objects.mjs --unexecuted --env-file .env.production
 *
 *   --unexecuted     every migration whose ledger row has applied_steps_count = 0
 *   --all-resolved   alias of --unexecuted
 *   --env-file PATH  load DIRECT_URL/DATABASE_URL from a dotenv file
 *
 * Exit codes: 0 = every object present. 1 = at least one missing or invalid.
 * 2 = usage error. Usable as a gate, not just a report.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'prisma/migrations';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

const envIdx = args.indexOf('--env-file');
if (envIdx !== -1) {
  const path = args[envIdx + 1];
  if (!path) {
    console.error('--env-file needs a path');
    process.exit(2);
  }
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const wantUnexecuted = has('--unexecuted') || has('--all-resolved');
const named = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--env-file');

if (!wantUnexecuted && named.length === 0) {
  console.error(
    'Name at least one migration, or pass --unexecuted to check every\n' +
      'migration recorded with applied_steps_count = 0.',
  );
  process.exit(2);
}

// DIRECT_URL, not the pooled URL: catalog reads are fine either way, but the
// pooler rewrites search_path in transaction mode and this should see exactly
// what `migrate deploy` would.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('No DIRECT_URL or DATABASE_URL in the environment.');
  process.exit(2);
}

/**
 * Objects a migration's SQL declares. Deliberately conservative: it recognises
 * the shapes Prisma emits and the hand-written ones in this repo, and reports
 * anything it could not classify rather than silently checking less than the
 * file says.
 */
function parseObjects(sql) {
  const objects = [];
  const add = (kind, name, detail) => objects.push({ kind, name, detail });

  // Strip line comments so `-- CreateTable: cows` is not mistaken for DDL.
  const clean = sql
    .split(/\r?\n/)
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');

  for (const raw of clean.split(';')) {
    const stmt = raw.trim();
    if (!stmt) continue;

    const createTable = stmt.match(/^CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/i);
    if (createTable) {
      add('table', createTable[1]);
      for (const c of stmt.matchAll(/CONSTRAINT\s+"([^"]+)"/gi)) add('constraint', c[1]);
      continue;
    }

    const alterTable = stmt.match(/^ALTER TABLE\s+(?:ONLY\s+)?"([^"]+)"/i);
    if (alterTable) {
      const table = alterTable[1];
      for (const c of stmt.matchAll(/ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/gi)) {
        add('column', `${table}.${c[1]}`);
      }
      for (const c of stmt.matchAll(/ADD CONSTRAINT\s+"([^"]+)"/gi)) add('constraint', c[1]);
      continue;
    }

    const createIndex = stmt.match(
      /^CREATE\s+(UNIQUE\s+)?INDEX(?:\s+CONCURRENTLY)?(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/i,
    );
    if (createIndex) {
      add('index', createIndex[2], createIndex[1] ? 'unique' : undefined);
      continue;
    }

    if (/^CREATE\s+(OR REPLACE\s+)?(FUNCTION|TRIGGER|EXTENSION|TYPE|VIEW)/i.test(stmt)) {
      const m = stmt.match(/^CREATE\s+(?:OR REPLACE\s+)?(\w+)\s+(?:IF NOT EXISTS\s+)?"?([\w.]+)"?/i);
      add('unchecked', m ? `${m[1].toLowerCase()} ${m[2]}` : stmt.slice(0, 60));
      continue;
    }

    // UPDATE/INSERT backfills, DROP, ALTER COLUMN, COMMENT — nothing to verify
    // structurally, but say so rather than pretending the migration was empty.
    add('unchecked', stmt.split(/\s+/).slice(0, 3).join(' '));
  }
  return objects;
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const q = (sql, ...p) => prisma.$queryRawUnsafe(sql, ...p);

async function checkTable(name) {
  const r = await q(`SELECT to_regclass($1)::text AS t`, `public."${name}"`);
  return r[0].t !== null ? { ok: true } : { ok: false, why: 'no such table' };
}

async function checkColumn(qualified) {
  const [table, column] = qualified.split('.');
  const r = await q(
    `SELECT data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    table,
    column,
  );
  if (r.length === 0) return { ok: false, why: 'no such column' };
  return { ok: true, note: `${r[0].data_type}${r[0].is_nullable === 'NO' ? ' not null' : ''}` };
}

async function checkIndex(name) {
  const r = await q(
    `SELECT i.indisvalid AS valid, i.indisunique AS uniq, pg_get_expr(i.indpred, i.indrelid) AS pred
       FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
      WHERE c.relname = $1`,
    name,
  );
  if (r.length === 0) return { ok: false, why: 'no such index' };
  if (r[0].valid !== true) return { ok: false, why: 'INVALID (failed build left it behind)' };
  const bits = [];
  if (r[0].uniq) bits.push('unique');
  if (r[0].pred) bits.push(`partial ${r[0].pred}`);
  return { ok: true, note: bits.join(', ') };
}

async function checkConstraint(name) {
  const r = await q(`SELECT contype::text AS t FROM pg_constraint WHERE conname = $1`, name);
  if (r.length === 0) return { ok: false, why: 'no such constraint' };
  const kind = { p: 'primary key', f: 'foreign key', u: 'unique', c: 'check' }[r[0].t] ?? r[0].t;
  return { ok: true, note: kind };
}

const CHECKERS = {
  table: checkTable,
  column: checkColumn,
  index: checkIndex,
  constraint: checkConstraint,
};

/** Ledger row for a migration, or null when it has never been recorded. */
async function ledger(name) {
  try {
    const r = await q(
      `SELECT applied_steps_count, finished_at, rolled_back_at
         FROM "_prisma_migrations" WHERE migration_name = $1`,
      name,
    );
    return r[0] ?? null;
  } catch {
    return null;
  }
}

let targets = named;
if (wantUnexecuted) {
  const rows = await q(
    `SELECT migration_name FROM "_prisma_migrations"
      WHERE applied_steps_count = 0 ORDER BY migration_name`,
  );
  targets = [...new Set([...named, ...rows.map((r) => r.migration_name)])];
}

const available = new Set(readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name));

console.log(`host      : ${new URL(url).host}`);
console.log(`migrations: ${targets.length}`);
console.log('');

let missingTotal = 0;
let checkedTotal = 0;
const summary = [];

for (const name of targets) {
  if (!available.has(name)) {
    console.log(`${name}\n   SKIP — no such directory under ${MIGRATIONS_DIR}\n`);
    summary.push({ name, verdict: 'no migration file' });
    continue;
  }
  const sql = readFileSync(join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
  const objects = parseObjects(sql);
  const row = await ledger(name);

  console.log(name);
  console.log(
    `   ledger  ${
      row === null
        ? 'NO ROW'
        : `applied_steps_count = ${Number(row.applied_steps_count ?? 0)}` +
          `, rolled_back_at = ${row.rolled_back_at ?? 'null'}`
    }`,
  );

  let missing = 0;
  let checked = 0;
  for (const obj of objects) {
    if (obj.kind === 'unchecked') {
      console.log(`   ----    ${obj.name} (nothing structural to verify)`);
      continue;
    }
    const res = await CHECKERS[obj.kind](obj.name);
    checked++;
    if (res.ok) {
      console.log(`   ok      ${obj.kind.padEnd(10)} ${obj.name}${res.note ? `  (${res.note})` : ''}`);
    } else {
      missing++;
      console.log(`   MISSING ${obj.kind.padEnd(10)} ${obj.name}  — ${res.why}`);
    }
  }

  missingTotal += missing;
  checkedTotal += checked;
  const verdict = missing === 0 ? `all ${checked} objects present` : `${missing}/${checked} MISSING`;
  console.log(`   => ${verdict}\n`);
  summary.push({ name, verdict });
}

await prisma.$disconnect();

console.log('─'.repeat(72));
for (const s of summary) console.log(`  ${s.name.padEnd(48)} ${s.verdict}`);
console.log('─'.repeat(72));
console.log(
  missingTotal === 0
    ? `every object declared by these migrations exists (${checkedTotal} checked)`
    : `${missingTotal} of ${checkedTotal} objects are missing`,
);
process.exit(missingTotal === 0 ? 0 : 1);
