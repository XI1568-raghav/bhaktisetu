/**
 * DI-06 — the data check that the UNIQUE constraints need before they can be
 * promoted from "created where clean" to "guaranteed".
 *
 * Migration 20260824000000_di0607_money_key_indexes creates four UNIQUE indexes
 * ONLY on databases where the key already holds no duplicates, because
 * migrations auto-apply on API boot and a UNIQUE index over existing duplicates
 * aborts the migration and stops the API from starting. Production has been
 * suspended since 2026-08-17, so at the time that migration was written the
 * duplicate counts were unknowable.
 *
 * This script answers, against whichever database you point it at:
 *   1. did each of the four UNIQUE indexes actually get created?
 *   2. if not, exactly which key values are duplicated, and which rows?
 *
 * It is READ-ONLY. It never deletes, updates or creates anything, including the
 * indexes themselves — de-duplicating a money ledger means deciding which of two
 * payable rows is real, which is a human's call with the amounts in front of
 * them, not a script's.
 *
 * Usage (from apps/api):
 *   node scripts/check-money-key-duplicates.mjs                 # uses DIRECT_URL from env
 *   node scripts/check-money-key-duplicates.mjs --env-file .env.production
 *
 * Exit codes: 0 = all four constraints present. 1 = at least one is missing.
 * That makes it usable as a CI/pre-promotion gate, not just a report.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const envFileIdx = args.indexOf('--env-file');
if (envFileIdx !== -1) {
  const path = args[envFileIdx + 1];
  if (!path) {
    console.error('--env-file needs a path');
    process.exit(2);
  }
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// DIRECT_URL, not the pooled URL: pgbouncer in transaction mode has repeatedly
// broken schema-level queries in this repo (see docs/caveats.md).
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('No DIRECT_URL or DATABASE_URL in the environment.');
  process.exit(2);
}

const prisma = new PrismaClient({ datasourceUrl: url });

/** Mirrors the four blocks in the migration, in the same order. */
const KEYS = [
  {
    table: 'commissions',
    column: 'booking_id',
    index: 'commissions_booking_id_key',
    rule: 'at most one Commission per booking',
    writers: 'payment.service.ts:266, consultation.ts:178, provider-earning-mint.ts:112, booking.service.ts:874',
  },
  {
    table: 'commissions',
    column: 'store_order_id',
    index: 'commissions_store_order_id_key',
    rule: 'at most one Commission per store order',
    writers: 'store-commission.service.ts:27',
  },
  {
    table: 'commissions',
    column: 'wellness_enrollment_id',
    index: 'commissions_wellness_enrollment_id_key',
    rule: 'at most one Commission per wellness enrollment',
    writers: 'wellness-sessions.ts:84',
  },
  {
    table: 'temple_payouts',
    column: 'booking_id',
    index: 'temple_payouts_booking_id_key',
    rule: 'at most one TemplePayout per booking',
    writers: 'temple-payout.service.ts:76',
  },
  // DI-06 (2026-09-02): the FIFTH key. This list said "four" and the summary
  // below printed "All four UNIQUE constraints are present" — a denominator
  // that structurally hid a guard of exactly the same shape. `priest_payouts`
  // is rail B, the LEGACY pandit-only payout rail, and it is the rail that
  // actually moves money on the temple booking path, so a duplicate row there
  // is a duplicate real bank transfer. Created by migration
  // 20260902000000_di06_priest_payout_booking_key.
  {
    table: 'priest_payouts',
    column: 'booking_id',
    index: 'priest_payouts_booking_id_key',
    rule: 'at most one PriestPayout per booking',
    writers: 'payment.service.ts createPriestPayout (findFirst on { bookingId }, then throw)',
  },
  // DI-06 / DI-07 (2026-09-02): keys SIX and SEVEN, on `payments` — the table
  // every rupee enters through, and the one both earlier passes skipped
  // wholesale. The note at the foot of this script explained why the
  // per-booking guard is not expressible; that reasoning was correct and is
  // still there, but it was allowed to stand in for the WHOLE TABLE. These two
  // are not state-scoped: a Razorpay order id and a Razorpay payment id each
  // identify exactly one Payment row, and every rail resolves by them with
  // `findFirst` — which, given a duplicate, picks an arbitrary row. Created by
  // migration 20260904000000_di0607_payment_gateway_key_indexes.
  {
    table: 'payments',
    column: 'gateway_order_id',
    index: 'payments_gateway_order_id_key',
    rule: 'at most one Payment per Razorpay order',
    writers:
      'payment.service.ts:806 + :1157 create; resolved by findFirst at :875, :1239, :1411, :1731 and jobs/reconcile-payments.ts:159',
  },
  {
    table: 'payments',
    column: 'gateway_payment_id',
    index: 'payments_gateway_payment_id_key',
    rule: 'at most one Payment per Razorpay payment id',
    writers:
      'payment.service.ts:974/:1046/:1263 + the capture webhook branches; resolved by findFirst at :1789 (the refund rail that unwinds the provider ledger)',
  },
];

async function indexExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND indexname = $1`,
    name,
  );
  return rows.length > 0 ? rows[0].indexdef : null;
}

async function duplicates({ table, column }) {
  return prisma.$queryRawUnsafe(
    `SELECT "${column}" AS key, count(*)::int AS copies
       FROM "${table}"
      WHERE "${column}" IS NOT NULL
      GROUP BY "${column}"
     HAVING count(*) > 1
      ORDER BY count(*) DESC, "${column}"
      LIMIT 50`,
  );
}

async function offendingRows({ table, column }, key) {
  const amountCol = table === 'commissions' ? 'amount, percentage, status' : 'amount, status';
  return prisma.$queryRawUnsafe(
    `SELECT id, ${amountCol}, created_at
       FROM "${table}"
      WHERE "${column}" = $1
      ORDER BY created_at`,
    key,
  );
}

let missing = 0;

console.log('DI-06 money-key integrity check');
console.log(`database: ${url.replace(/:\/\/[^@]*@/, '://***@')}`);
console.log('');

for (const spec of KEYS) {
  const def = await indexExists(spec.index);
  const dupes = await duplicates(spec);
  const label = `${spec.table}.${spec.column}`;

  if (def && /UNIQUE/i.test(def)) {
    console.log(`  OK       ${label} — UNIQUE index ${spec.index} present (${spec.rule})`);
    // A unique index cannot coexist with duplicates; if this ever prints, the
    // query and the index disagree and that is worth knowing loudly.
    if (dupes.length > 0) {
      console.log(`           !! and yet ${dupes.length} duplicate key(s) reported — investigate immediately`);
    }
    continue;
  }

  missing += 1;
  console.log(`  MISSING  ${label} — no UNIQUE index (${spec.rule})`);
  console.log(`           enforced today only by: ${spec.writers}`);

  if (dupes.length === 0) {
    console.log('           no duplicates present — safe to create right now:');
    console.log(`             CREATE UNIQUE INDEX CONCURRENTLY "${spec.index}" ON "${spec.table}" ("${spec.column}");`);
    console.log('           (CONCURRENTLY is correct HERE — this is a hand-run psql statement,');
    console.log('            outside a transaction. It must NEVER appear in a migration file.)');
  } else {
    const total = dupes.reduce((n, d) => n + (d.copies - 1), 0);
    console.log(`           ${dupes.length} duplicated key value(s), ${total} surplus row(s). Resolve before creating:`);
    for (const d of dupes) {
      console.log(`             ${d.key} -> ${d.copies} rows`);
      for (const r of await offendingRows(spec, d.key)) {
        const amt = r.amount === null || r.amount === undefined ? '?' : String(r.amount);
        console.log(`               id=${r.id} amount=${amt} status=${r.status} created=${new Date(r.created_at).toISOString()}`);
      }
    }
    console.log('           These are MONEY rows. Do not bulk-delete. Decide per key which row is');
    console.log('           the real payable, and check whether it has already been paid out');
    console.log('           (commissions.payout_request_id / temple_payouts.processed_at).');
  }
  console.log('');
}

await prisma.$disconnect();

console.log('');
// One money-table guard is deliberately NOT in KEYS, and saying so here is the
// point: an unexplained omission is how the list came to say "four".
//
// SCOPE CORRECTION (2026-09-02): this note used to be the only mention of
// `payments` anywhere in this script, and it was read — including by the agent
// that wrote it — as excusing the whole table. It does not. It excuses ONE
// guard. The two 1:1 gateway keys on the same table are now KEYS six and seven
// above, and they had no index and no constraint at all until migration
// 20260904000000_di0607_payment_gateway_key_indexes. What follows still holds,
// for the per-booking guard alone:
//
//   payments — createOrder guards "at most one ACTIVE payment per booking"
//   (findFirst on { bookingId, status: { in: ['initiated','authorized'] } },
//   returning the existing Razorpay order rather than opening a second one).
//   That is not "at most one row per key"; it is "at most one row per key IN A
//   SUBSET OF STATES", and a captured payment legitimately coexists with a
//   later one on the same booking. Expressing it needs a PARTIAL unique index,
//   which Prisma cannot declare as `@@unique`, and getting the state list wrong
//   would abort a real capture. Left as an application guard on purpose;
//   revisit only with the state machine in front of you.
console.log('');
if (missing === 0) {
  console.log(`All ${KEYS.length} UNIQUE constraints are present. You can promote them to @@unique`);
  console.log('in schema.prisma — the index names above already follow Prisma\'s convention, so');
  console.log('that is a schema-only edit with no further SQL.');
  process.exit(0);
}
console.log(`${missing} of ${KEYS.length} UNIQUE constraints are absent. Until they exist, the`);
console.log('idempotency guards for those keys are application-level TOCTOU only.');
process.exit(1);
