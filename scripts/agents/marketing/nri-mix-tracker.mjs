#!/usr/bin/env node
// NRI mix tracker — R-Q4-M-013b engineering scaffold
// Deterministic daily/weekly NRI revenue mix calculator + threshold alerter.
// Outputs: docs/agent-reports/YYYY-MM-DD-nri-mix.md
// Env-or-noop: requires SUPABASE_DIRECT_URL (or DATABASE_URL_READONLY). Without DB,
// emits a no-op report with founder-action notes. Zero free-tier impact when noop.
//
// Thresholds (per docs/marketing/40pct-nri-milestone-spec.md):
//   - 35% → "approaching" alert
//   - 40% → milestone reached
//   - 45% → "exceeded" alert
//
// Mix formula: NRI revenue / (India revenue + NRI revenue) × 100
// NRI predicate: the devotee is flagged NRI on the user row — users.is_nri = true
// OR users.nri_country IS NOT NULL. It used to be a currency proxy
// ("paid in USD via Stripe"), which cannot match anything: Stripe is removed and
// INR is the only currency, so nri_revenue was structurally 0 and the mix read
// 0.00% / below-target forever — a genuinely NRI-heavy month would never have
// fired the milestone workflow. The USD half also carried a hardcoded ×83 FX
// constant (the RV-01 class); with both halves in INR no FX constant is needed.
//
// KPI source-of-truth: posthog (per roadmap item kpi.source).
// This script provides a DB-side check independent of PostHog for cross-validation.
// Both must agree before the milestone is announced.

import { writeReport, upsertLog, TODAY } from '../_lib.mjs';

const DB_URL = process.env.SUPABASE_DIRECT_URL || process.env.DATABASE_URL_READONLY || process.env.DATABASE_URL || '';
const THRESHOLD_APPROACH = 35;
const THRESHOLD_MILESTONE = 40;
const THRESHOLD_EXCEEDED = 45;

// Booking statuses that represent revenue actually earned. BookingStatus is a
// lowercase Postgres enum (schema.prisma) — 'COMPLETED' matches no row.
const EARNED_STATUSES = ['completed', 'video_uploaded', 'delivered'];

// Pure calc — deterministic, unit-testable. No DB, no network.
// Inputs carry their unit in the identifier: puja_bookings.price_amount is
// Decimal(10,2) in RUPEES, not paise. The old signature said `indiaRevenue` and
// the SQL aliased `_paise`, so the report divided by 100 and turned a real
// ₹12,50,000 month into "₹12,500".
export function calculateMix({ indiaRevenueInr, nriRevenueInr }) {
  const india = indiaRevenueInr || 0;
  const nri = nriRevenueInr || 0;
  const totalInr = india + nri;
  if (totalInr <= 0) return { mixPct: 0, totalInr: 0, indiaRevenueInr: india, nriRevenueInr: nri, classification: 'no-data' };
  const mixPct = (nri / totalInr) * 100;
  let classification = 'below-target';
  if (mixPct >= THRESHOLD_EXCEEDED) classification = 'exceeded';
  else if (mixPct >= THRESHOLD_MILESTONE) classification = 'milestone-reached';
  else if (mixPct >= THRESHOLD_APPROACH) classification = 'approaching';
  return {
    mixPct: Math.round(mixPct * 100) / 100,
    totalInr,
    indiaRevenueInr: india,
    nriRevenueInr: nri,
    classification,
  };
}

// SQL template — SELECT-only. Caller pipes via pg client when DB env present.
// Built from one function so the 7d and 30d windows cannot drift apart; the
// previous pair were hand-copied and BOTH carried the same four schema errors
// (table "Booking", status 'COMPLETED', column amount, column "createdAt").
// Real names: puja_bookings / users, price_amount, created_at, user_id.
//
// The two CASE arms are exact complements — is_nri is NOT NULL with default
// false — so every earned booking lands in exactly one half, never both,
// never neither. Sums stay ::numeric: ::bigint truncated the paise off every
// Decimal(10,2) row.
export function buildMixSql(days) {
  const window = Number(days);
  if (!Number.isInteger(window) || window <= 0) {
    throw new Error(`buildMixSql: days must be a positive integer, got ${days}`);
  }
  const statusList = EARNED_STATUSES.map((s) => `'${s}'`).join(', ');
  return `
SELECT
  COALESCE(SUM(CASE WHEN u.is_nri = false AND u.nri_country IS NULL THEN b.price_amount ELSE 0 END), 0)::numeric AS india_revenue_inr,
  COALESCE(SUM(CASE WHEN u.is_nri = true OR u.nri_country IS NOT NULL THEN b.price_amount ELSE 0 END), 0)::numeric AS nri_revenue_inr
FROM puja_bookings b
JOIN users u ON u.id = b.user_id
WHERE b.status IN (${statusList})
  AND b.created_at >= NOW() - INTERVAL '${window} days';
`.trim();
}

export const SQL_LAST_30D = buildMixSql(30);
export const SQL_LAST_7D = buildMixSql(7);

function fmtInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

// Exported so the test suite can assert on the rendered artefact — the 100x
// paise/rupee understatement lived in the report body, not in the maths.
export function noopReport() {
  return [
    `# NRI mix tracker — ${TODAY}`,
    '',
    '**Status**: NOOP — `SUPABASE_DIRECT_URL` not set in env.',
    '',
    '## How to enable',
    '',
    '```',
    'export SUPABASE_DIRECT_URL=postgresql://...',
    'node scripts/agents/marketing/nri-mix-tracker.mjs',
    '```',
    '',
    '## Cross-validation pair (per spec)',
    '',
    '1. **PostHog**: geo-segmentation event `booking_completed` filtered by `country != "IN"`.',
    '2. **This script**: SQL aggregation over `puja_bookings` joined to `users`, split by `users.is_nri` / `users.nri_country`.',
    '',
    'Both numbers must agree (±2pp) before the 40% milestone is announced externally.',
    '',
    '## Founder action required',
    '',
    '- 40% NRI mix KPI cannot be engineered — it requires real NRI bookings.',
    '- Engineering scaffold ships: tracker + alerter + investor-update copy template.',
    '- Drive levers (per docs/marketing/40pct-nri-milestone-spec.md):',
    '  - NRI WhatsApp groups (US/UK/CA/AU/SG temple WhatsApp chains)',
    '  - NRI radio + community newspaper buys (CAC must stay < $40)',
    '  - Diaspora referral programme (R-Q4-M-004 series)',
    '',
    '## Thresholds',
    '',
    `- ${THRESHOLD_APPROACH}% → approaching (intensify NRI acquisition)`,
    `- ${THRESHOLD_MILESTONE}% → MILESTONE — trigger announcement workflow`,
    `- ${THRESHOLD_EXCEEDED}% → exceeded (verify sustainability before Series A pitch)`,
    '',
    '## Closes',
    '',
    'R-Q4-M-013 engineering scaffold — KPI gated on founder-driven NRI growth.',
    '',
  ].join('\n');
}

// Third report shape. Without it a query failure fell back to noopReport(),
// whose first line claims `SUPABASE_DIRECT_URL` is not set — so the committed
// artefact stated the opposite of what happened, the console.error never
// reached docs/agent-reports/, and the agent log still recorded 'ran — db'.
// The failure was undetectable from the outputs. Keep noopReport strictly for
// the DB_URL-absent case.
export function errorReport(err) {
  return [
    `# NRI mix tracker — ${TODAY}`,
    '',
    '**Status**: ERROR — DB configured but the query failed. **This report contains no numbers.**',
    '',
    `- Error: \`${err?.message || String(err)}\``,
    '',
    '## What this means',
    '',
    'A database URL IS set in env (`SUPABASE_DIRECT_URL` / `DATABASE_URL_READONLY` / `DATABASE_URL`),',
    'so this is not a configuration no-op — the connection or the SQL itself failed. The NRI mix is',
    'UNKNOWN for this run; do not read the previous run as current.',
    '',
    '## Where to look',
    '',
    '- Connectivity / credentials on the DB URL in use.',
    '- Schema drift: the query reads `puja_bookings` (b.price_amount, b.status, b.created_at, b.user_id)',
    '  joined to `users` (u.is_nri, u.nri_country). A table or column rename breaks it — see the',
    '  SQL smoke test in `nri-mix-tracker.test.mjs`.',
    '',
    '## Query attempted (30d window)',
    '',
    '```sql',
    SQL_LAST_30D,
    '```',
    '',
  ].join('\n');
}

export function dbReport({ last30, last7 }) {
  const lines = [
    `# NRI mix tracker — ${TODAY}`,
    '',
    '**Status**: live DB read.',
    '',
    '## Last 30 days',
    '',
    `- Total revenue: ${fmtInr(last30.totalInr)}`,
    `- India revenue: ${fmtInr(last30.indiaRevenueInr)}`,
    `- NRI revenue: ${fmtInr(last30.nriRevenueInr)}`,
    `- **NRI mix: ${last30.mixPct}%** (${last30.classification})`,
    '',
    '## Last 7 days',
    '',
    `- Total revenue: ${fmtInr(last7.totalInr)}`,
    `- India revenue: ${fmtInr(last7.indiaRevenueInr)}`,
    `- NRI revenue: ${fmtInr(last7.nriRevenueInr)}`,
    `- **NRI mix: ${last7.mixPct}%** (${last7.classification})`,
    '',
    '## Classification meaning',
    '',
    `| Range | Action |`,
    `|---|---|`,
    `| < ${THRESHOLD_APPROACH}% | Continue NRI acquisition push |`,
    `| ${THRESHOLD_APPROACH}-${THRESHOLD_MILESTONE}% | Approaching — investor pre-brief |`,
    `| ${THRESHOLD_MILESTONE}-${THRESHOLD_EXCEEDED}% | MILESTONE — announcement workflow |`,
    `| > ${THRESHOLD_EXCEEDED}% | Sustained — Series A pitch update |`,
    '',
    '## Founder action',
    '',
    last30.classification === 'milestone-reached' || last30.classification === 'exceeded'
      ? '- Cross-validate against PostHog `booking_completed` country segmentation.'
      : '- Continue NRI acquisition. See docs/marketing/40pct-nri-milestone-spec.md.',
    '',
  ];
  return lines.join('\n');
}

async function runDb() {
  // Lazy import pg to avoid dep when noop. A missing driver with a DB URL set
  // is a failure, not a no-op — throw so main() reports it honestly.
  let pg;
  try {
    pg = await import('pg');
  } catch (e) {
    throw new Error(`the 'pg' driver could not be loaded: ${e.message}`);
  }
  const { Client } = pg.default || pg;
  const client = new Client({ connectionString: DB_URL, statement_timeout: 5000 });
  try {
    await client.connect();
    const r30 = await client.query(SQL_LAST_30D);
    const r7 = await client.query(SQL_LAST_7D);
    // pg returns numeric as a string to preserve precision. The summation
    // itself happened in Postgres numeric (exact); Number() here feeds a ratio
    // and a display string only — no money is settled off these values.
    const last30 = calculateMix({
      indiaRevenueInr: Number(r30.rows[0].india_revenue_inr),
      nriRevenueInr: Number(r30.rows[0].nri_revenue_inr),
    });
    const last7 = calculateMix({
      indiaRevenueInr: Number(r7.rows[0].india_revenue_inr),
      nriRevenueInr: Number(r7.rows[0].nri_revenue_inr),
    });
    return { last30, last7 };
  } finally {
    try { await client.end(); } catch {}
  }
}

async function main() {
  let body;
  let logLine;
  if (!DB_URL) {
    body = noopReport();
    logLine = 'ran — noop';
  } else {
    try {
      body = dbReport(await runDb());
      logLine = 'ran — db';
    } catch (e) {
      console.error('[nri-mix-tracker] DB error:', e.message);
      body = errorReport(e);
      logLine = 'ran — db-error';
    }
  }
  writeReport('nri-mix', body);
  upsertLog('nri-mix-tracker', logLine);
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('nri-mix-tracker.mjs')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
