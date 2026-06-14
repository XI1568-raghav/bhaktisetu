# Load tests — Darshya

k6 scripts for capacity + scale verification.

## Prereqs

- [k6](https://k6.io/docs/get-started/installation/) installed locally OR via Docker:
  ```
  docker run --rm -i grafana/k6 run - <scripts/load-tests/50k-concurrent-mau.k6.js
  ```
- Target API reachable (default `https://api.darshya.online`)

## Run profiles

| Profile | Peak VUs | Duration | Use when |
|---|---|---|---|
| `smoke` (default) | 200 | 2m | CI gate, every deploy |
| `midscale` | 5,000 | 10m | Pre-launch readiness check |
| `full` | 50,000 | 45m | R-Q3-E-006 scale test (founder-gated, paid Render only) |

```bash
# Smoke (CI-safe)
k6 run scripts/load-tests/50k-concurrent-mau.k6.js

# Mid-scale (Render free still ok for 10-15min burst)
k6 run -e PROFILE=midscale scripts/load-tests/50k-concurrent-mau.k6.js

# Full 50K (NEEDS PAID RENDER — see docs/engineering/R-Q3-E-006-handoff.md)
k6 run -e PROFILE=full -e BASE_URL=https://api-staging.darshya.online \
  scripts/load-tests/50k-concurrent-mau.k6.js
```

## Output

- Console: human summary table + JSON one-liner
- File: `docs/agent-reports/scale-test-latest.json` (KPI fields the
  roadmap engine picks up on next cycle for R-Q3-E-006)

## Traffic mix

Read-only by design. Write paths (booking, payment) are NOT exercised —
Razorpay sandbox cannot absorb 50K concurrent and live keys would
trigger fraud lockouts. See `booking-flow-smoke.k6.js` (TODO) for the
isolated booking-lane validation.
