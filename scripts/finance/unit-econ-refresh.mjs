#!/usr/bin/env node
/**
 * Unit Economics Refresh — CAC + LTV + Payback per channel.
 *
 * Roadmap item: R-Q2-F-002 (P1)
 * Spec: docs/finance/unit-econ-refresh-channel-spec.md
 * Data: docs/finance/unit-econ-channel-data.json
 *
 * Env-or-noop pattern (per CLAUDE.md):
 * - POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID present => fetch real cohort attribution
 * - Otherwise => print baseline JSON + flag as "stale" so dashboard knows to show advisory
 *
 * Usage:
 *   node scripts/finance/unit-econ-refresh.mjs           # dry-run, prints projections
 *   node scripts/finance/unit-econ-refresh.mjs --write   # also writes refreshed snapshot
 *
 * KPI: unit_econ_dashboard_live (count 0->1) — promotes when first real PostHog refresh lands.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DATA_PATH = resolve(REPO_ROOT, 'docs/finance/unit-econ-channel-data.json');
const SNAPSHOT_DIR = resolve(REPO_ROOT, 'docs/agent-reports/unit-econ');

const FLAGS = new Set(process.argv.slice(2));
const WRITE = FLAGS.has('--write');

function loadBaseline() {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8'));
}

function computeBlended(channels, side /* 'domestic' | 'nri' */) {
  const totalAcquired = channels.reduce(
    (sum, ch) => sum + (ch[side]?.monthly_acquired_target ?? 0),
    0
  );
  if (totalAcquired === 0) return null;

  const cacKey = side === 'domestic' ? 'cac_inr' : 'cac_usd';
  const ltvKey = side === 'domestic' ? 'ltv_inr' : 'ltv_usd';

  const weightedCac = channels.reduce(
    (sum, ch) =>
      sum + (ch[side]?.[cacKey] ?? 0) * (ch[side]?.monthly_acquired_target ?? 0),
    0
  );
  const weightedLtv = channels.reduce(
    (sum, ch) =>
      sum + (ch[side]?.[ltvKey] ?? 0) * (ch[side]?.monthly_acquired_target ?? 0),
    0
  );

  const blendedCac = weightedCac / totalAcquired;
  const blendedLtv = weightedLtv / totalAcquired;
  const paybackMonths =
    blendedLtv > 0 ? Math.max(1, Math.round((blendedCac / blendedLtv) * 12)) : Infinity;

  return {
    [cacKey]: Math.round(blendedCac * 100) / 100,
    [ltvKey]: Math.round(blendedLtv * 100) / 100,
    payback_months: paybackMonths,
    monthly_acquired_target: totalAcquired,
    _method: 'weighted_by_monthly_acquired_target',
  };
}

async function fetchPostHogCohort() {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!key || !projectId) {
    return { available: false, reason: 'missing-env' };
  }
  // Real implementation: query PostHog cohorts API per channel attribution.
  // Returns per-channel { acquired_30d, paid_30d, revenue_30d, refunds_30d } map.
  // For now return advisory so caller flags snapshot as stale.
  return {
    available: false,
    reason: 'posthog-cohort-query-not-implemented',
  };
}

function checkTripwires(blended, tripwires) {
  const breaches = [];
  if (
    blended.nri &&
    typeof blended.nri.cac_usd === 'number' &&
    blended.nri.cac_usd > tripwires.blended_nri_cac_usd_max
  ) {
    breaches.push({
      tripwire: 'blended_nri_cac_usd_max',
      threshold: tripwires.blended_nri_cac_usd_max,
      observed: blended.nri.cac_usd,
    });
  }
  if (
    blended.domestic &&
    typeof blended.domestic.payback_months === 'number' &&
    blended.domestic.payback_months > tripwires.blended_domestic_payback_months_max
  ) {
    breaches.push({
      tripwire: 'blended_domestic_payback_months_max',
      threshold: tripwires.blended_domestic_payback_months_max,
      observed: blended.domestic.payback_months,
    });
  }
  return breaches;
}

async function main() {
  const baseline = loadBaseline();
  const posthog = await fetchPostHogCohort();

  const computed = {
    as_of: new Date().toISOString().slice(0, 10),
    source: posthog.available ? 'posthog' : `baseline (${posthog.reason})`,
    stale: !posthog.available,
    blended: {
      domestic: computeBlended(baseline.channels, 'domestic'),
      nri: computeBlended(baseline.channels, 'nri'),
    },
  };

  computed.tripwire_breaches = checkTripwires(
    computed.blended,
    baseline.tripwires
  );

  console.log(JSON.stringify(computed, null, 2));

  if (WRITE) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const ts = computed.as_of;
    const file = resolve(SNAPSHOT_DIR, `${ts}-unit-econ-refresh.json`);
    writeFileSync(file, JSON.stringify(computed, null, 2));
    console.error(`wrote ${file}`);
  }

  if (computed.tripwire_breaches.length > 0) {
    console.error(
      `WARN: ${computed.tripwire_breaches.length} tripwire breach(es). Review channel mix.`
    );
    process.exit(2);
  }

  if (computed.stale) {
    console.error(
      'INFO: snapshot is baseline projection (PostHog not wired). KPI unit_econ_dashboard_live remains 0.'
    );
    process.exit(0);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('unit-econ-refresh failed:', err);
  process.exit(1);
});
