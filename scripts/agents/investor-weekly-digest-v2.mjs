#!/usr/bin/env node
// investor-weekly-digest-v2 — Sunday-only real-numbers digest. Polls
// /api/v1/admin/metrics/investor for MRR + GMV + retention + CAC numbers
// computed server-side from Prisma (BookingPayment + Donation + User).
// Outputs an investor-ready markdown that the founder reviews and forwards.
//
// Sunday gate: only fires on Sunday UTC; FORCE=1 overrides.
//
// Falls back gracefully when the endpoint isn't deployed yet — emits a
// "endpoint not live" placeholder so the agent never errors red.
//
// Output: docs/agent-reports/YYYY-MM-DD-investor-weekly-digest-v2.md

import { writeReport, upsertLog, fetchJson, API_BASE, TODAY } from './_lib.mjs';
import { execSync } from 'node:child_process';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const FORCE = process.env.FORCE === '1';

function isSundayUtc() { return new Date().getUTCDay() === 0; }

function gitWeekStats() {
  try {
    const out = execSync('git log --since="7 days ago" --pretty=format:"%h|%s|%ad" --date=short', {
      encoding: 'utf8', cwd: process.cwd(),
    });
    const lines = out.split('\n').filter(Boolean);
    return {
      total: lines.length,
      feats: lines.filter((l) => /\|feat/i.test(l)).length,
      fixes: lines.filter((l) => /\|fix/i.test(l)).length,
      perf: lines.filter((l) => /\|perf/i.test(l)).length,
    };
  } catch { return { total: 0, feats: 0, fixes: 0, perf: 0 }; }
}

function fmtINR(paise) {
  if (!Number.isFinite(paise)) return '₹—';
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return `₹${rupees.toFixed(0)}`;
}

function fmtUSD(cents) {
  if (!Number.isFinite(cents)) return '$—';
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

function fmtPct(x) {
  if (!Number.isFinite(x)) return '—';
  return `${(x * 100).toFixed(1)}%`;
}

async function fetchMetrics() {
  if (!CRON_TOKEN) return { ok: false, reason: 'CRON_AUTH_TOKEN unset' };
  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/metrics/investor?token=${encodeURIComponent(CRON_TOKEN)}`;
  const { json, status, text } = await fetchJson(url, { signal: AbortSignal.timeout(15_000) });
  if (status === 0) return { ok: false, reason: `fetch failed: ${text}` };
  if (status === 404) return { ok: false, reason: 'endpoint 404 — admin metrics route not yet deployed' };
  if (status !== 200 || !json) return { ok: false, reason: `HTTP ${status}` };
  return { ok: true, data: json };
}

function placeholderMetrics() {
  return {
    mrrPaise: null, gmvCumulativePaise: null, activeUsers: null,
    nriMixPct: null, d7Retention: null, d30Retention: null,
    cacPaise: null, paidUsers: null, signupsThisWeek: null,
    topFunnelLeaks: [], lineBreakdown: [],
  };
}

async function main() {
  console.log('[investor-weekly-digest-v2] starting');

  if (!isSundayUtc() && !FORCE) {
    writeReport('investor-weekly-digest-v2', `# investor-weekly-digest-v2 — ${TODAY}\n\n**Skipped:** weekly agent, today is not Sunday (UTC). Use FORCE=1 to override.\n`);
    return;
  }

  const result = await fetchMetrics();
  const m = result.ok ? result.data : placeholderMetrics();
  const git = gitWeekStats();

  const md = `# Darshya — investor weekly digest v2 — ${TODAY}

> Real numbers pulled from production Prisma (Sundays only).
> Founder reviews and forwards to investor list.

${result.ok ? '' : `> ⚠ **Live metrics endpoint not available** — ${result.reason}.\n> Numbers below are placeholders. Endpoint ships in Sprint 3 sub-batch 4 (\`/admin/metrics\`).\n`}

## North-star numbers

| Metric | Value | Day-90 target | Status |
|---|---:|---:|---|
| MRR | ${fmtINR(m.mrrPaise)} | ₹25k | ${m.mrrPaise != null ? (m.mrrPaise >= 2500000 ? '🟢' : '🟡') : '⚪'} |
| GMV (cumulative) | ${fmtINR(m.gmvCumulativePaise)} | ₹1L | ${m.gmvCumulativePaise != null ? (m.gmvCumulativePaise >= 10000000 ? '🟢' : '🟡') : '⚪'} |
| Paying users | ${m.paidUsers ?? '—'} | 100+ | ${m.paidUsers != null ? (m.paidUsers >= 100 ? '🟢' : '🟡') : '⚪'} |
| NRI mix | ${fmtPct(m.nriMixPct)} | 15%+ | ${m.nriMixPct != null ? (m.nriMixPct >= 0.15 ? '🟢' : '🟡') : '⚪'} |
| D7 retention | ${fmtPct(m.d7Retention)} | ≥35% | ${m.d7Retention != null ? (m.d7Retention >= 0.35 ? '🟢' : '🟡') : '⚪'} |
| D30 retention | ${fmtPct(m.d30Retention)} | ≥25% | ${m.d30Retention != null ? (m.d30Retention >= 0.25 ? '🟢' : '🟡') : '⚪'} |
| CAC (blended) | ${fmtINR(m.cacPaise)} | < ₹400 | ${m.cacPaise != null ? (m.cacPaise <= 40000 ? '🟢' : '🔴') : '⚪'} |

## Activity this week

- Active users: **${m.activeUsers ?? '—'}**
- New signups: **${m.signupsThisWeek ?? '—'}**
- Commits: **${git.total}** (${git.feats} features, ${git.fixes} fixes, ${git.perf} perf)

${Array.isArray(m.lineBreakdown) && m.lineBreakdown.length ? `## Revenue by line

| Line | Bookings | GMV | Platform net |
|---|---:|---:|---:|
${m.lineBreakdown.map((l) => `| ${l.name} | ${l.count} | ${fmtINR(l.gmvPaise)} | ${fmtINR(l.netPaise)} |`).join('\n')}
` : ''}

${Array.isArray(m.topFunnelLeaks) && m.topFunnelLeaks.length ? `## Top funnel leaks this week

${m.topFunnelLeaks.map((l, i) => `${i + 1}. **${l.stage}** — ${fmtPct(l.dropPct)} drop (was ${l.baseline}, now ${l.current})`).join('\n')}
` : ''}

## Ask of investors

- _(founder fills in: warm intros / advisor time / hiring referrals / specific pilot customers)_

## What's next (Sprint 3 sub-batches remaining)

- **3** — Wave 3 agents (this report is one of them) ✅
- **4** — /admin/metrics real-numbers dashboard (powers the table above with real data)
- **5** — Mobile provider portals full parity (pandit/temple/gaushala/etc on Android)
- **6** — Cleanup + Day-90 pitch deck outline

---
_Sent: ${TODAY} · Darshya · https://darshya.online_
_Auto-generated by \`scripts/agents/investor-weekly-digest-v2.mjs\` · review before forwarding._
`;

  writeReport('investor-weekly-digest-v2', md);
  upsertLog('investor-weekly-digest-v2', `ok=${result.ok} mrr=${m.mrrPaise ?? 'n/a'} gmv=${m.gmvCumulativePaise ?? 'n/a'} users=${m.paidUsers ?? 'n/a'}`);
  console.log('[investor-weekly-digest-v2] done');
}

main().catch((e) => {
  console.error('[investor-weekly-digest-v2] FATAL', e);
  process.exit(1);
});
