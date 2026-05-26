#!/usr/bin/env node
// Growth Agent — daily snapshot from API + tripwire check.
// Output: docs/agent-reports/YYYY-MM-DD-growth-metrics.md
import { fetchJson, writeReport, TODAY, isoNow, API_BASE } from './_lib.mjs';

const TRIPWIRES = [
  { name: 'NRI Day-30 retention', limit: 25, unit: '%', dir: 'gte', source: 'analytics' },
  { name: 'Blended NRI CAC', limit: 40, unit: '$', dir: 'lte', source: 'analytics' },
  { name: 'NRI annual:per-puja ratio', limit: '1:3', unit: '', dir: 'gte', source: 'analytics' },
];

async function safeCount(endpoint) {
  const r = await fetchJson(`${API_BASE}${endpoint}`);
  if (r.status !== 200) return { value: 0, error: `HTTP ${r.status}` };
  const j = r.json;
  // Heuristic count extraction
  if (Array.isArray(j)) return { value: j.length };
  for (const k of ['total', 'count', 'totalCount']) if (typeof j?.[k] === 'number') return { value: j[k] };
  for (const k of ['data', 'items', 'gurukuls', 'priests', 'astrologers', 'temples', 'products', 'astrologerProfiles']) {
    if (Array.isArray(j?.[k])) return { value: j[k].length };
  }
  return { value: 0, error: 'unknown-shape' };
}

async function run() {
  const surfaces = [
    { label: 'Temples (public)', endpoint: '/api/v1/temples' },
    { label: 'Priests (public)', endpoint: '/api/v1/priests' },
    { label: 'Astrologers (public)', endpoint: '/api/v1/astrology/astrologers' },
    { label: 'Gurukuls (public)', endpoint: '/api/v1/gurukuls' },
    { label: 'Store products (public)', endpoint: '/api/v1/store/products' },
    { label: 'Yatra packages (public)', endpoint: '/api/v1/yatra-packages' },
    { label: 'Puja types (public)', endpoint: '/api/v1/pujas/types' },
    { label: 'Content (public)', endpoint: '/api/v1/content' },
  ];

  const rows = [];
  for (const s of surfaces) rows.push({ ...s, ...(await safeCount(s.endpoint)) });

  // Health probe
  const health = await fetchJson(`${API_BASE}/health`);

  const body = `# Growth Metrics — ${TODAY}

> Daily snapshot. Public-endpoint inventories + API health + tripwire reminders. Authenticated metrics (MAU, MRR, retention) require admin-token route and are stubbed below.

## Supply inventory (live counts from prod public endpoints)

| Surface | Count | Note |
|---|---|---|
${rows.map((r) => `| ${r.label} | ${r.value} | ${r.error || 'ok'} |`).join('\n')}

## API health

- Status: ${health.status === 200 ? '✓ 200' : `⚠ ${health.status}`}
- Body: \`${JSON.stringify(health.json || health.text).slice(0, 200)}\`

## North-star metrics (need authenticated /admin/metrics — wire this next)

| Metric | Target Week 8 | Target Week 12 | Current |
|---|---|---|---|
| MAU | 5,000 | 25,000 | (TBD — admin metrics route) |
| MRR | ₹4L | ₹20L | (TBD) |
| NRI ARPU mix | 30% | 35% | (TBD) |
| Avg bookings/MAU | 0.2 | 0.4 | (TBD) |
| D7 retention | 30% | 35% | (TBD) |
| D30 retention | 20% | 25% | (TBD) |

## Tripwires (review weekly)

${TRIPWIRES.map((t) => `- **${t.name}** — limit: ${t.dir} ${t.limit}${t.unit}. Source: ${t.source}.`).join('\n')}

Two tripwire breaches in same week → reduce to NRI-only SKU. See \`docs/roadmap-archive.md\`.

## Free analytics stack to wire

- **PostHog cloud free tier**: 1M events/mo. Embed in web + mobile. Track signup, role, booking-started, booking-completed, payment-success.
- **Cloudflare Web Analytics**: free, no cookies, no consent banner. Already on CF.
- **Google Search Console**: free keyword + position data. Verify property + submit sitemap.
- **Plausible self-host**: $0 on Fly.io if pageview events outgrow CF Analytics.
- **Sentry free**: 5K errors/mo. Already configured.

## Recommended daily check (founder, 5 min)

1. Open this report
2. Open PostHog dashboard (when wired): signups, activation, payments
3. Open Sentry: any new error >5 events
4. Open GSC: yesterday's impressions vs 7-day avg
5. Reply to all support emails

---
*Agent: growth-metrics · API: ${API_BASE} · timestamp: ${isoNow()}*
`;

  writeReport('growth-metrics', body);
  console.log('Growth metrics snapshot written.');
}

run().catch((e) => { console.error(e); process.exit(1); });
