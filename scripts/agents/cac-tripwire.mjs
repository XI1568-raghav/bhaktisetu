#!/usr/bin/env node
// CAC Tripwire — checks weekly blended paid-install CAC across Meta + Google UAC.
// Fires alert if blended_cac_inr > 40 for 2 consecutive weeks AND date > launch+14d.
// Per ROADMAP.md strategy: tripwire breach → fold to NRI-only SKU.
//
// Env (all optional — script env-or-noops if missing):
//   META_AD_ACCOUNT_ID    — act_xxxxxxxxx (Meta Marketing API)
//   META_ACCESS_TOKEN     — long-lived user token
//   GOOGLE_ADS_CUSTOMER_ID — 10-digit customer id (no dashes)
//   GOOGLE_ADS_DEVELOPER_TOKEN
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID
//   APP_LAUNCH_DATE_ISO   — YYYY-MM-DD of iOS/Android GA (default: 2026-08-01 placeholder)
//
// Output: docs/agent-reports/YYYY-MM-DD-cac-tripwire.md
// State:  docs/agent-reports/_cac-tripwire-state.json (prev week + breach counter)

import { writeReport, upsertLog, REPORT_DIR, TODAY } from './_lib.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CAC_CEILING_INR = 40;
const STATE_PATH = join(REPORT_DIR, '_cac-tripwire-state.json');
const LAUNCH_DATE = process.env.APP_LAUNCH_DATE_ISO || '2026-08-01';

function loadState() {
  if (!existsSync(STATE_PATH)) return { weeks: [], breachStreak: 0 };
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { weeks: [], breachStreak: 0 }; }
}

function saveState(s) {
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

async function fetchMeta() {
  const acct = process.env.META_AD_ACCOUNT_ID;
  const tok = process.env.META_ACCESS_TOKEN;
  if (!acct || !tok) return { available: false, reason: 'META_AD_ACCOUNT_ID or META_ACCESS_TOKEN missing — paste in GH secrets to enable' };
  // Last 7 days insights: spend + mobile_app_install actions
  const url = `https://graph.facebook.com/v19.0/${acct}/insights?date_preset=last_7d&fields=spend,actions&access_token=${tok}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { available: false, reason: `Meta API ${r.status}` };
    const j = await r.json();
    const row = j.data?.[0];
    if (!row) return { available: true, spend: 0, installs: 0 };
    const spend = Number(row.spend) || 0;
    const installs = Number(row.actions?.find(a => a.action_type === 'mobile_app_install')?.value) || 0;
    return { available: true, spend, installs };
  } catch (e) {
    return { available: false, reason: String(e) };
  }
}

async function fetchGoogle() {
  // Google Ads Query Language requires OAuth refresh-token flow + dev token.
  // Stub returns unavailable until founder pastes 3 env vars.
  const cust = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const dev = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!cust || !dev) return { available: false, reason: 'GOOGLE_ADS_CUSTOMER_ID or GOOGLE_ADS_DEVELOPER_TOKEN missing — paste in GH secrets to enable' };
  // Real impl uses Google Ads API REST endpoint with GAQL query:
  //   SELECT metrics.cost_micros, metrics.conversions
  //   FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type='MULTI_CHANNEL'
  // Deferred until OAuth refresh-token wiring.
  return { available: false, reason: 'Google Ads OAuth refresh-token wiring deferred — see TODO in script' };
}

function pastLaunchPlus14() {
  const launch = new Date(LAUNCH_DATE).getTime();
  const today = Date.now();
  const days = Math.floor((today - launch) / 86400000);
  return days >= 14;
}

async function main() {
  const state = loadState();
  const meta = await fetchMeta();
  const google = await fetchGoogle();

  const lines = [];
  lines.push(`# CAC Tripwire — ${TODAY}`);
  lines.push('');
  lines.push(`Ceiling: ₹${CAC_CEILING_INR} blended (Meta + Google UAC, India region).`);
  lines.push(`Launch date: ${LAUNCH_DATE} · Days since launch: ${Math.floor((Date.now() - new Date(LAUNCH_DATE).getTime()) / 86400000)}`);
  lines.push('');
  lines.push('## Channel data (last 7 days)');
  lines.push('');
  lines.push('| Channel | Available | Spend (INR) | Installs | CAC (INR) |');
  lines.push('|---|---|---|---|---|');

  let totalSpend = 0;
  let totalInstalls = 0;

  if (meta.available) {
    const cac = meta.installs > 0 ? Math.round(meta.spend / meta.installs) : '—';
    lines.push(`| Meta UAC | ✓ | ${meta.spend.toFixed(0)} | ${meta.installs} | ${cac} |`);
    totalSpend += meta.spend;
    totalInstalls += meta.installs;
  } else {
    lines.push(`| Meta UAC | ✗ | — | — | — |`);
    lines.push('');
    lines.push(`> Meta unavailable: ${meta.reason}`);
    lines.push('');
  }

  if (google.available) {
    const cac = google.installs > 0 ? Math.round(google.spend / google.installs) : '—';
    lines.push(`| Google UAC | ✓ | ${google.spend.toFixed(0)} | ${google.installs} | ${cac} |`);
    totalSpend += google.spend;
    totalInstalls += google.installs;
  } else {
    lines.push(`| Google UAC | ✗ | — | — | — |`);
    lines.push('');
    lines.push(`> Google unavailable: ${google.reason}`);
    lines.push('');
  }

  if (!meta.available && !google.available) {
    lines.push('');
    lines.push('## Status: NO-OP');
    lines.push('');
    lines.push('No paid channels have API credentials configured. This is expected pre-launch.');
    lines.push('Founder pastes secrets when Meta + Google UAC campaigns go live.');
    writeReport('cac-tripwire', lines.join('\n'));
    upsertLog('cac-tripwire', 'no-op (no api credentials)');
    return;
  }

  const blendedCac = totalInstalls > 0 ? Math.round(totalSpend / totalInstalls) : null;
  lines.push('');
  lines.push(`## Blended CAC: ${blendedCac !== null ? `₹${blendedCac}` : '—'}`);
  lines.push('');

  const breached = blendedCac !== null && blendedCac > CAC_CEILING_INR;
  const newStreak = breached ? state.breachStreak + 1 : 0;
  const newState = {
    weeks: [...(state.weeks || []).slice(-9), { date: TODAY, blendedCac, breached }],
    breachStreak: newStreak,
  };

  lines.push(`Breach this week: **${breached ? 'YES' : 'NO'}**`);
  lines.push(`Consecutive-week breach streak: **${newStreak}**`);
  lines.push('');

  if (newStreak >= 2 && pastLaunchPlus14()) {
    lines.push('## 🚨 TRIPWIRE FIRED');
    lines.push('');
    lines.push('Blended CAC > ₹40 for 2 consecutive weeks AND launch+14d threshold passed.');
    lines.push('');
    lines.push('**Action per ROADMAP.md strategy tripwires**: fold to NRI-only SKU.');
    lines.push('- Pause Meta UAC India + Google UAC India');
    lines.push('- Shift entire ₹2L/mo budget to NRI lanes (USD pricing, 9-10× domestic, $40 USD CAC ceiling = ₹3300)');
    lines.push('- Update `ROADMAP.md` tripwire status + notify investors in next weekly update');
    upsertLog('cac-tripwire', `FIRED — blended ₹${blendedCac} for ${newStreak} weeks`);
  } else if (breached) {
    lines.push('## ⚠️  Warning (week 1 of 2)');
    lines.push('');
    lines.push('CAC breached ceiling this week but not yet 2-week streak. Monitor next week.');
    upsertLog('cac-tripwire', `warning — blended ₹${blendedCac} week 1`);
  } else {
    lines.push('## ✓ Healthy');
    lines.push('');
    lines.push('Blended CAC within ceiling.');
    upsertLog('cac-tripwire', `healthy — blended ₹${blendedCac ?? 'n/a'}`);
  }

  lines.push('');
  lines.push('## Recent history');
  lines.push('');
  lines.push('| Date | Blended CAC | Breached |');
  lines.push('|---|---|---|');
  for (const w of (newState.weeks || []).slice(-10)) {
    lines.push(`| ${w.date} | ₹${w.blendedCac ?? '—'} | ${w.breached ? 'yes' : 'no'} |`);
  }

  saveState(newState);
  writeReport('cac-tripwire', lines.join('\n'));
}

main().catch((e) => {
  console.error('[cac-tripwire] error', e);
  // Soft-fail: write report so cron doesn't go red, log error.
  writeReport('cac-tripwire', `# CAC Tripwire — ${TODAY}\n\nERROR: ${String(e)}\n`);
  process.exit(0);
});
