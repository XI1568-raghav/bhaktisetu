# R-Q3-E-006 — Scale test 50K concurrent MAU + Render auto-scale verified

> Status: **PARTIAL — founder action required** to execute the full 50K run.
> Item: `docs/roadmap/items/Q3/engineering/006-scale-test-50k-concurrent-mau-load-test-render-aut.md`
> KPI: `scale_test_max_concurrent` target 50000 users (k6 source).
> Engineering shipped: load-test scaffold + smoke profile. Full-scale execution gated on paid Render plan.

## What this PR ships

1. `scripts/load-tests/50k-concurrent-mau.k6.js` — k6 script with three profiles:
   - `smoke` (200 VUs / 2m) — CI-safe, no quota impact
   - `midscale` (5K VUs / 10m) — pre-launch readiness, free Render still ok
   - `full` (50K VUs / 45m) — the R-Q3-E-006 acceptance run
2. `scripts/load-tests/README.md` — invocation cheatsheet
3. KPI emission — `handleSummary` writes
   `docs/agent-reports/scale-test-latest.json` so the next ARE cycle
   picks up `scale_test_max_concurrent` for the roadmap engine.
4. This handoff doc — founder action items below.

## Why this is PARTIAL

The roadmap item is engineering-shaped (write a load test) but the
acceptance criterion is operational (actually run it at 50K against a
real environment). Render free-tier instances are docker containers
capped at ~512MB RAM and will OOM long before 50K concurrent. Hitting
production `api.darshya.online` would also blow through:

- Render egress (3K req/s sustained for 15m = ~2.7M reqs)
- Supabase free-tier connection cap (60 simultaneous)
- Razorpay rate-limit (if any auth+book path slipped into the mix —
  ours is intentionally read-only)

So the test scaffold is shipped now (this PR), and the actual 50K run
is a founder-gated operational task scheduled separately.

## Founder action items (label: `founder-action-required`)

### 1. Provision a scale-test target (PICK ONE)

- **Option A (recommended)**: Spin up a paid Render Web Service copy of
  `apps/api` pointed at a Supabase shadow project (read-replica or
  manual dump). ~$25 for the 45-minute run.
- **Option B**: Run against `api.darshya.online` during a planned
  off-peak window (02:00-04:00 IST), pre-warn ops, watch error budget.
  Free but risks user-visible 5xx if scale-out lag > 2min.
- **Option C**: Reduce target to 25K and run against current Render
  setup. Document the gap in the roadmap item KPI note.

### 2. Install k6

Local: https://k6.io/docs/get-started/installation/
Cloud: https://k6.io/cloud (free tier covers 50 VU runs only — the
50K run needs the Pro $99/mo trial OR self-hosted Grafana k6 OSS).

### 3. Run the full profile

```bash
k6 run \
  -e PROFILE=full \
  -e BASE_URL=https://api-staging.darshya.online \
  scripts/load-tests/50k-concurrent-mau.k6.js | tee docs/agent-reports/$(date +%Y-%m-%d)-scale-test-50k.txt
```

### 4. Verify Render auto-scale

During the `peak` and `hold` stages (minute 25-40), check Render
dashboard → service → Metrics. Expected behavior:

- Instance count climbs from 1 to N (whatever auto-scale config allows)
- p95 latency stays under 1.5s
- Error rate stays under 1%
- No OOM/CPU-throttle alerts

### 5. Update roadmap item KPI

After the run, paste the output `scale_test_max_concurrent` value into
`docs/roadmap/items/Q3/engineering/006-scale-test-50k-concurrent-mau-load-test-render-aut.md`
`kpi.current` field and flip `status: shipped` with `shipped_at`
timestamp.

### 6. Document tripwires

Capture any failure mode in `docs/operational-context.md` under a new
"scale ceiling" section. E.g., "Render free tier OOMs at ~3500 VUs",
"Supabase pooler 502s at ~80 concurrent connections", etc.

## How the smoke profile protects CI

Default `PROFILE=smoke` caps at 200 VUs over 2 minutes — well within
Render free-tier headroom and finishes in time for a normal CI run.
Future CI workflow can invoke this on PR merges to catch regressions
early. (Not wired in this PR; that's a separate runbook task.)

## Files in this PR

- `scripts/load-tests/50k-concurrent-mau.k6.js` (new)
- `scripts/load-tests/README.md` (new)
- `docs/engineering/R-Q3-E-006-handoff.md` (this file, new)
