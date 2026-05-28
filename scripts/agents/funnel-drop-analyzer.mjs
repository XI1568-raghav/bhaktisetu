#!/usr/bin/env node
// funnel-drop-analyzer — daily 06:00 funnel-health probe. Polls
// /api/v1/admin/metrics/funnel?days=7 and compares yesterday vs the 6-day
// prior median per stage. If any stage drops >70%, files a P0 GitHub issue
// (deduped via stable fingerprint). If everything green, writes a quiet
// report and exits — no GH issue.
//
// Stages tracked (server enum, must match API response):
//   landing → signup → kyc → booking → payment_success
//
// Env required for full operation:
//   API_BASE, CRON_AUTH_TOKEN, GITHUB_TOKEN
// Without any of them, agent writes a "skipped" report and exits 0.

import { writeReport, upsertLog, fetchJson, API_BASE, TODAY } from './_lib.mjs';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const GH_REPO = process.env.GH_REPO || 'XI1568-raghav/bhaktisetu';
const DROP_THRESHOLD = Number.parseFloat(process.env.FUNNEL_DROP_THRESHOLD || '0.70');

const STAGES = ['landing', 'signup', 'kyc', 'booking', 'payment_success'];

function median(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}

function fingerprint(stage, dropPct) {
  // Round drop to nearest 10% so the same alert dedups for a week.
  const bucket = Math.round(dropPct * 10) / 10;
  return `funnel:${stage}:${bucket}`;
}

async function ghFetch(path, init = {}) {
  if (!GH_TOKEN) return { status: 0, json: null };
  try {
    const r = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${GH_TOKEN}`,
        'user-agent': 'darshya-funnel-drop-analyzer',
        ...(init.headers || {}),
      },
    });
    const json = await r.json().catch(() => null);
    return { status: r.status, json };
  } catch (e) { return { status: 0, json: null, error: String(e) }; }
}

async function alreadyFiled(fp) {
  const { json } = await ghFetch(`/repos/${GH_REPO}/issues?state=open&labels=agent-auto-filed,P0&per_page=50`);
  if (!Array.isArray(json)) return false;
  return json.some((iss) => typeof iss?.body === 'string' && iss.body.includes(fp));
}

async function fileIssue(stage, dropPct, yesterday, baseline, fp) {
  const title = `[P0] Funnel drop: ${stage} fell ${Math.round(dropPct * 100)}% vs 6-day baseline`;
  const body = `**Funnel-drop-analyzer auto-filed ${TODAY}**

Stage: \`${stage}\`
Yesterday: **${yesterday}**
6-day median baseline: **${baseline}**
Drop: **${Math.round(dropPct * 100)}%** (threshold ${Math.round(DROP_THRESHOLD * 100)}%)

## Likely causes
- Upstream stage may have collapsed — check the row above this one
- Deploy regression — check recent commits touching the relevant flow
- Payment provider rate-limit / outage
- KYC verifier downtime

## Action
1. Compare today's report to yesterday's at \`docs/agent-reports/${TODAY}-funnel-drop-analyzer.md\`
2. Check \`/admin/agents\` page for related signals (health-smoke, broken-link)
3. Resolve by fixing the upstream issue OR close this issue with \`auto-resolved\` label if the drop self-corrects

---
_fingerprint: \`${fp}\` — re-runs won't duplicate this issue while open_
`;
  const { status, json } = await ghFetch(`/repos/${GH_REPO}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels: ['agent-auto-filed', 'P0', 'funnel-drop'] }),
  });
  return { ok: status === 201, number: json?.number, url: json?.html_url };
}

async function getFunnel() {
  if (!CRON_TOKEN) return null;
  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/metrics/funnel?days=7&token=${encodeURIComponent(CRON_TOKEN)}`;
  const { json, status } = await fetchJson(url, { signal: AbortSignal.timeout(15_000) });
  if (status !== 200 || !json) return null;
  return json;
}

async function main() {
  console.log('[funnel-drop-analyzer] starting');

  if (!CRON_TOKEN) {
    writeReport('funnel-drop-analyzer', `# funnel-drop-analyzer — ${TODAY}\n\n**Skipped:** CRON_AUTH_TOKEN not set.\n`);
    return;
  }

  const funnel = await getFunnel();
  if (!funnel || !Array.isArray(funnel.daily) || funnel.daily.length < 2) {
    writeReport('funnel-drop-analyzer', `# funnel-drop-analyzer — ${TODAY}\n\n**Skipped:** API returned no funnel data (endpoint may not exist yet — Sprint 3 dashboard work).\n`);
    return;
  }

  // funnel.daily = [{ date: 'YYYY-MM-DD', stages: { landing: N, signup: N, ... } }, ...]
  const sorted = funnel.daily.slice().sort((a, b) => a.date.localeCompare(b.date));
  const yesterday = sorted[sorted.length - 1];
  const prior = sorted.slice(0, -1);

  const findings = [];
  const filed = [];

  for (const stage of STAGES) {
    const y = Number(yesterday.stages?.[stage] ?? 0);
    const baseline = median(prior.map((d) => Number(d.stages?.[stage] ?? 0)));
    if (baseline === 0) { findings.push({ stage, status: 'no-baseline', y, baseline }); continue; }
    const dropPct = (baseline - y) / baseline;
    if (dropPct >= DROP_THRESHOLD) {
      findings.push({ stage, status: 'P0', y, baseline, dropPct });
      const fp = fingerprint(stage, dropPct);
      if (GH_TOKEN && !(await alreadyFiled(fp))) {
        const r = await fileIssue(stage, dropPct, y, baseline, fp);
        if (r.ok) filed.push({ stage, number: r.number, url: r.url });
      }
    } else if (dropPct >= 0.3) {
      findings.push({ stage, status: 'warning', y, baseline, dropPct });
    } else {
      findings.push({ stage, status: 'ok', y, baseline, dropPct });
    }
  }

  const md = `# funnel-drop-analyzer — ${TODAY}

Compared yesterday (${yesterday.date}) vs ${prior.length}-day median baseline.
Drop threshold for P0: **${Math.round(DROP_THRESHOLD * 100)}%**.

## Findings

| Stage | Yesterday | Baseline | Δ% | Status |
|---|---:|---:|---:|---|
${findings.map((f) => `| \`${f.stage}\` | ${f.y} | ${Math.round(f.baseline)} | ${f.dropPct != null ? `${(f.dropPct * 100).toFixed(0)}%` : '—'} | ${f.status === 'P0' ? '🔴 **P0**' : f.status === 'warning' ? '🟡 warning' : f.status === 'no-baseline' ? '⚪ no-baseline' : '🟢 ok'} |`).join('\n')}

## GH issues filed this run

${filed.length ? filed.map((f) => `- \`${f.stage}\` → #${f.number} ${f.url}`).join('\n') : '_none — all stages within threshold or already filed_'}

${GH_TOKEN ? '' : '_⚠ GITHUB_TOKEN not set — would-be P0 issues not filed._'}
`;

  writeReport('funnel-drop-analyzer', md);
  upsertLog('funnel-drop-analyzer', `findings=${findings.length} filed=${filed.length}`);
  console.log(`[funnel-drop-analyzer] done findings=${findings.length} filed=${filed.length}`);
}

main().catch((e) => {
  console.error('[funnel-drop-analyzer] FATAL', e);
  process.exit(1);
});
