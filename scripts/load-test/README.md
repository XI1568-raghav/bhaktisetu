# Load test scripts — R-Q4-E-004

k6 load tests validating 200K MAU + 100K concurrent peak (Diwali spike) capacity.

## Scripts

| File | Scenario | Peak VUs | Duration | Use case |
|---|---|---|---|---|
| `steady-200k.js` | A — Steady 200K MAU | 50K | ~110 min | Daily peak hour load (evening aarti window) |
| `diwali-spike.js` | B — Diwali night spike | 100K | ~165 min | Annual peak — Diwali night 7-9 PM IST |

A `multi-festival-72h.js` (Scenario C) is not yet scripted — extend `diwali-spike.js` stages to chain Diwali + Govardhan + Bhai Dooj peaks across 72h.

## Pre-flight

1. **Staging env scaled to 80% prod capacity** (Render plan upgrade temp, Supabase pooler max conn raised). Owner action.
2. **Bottleneck mitigation per spec §70-75** (Redis cache, Postgres index audit, CF Pages KV cache, CDN tuning). Should be applied before load test, not measured under load.
3. **k6 installed locally** — `choco install k6` (Win) or `brew install k6` (Mac) or k6 Cloud token for distributed run.

## Run locally (single-node, capped at ~5K VUs)

```bash
k6 run --env BASE_URL=https://api-staging.darshya.online \
       --env WEB_URL=https://staging.darshya.online \
       scripts/load-test/steady-200k.js
```

## Run distributed (5 regions, 100K VUs achievable)

Option A — k6 Cloud (managed, ~$300 for one Q4 run, expense as R-Q4-E-004 infra):

```bash
k6 cloud scripts/load-test/diwali-spike.js
```

Option B — Self-hosted on 5 AWS Lightsail $5 nodes (~$25 one-time):

```bash
# Per node:
k6 run --env BASE_URL=... --vus 20000 --duration 165m scripts/load-test/diwali-spike.js
# Aggregate results via InfluxDB or k6 Grafana Cloud
```

## Pass criteria (per R-Q4-E-004 spec)

- [ ] Scenario B sustained 100K concurrent for 30+ min
- [ ] http_req_duration p95 < 400ms
- [ ] http_req_failed rate < 0.5% (target 0%)
- [ ] Postgres connection pool < 80% utilisation
- [ ] Render auto-scale fires within 60s of spike
- [ ] No DB query timeouts
- [ ] Live darshan stream handles 50K concurrent viewers (IVS metrics dashboard)

## Output

k6 writes `docs/load-test/diwali-spike-summary.json` per run + stdout summary line. Capture each run alongside:

- Render `service-metrics` JSON snapshot (CPU/memory/instance count)
- Supabase `pg_stat_statements` top-50 queries delta
- CF Pages analytics request count + cache hit ratio

## Founder action required

- Set up k6 Cloud token + payment OR provision 5 Lightsail nodes
- Approve staging env temp scale-up (~$50-100 Render+Supabase additional spend for test window)
- Schedule first Q4 dry-run for end of Oct 2026 (Diwali = Nov 8 2026)
- Run again Nov 1 (T-7 days) as final validation
