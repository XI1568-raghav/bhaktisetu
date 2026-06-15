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
// Mix formula: NRI MRR / (India MRR + NRI MRR) × 100
// NRI heuristic: bookings paid in USD (Stripe) OR billing_country != 'IN'
//
// KPI source-of-truth: posthog (per roadmap item kpi.source).
// This script provides a DB-side check independent of PostHog for cross-validation.
// Both must agree before the milestone is announced.

import { writeReport, upsertLog, TODAY } from '../_lib.mjs';

const DB_URL = process.env.SUPABASE_DIRECT_URL || process.env.DATABASE_URL_READONLY || process.env.DATABASE_URL || '';
const THRESHOLD_APPROACH = 35;
const THRESHOLD_MILESTONE = 40;
const THRESHOLD_EXCEEDED = 45;

// Pure calc — deterministic, unit-testable. No DB, no network.
export function calculateMix({ indiaRevenue, nriRevenue }) {
  const total = (indiaRevenue || 0) + (nriRevenue || 0);
  if (total <= 0) return { mixPct: 0, total: 0, classification: 'no-data' };
  const mixPct = (nriRevenue / total) * 100;
  let classification = 'below-target';
  if (mixPct >= THRESHOLD_EXCEEDED) classification = 'exceeded';
  else if (mixPct >= THRESHOLD_MILESTONE) classification = 'milestone-reached';
  else if (mixPct >= THRESHOLD_APPROACH) classification = 'approaching';
  return {
    mixPct: Math.round(mixPct * 100) / 100,
    total,
    indiaRevenue,
    nriRevenue,
    classification,
  };
}

// SQL templates — SELECT-only. Caller pipes via pg client when DB env present.
// Last 30 days of completed bookings, split by currency proxy.
export const SQL_LAST_30D = `
SELECT
  COALESCE(SUM(CASE WHEN currency = 'INR' THEN amount ELSE 0 END), 0)::bigint AS india_revenue_paise,
  COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount * 83 ELSE 0 END), 0)::bigint AS nri_revenue_paise
FROM "Booking"
WHERE status = 'COMPLETED'
  AND "createdAt" >= NOW() - INTERVAL '30 days';
`.trim();

export const SQL_LAST_7D = `
SELECT
  COALESCE(SUM(CASE WHEN currency = 'INR' THEN amount ELSE 0 END), 0)::bigint AS india_revenue_paise,
  COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount * 83 ELSE 0 END), 0)::bigint AS nri_revenue_paise
FROM "Booking"
WHERE status = 'COMPLETED'
  AND "createdAt" >= NOW() - INTERVAL '7 days';
`.trim();

function noopReport() {
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
    '2. **This script**: SQL aggregation by `currency` column on `Booking` table.',
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

function dbReport({ last30, last7 }) {
  const lines = [
    `# NRI mix tracker — ${TODAY}`,
    '',
    '**Status**: live DB read.',
    '',
    '## Last 30 days',
    '',
    `- Total revenue: ₹${(last30.total / 100).toLocaleString('en-IN')}`,
    `- India revenue: ₹${(last30.indiaRevenue / 100).toLocaleString('en-IN')}`,
    `- NRI revenue: ₹${(last30.nriRevenue / 100).toLocaleString('en-IN')} (USD × 83)`,
    `- **NRI mix: ${last30.mixPct}%** (${last30.classification})`,
    '',
    '## Last 7 days',
    '',
    `- Total revenue: ₹${(last7.total / 100).toLocaleString('en-IN')}`,
    `- India revenue: ₹${(last7.indiaRevenue / 100).toLocaleString('en-IN')}`,
    `- NRI revenue: ₹${(last7.nriRevenue / 100).toLocaleString('en-IN')}`,
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
  // Lazy import pg to avoid dep when noop.
  let pg;
  try {
    pg = await import('pg');
  } catch {
    return null;
  }
  const { Client } = pg.default || pg;
  const client = new Client({ connectionString: DB_URL, statement_timeout: 5000 });
  try {
    await client.connect();
    const r30 = await client.query(SQL_LAST_30D);
    const r7 = await client.query(SQL_LAST_7D);
    const last30 = calculateMix({
      indiaRevenue: Number(r30.rows[0].india_revenue_paise),
      nriRevenue: Number(r30.rows[0].nri_revenue_paise),
    });
    const last7 = calculateMix({
      indiaRevenue: Number(r7.rows[0].india_revenue_paise),
      nriRevenue: Number(r7.rows[0].nri_revenue_paise),
    });
    return { last30, last7 };
  } finally {
    try { await client.end(); } catch {}
  }
}

async function main() {
  let body;
  if (!DB_URL) {
    body = noopReport();
  } else {
    const data = await runDb().catch((e) => {
      console.error('[nri-mix-tracker] DB error:', e.message);
      return null;
    });
    body = data ? dbReport(data) : noopReport();
  }
  writeReport('nri-mix', body);
  upsertLog('nri-mix-tracker', `ran — ${DB_URL ? 'db' : 'noop'}`);
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('nri-mix-tracker.mjs')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
