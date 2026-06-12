# 50K Concurrent MAU Load Test Plan

> **Roadmap item**: R-Q3-E-006 (P0) · **Authored**: 2026-06-12 · **Target run**: Q3 (Oct 2026)

## Goal

Verify Render auto-scale + Postgres + Cloudflare Pages handle 50K concurrent MAU spike (Janmashtami / Diwali festival event scenarios).

## Test scenarios

### Scenario A — Steady-state 50K MAU

| Layer | Load | Method |
|---|---|---|
| Cloudflare Pages | 50K MAU = ~5K concurrent at peak | k6 distributed across 5 regions |
| API (Fastify on Render) | ~500 RPS sustained | k6 → /api/v1/temples + /api/v1/pujas |
| Postgres (Supabase) | ~200 QPS | indirect via API hits |

Target metrics:
- P95 web-page TTFB <2s
- P95 API response <500ms
- 0 5xx errors
- Postgres connection pool < 80% saturated

### Scenario B — Festival spike (Janmashtami midnight aarti)

| Time | Concurrent users | API load |
|---|---|---|
| T-2h | 10K | normal browsing |
| T-30min | 30K | booking queries spike |
| T-0 (midnight) | 50K | live darshan stream + booking submissions |
| T+30min | 35K | post-event drift |
| T+2h | 10K | normal |

Test runs over 4-hour window. Render auto-scale must respond to spikes.

### Scenario C — Cron + cycle collision

Orchestrator cron + outreach cron + KPI scrape cron all firing within 5 min of each other → no API degradation for live users.

## Tools

- **k6** (https://k6.io) — load testing CLI, free + open-source
- **Postman/Insomnia** — manual spot-checks
- **Render dashboard** — live CPU/memory + auto-scale tracking
- **Supabase dashboard** — connection pool + query performance

## k6 script skeleton

```javascript
// scripts/load-test/festival-spike.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15m', target: 10000 }, // ramp to 10K
    { duration: '30m', target: 50000 }, // spike to 50K
    { duration: '30m', target: 50000 }, // sustained 50K
    { duration: '30m', target: 10000 }, // drift back
    { duration: '15m', target: 0 },     // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = 'https://darshya.online';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE}/`],
    ['GET', `${BASE}/festivals`],
    ['GET', `${BASE}/api/v1/temples`],
    ['GET', `${BASE}/api/v1/pujas`],
  ]);
  for (const r of responses) {
    check(r, { 'status 200': (r) => r.status === 200 });
  }
  sleep(Math.random() * 5);
}
```

## Pass criteria

- [ ] Scenario A P95 metrics within targets
- [ ] Scenario B Render auto-scales without 5xx spike (>0.5%)
- [ ] Scenario C no cron-induced API degradation > 1% latency increase
- [ ] Postgres connection pool peaks <80%
- [ ] No queries hit query-timeout
- [ ] Cloudflare Pages cache hit rate >70% (cached temples, pujas, content pages)

## Founder action

```markdown
- [ ] Run scenario A in dry-run mode against staging URL first
- [ ] If staging passes, schedule prod run for off-peak hours (3 AM IST)
- [ ] Monitor Render dashboard live during run
- [ ] Capture all metrics → docs/engineering/load-test-2026-XX-results.md
- [ ] If failed: file bottleneck-specific tickets (Postgres index / Render scale / CF cache)
- [ ] Re-run quarterly OR pre-major-festival
```

## Out of scope

- Real-user concurrency simulation (k6 is enough for v1)
- Mobile app load testing (web only v1)
- Long-duration soak test (>24h) — defer until first paid customers establish baseline
- Penetration testing (separate security ticket)

## Closes

R-Q3-E-006 — plan shipped. Status flips to shipped after successful run + results doc.
