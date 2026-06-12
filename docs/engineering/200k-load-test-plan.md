# 200K MAU Load Test Plan — k6 100K Concurrent + p95<400ms

> **Roadmap item**: R-Q4-E-004 (P0) · **Authored**: 2026-06-13 · **Extends**: R-Q3-E-006 50K MAU load test

## Goal

Q4 scale validation: 200K MAU sustainable, 100K concurrent peak (e.g. Diwali night), p95 latency <400ms, zero 5xx.

## Scenarios

### A. Steady 200K MAU

50K concurrent at peak (assuming 25% concurrency ratio at peak hour)
- API ~3K RPS sustained
- Postgres ~1500 QPS
- p95 <400ms target

### B. Diwali spike (Nov 8 — annual peak)

| Time | Concurrent | API load |
|---|---|---|
| T-4h (3 PM IST) | 30K | normal browsing |
| T-1h (6 PM IST) | 70K | booking spike + live darshan |
| T-0 (7 PM IST aarti) | 100K | peak |
| T+30min | 80K | continued aarti |
| T+2h | 50K | drift |
| T+4h | 30K | normal |

Sustained 100K for 30+ min must not degrade.

### C. Multi-festival concurrent (Diwali + Govardhan + Bhai Dooj 72h window)

3 sequential peaks. No recovery debt between.

## Tools

- k6 distributed across 5 regions (AWS Lightsail $5/region)
- Load test environment: STAGING (NOT prod). Stage env scaled to 80% prod scale.
- Render auto-scale dashboard monitoring
- Supabase query performance dashboard

## k6 script (extends R-Q3-E-006)

```javascript
// scripts/load-test/diwali-spike.js
export const options = {
  stages: [
    { duration: '30m', target: 30000 },  // T-4h
    { duration: '30m', target: 70000 },  // T-1h
    { duration: '60m', target: 100000 }, // sustained peak 1h
    { duration: '30m', target: 50000 },  // T+2h
    { duration: '15m', target: 0 },      // cool
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.005'],
  },
};
```

## Pass criteria

- [ ] Scenario B sustained 100K concurrent, p95 <400ms
- [ ] 5xx error rate <0.5%
- [ ] Postgres connection pool stays <80%
- [ ] Render auto-scale fires within 60 sec of spike
- [ ] No DB query timeouts
- [ ] Live darshan stream (AWS IVS or alternative) handles 50K concurrent viewers

## Bottleneck mitigation pre-test

- [ ] Add Redis cache (Upstash) for top-10 query patterns
- [ ] Index audit for Postgres heavy-query paths
- [ ] CF Pages KV cache for static asset lookups
- [ ] CDN tuning for video proof + impact PDFs

## Closes

R-Q4-E-004 — plan shipped.
