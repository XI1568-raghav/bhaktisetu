#!/usr/bin/env node
// Uptime Pinger — daily check of 14 critical surfaces (web + API + RSS).
// Reports status + latency, flags 5xx or >3s as DEGRADED. Distinct from
// lighthouse-weekly (perf) — this is uptime/availability with daily cadence.
//
// Output: docs/agent-reports/YYYY-MM-DD-uptime-pinger.md
import { writeReport, WEB_BASE, API_BASE } from './_lib.mjs';

const TARGETS = [
  // Web — critical conversion paths
  { name: 'home', url: WEB_BASE },
  { name: 'pujas', url: `${WEB_BASE}/pujas` },
  { name: 'temples', url: `${WEB_BASE}/temples` },
  { name: 'darshan', url: `${WEB_BASE}/darshan` },
  { name: 'panchang', url: `${WEB_BASE}/panchang` },
  { name: 'nri', url: `${WEB_BASE}/nri` },
  { name: 'gift', url: `${WEB_BASE}/gift` },
  { name: 'today', url: `${WEB_BASE}/today` },
  { name: 'sitemap', url: `${WEB_BASE}/sitemap.xml` },
  { name: 'feed', url: `${WEB_BASE}/feed.xml` },
  { name: 'robots', url: `${WEB_BASE}/robots.txt` },
  // API — health + public surfaces
  // `/health`, NOT `/healthz` -- the second permanently-red target in this list.
  // server.ts registers healthChannelRoutes at `/health` and `/api/v1/health`
  // only; nothing has ever answered `/healthz`. Verified against production:
  // /healthz -> 404, /health -> 200 {"status":"ok"}.
  { name: 'api-health', url: `${API_BASE}/health` },
  { name: 'api-temples', url: `${API_BASE}/api/v1/temples?limit=1` },
  // `/api/v1/pujas/types`, NOT `/api/v1/puja-types`. The latter has never been a
  // route -- pujaRoutes is registered at the `/api/v1/pujas` prefix and declares
  // `/types` inside it -- so this target returned 404 on every run since the
  // pinger was written, and the daily report has always carried one permanent
  // failure.
  //
  // That is worse than a missing check. A monitor with a target that is always
  // red teaches its reader that red is the normal colour, which is the same
  // failure mode that let the 2026-08-17 Render suspension serve 503s for three
  // days before anyone noticed. Verified against production: /api/v1/puja-types
  // -> 404, /api/v1/pujas/types -> 200.
  { name: 'api-pujas', url: `${API_BASE}/api/v1/pujas/types?limit=1` },
];

const SLOW_MS = 3000;

async function ping(target) {
  const t0 = Date.now();
  try {
    const r = await fetch(target.url, {
      method: 'GET',
      headers: { 'user-agent': 'darshya-uptime-pinger/1.0', accept: '*/*' },
      // 10s hard cap
      signal: AbortSignal.timeout(10000),
    });
    const ms = Date.now() - t0;
    return { ...target, status: r.status, ms, ok: r.ok };
  } catch (e) {
    return { ...target, status: 0, ms: Date.now() - t0, ok: false, error: String(e).slice(0, 200) };
  }
}

function classify(r) {
  if (r.status === 0) return 'DOWN';
  if (r.status >= 500) return 'DOWN';
  if (r.status >= 400) return 'ERROR';
  if (r.ms > SLOW_MS) return 'SLOW';
  return 'OK';
}

async function main() {
  // Polite: serial w/ 200ms gap to avoid hammering own infra
  const results = [];
  for (const t of TARGETS) {
    results.push(await ping(t));
    await new Promise((r) => setTimeout(r, 200));
  }

  const buckets = { OK: [], SLOW: [], ERROR: [], DOWN: [] };
  for (const r of results) buckets[classify(r)].push(r);

  const lines = [];
  lines.push(`# Uptime check — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  lines.push('');
  lines.push(`Probed **${results.length}** surfaces.`);
  lines.push('');
  lines.push(`- ✅ OK: ${buckets.OK.length}`);
  lines.push(`- 🐢 SLOW (>${SLOW_MS}ms): ${buckets.SLOW.length}`);
  lines.push(`- ⚠️  ERROR (4xx): ${buckets.ERROR.length}`);
  lines.push(`- 🔴 DOWN (5xx / network): ${buckets.DOWN.length}`);
  lines.push('');

  if (buckets.DOWN.length || buckets.ERROR.length) {
    lines.push('## Action required');
    lines.push('');
    lines.push('| Surface | URL | Status | Latency | Error |');
    lines.push('|---|---|---|---|---|');
    for (const r of [...buckets.DOWN, ...buckets.ERROR]) {
      lines.push(`| ${r.name} | ${r.url} | ${r.status} | ${r.ms}ms | ${r.error || '—'} |`);
    }
    lines.push('');
  }

  if (buckets.SLOW.length) {
    lines.push('## Slow surfaces');
    lines.push('');
    lines.push('| Surface | URL | Latency |');
    lines.push('|---|---|---|');
    for (const r of buckets.SLOW) lines.push(`| ${r.name} | ${r.url} | ${r.ms}ms |`);
    lines.push('');
  }

  lines.push('## Full results');
  lines.push('');
  lines.push('| Surface | Status | Latency |');
  lines.push('|---|---|---|');
  for (const r of results) {
    const badge = classify(r) === 'OK' ? '✅' : classify(r) === 'SLOW' ? '🐢' : classify(r) === 'ERROR' ? '⚠️' : '🔴';
    lines.push(`| ${r.name} | ${badge} ${r.status} | ${r.ms}ms |`);
  }
  lines.push('');
  lines.push(`_Probed from GH Actions runner. Latency includes runner→origin RTT._`);

  writeReport('uptime-pinger', lines.join('\n'));
}

main();
