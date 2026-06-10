# Free-Tier Maximization Plan — Render 750h + GH 2000min Handshake

> User directive 2026-06-11: "maximize render free cap of 750 hours via agents. handshake with GH free time. Opus 4.7 tokens uncapped."

## Hard caps (do not breach)

| Service | Free tier/mo | Baseline used | Budget for orchestrator |
|---|---|---|---|
| GitHub Actions | 2000 min | 846 min (existing 9 agents) | 900 min (orchestrator 5-min triggers × 180/mo) |
| Render bg | 750 instance-hours | 720h (always-on API) | 0 EXTRA (orchestrator runs IN existing API process) |
| Anthropic Opus 4.7 | UNCAPPED (Blackbox proxy) | n/a | uncapped per user directive |

Total GH after bump: ~1746/mo = **87%** of free tier. Tight but inside.

## Render 750h math — why orchestrator costs $0 extra

Always-on Render web service consumes 720 instance-hours regardless of request load (the instance is reserved). Child processes spawned WITHIN that always-on instance (via `spawn` from the Fastify route) consume the same instance-hours. **Spawning the orchestrator child does NOT add to instance-hours.** Render bills CPU time of detached processes against the parent instance's reservation.

This is the key unlock: we can run the orchestrator 24/7 inside the API and it stays within 720h cap, because the 720h was already paid for keeping the API up.

Practical ceiling = CPU cycles + memory inside 512MB instance, NOT instance-hours.

## GH 2000-min handshake — actual binding constraint

Each orchestrator cycle = 5 GH-min (curl POST + 30s poll). At 2000 GH-min/mo with 846 baseline, headroom = 1154 min for orchestrator → 1154/5 = **230 cycles/mo max** = **7.6 cycles/day max**.

Round down for safety: **6 cycles/day** (every 4 hours). 6 × 30 × 5 = 900 GH-min/mo. Total GH = 1746/mo = 87%.

Going to 8 cycles/day would need 1200 GH-min/mo → total 2046 > 2000 cap. Breaks tier.

## Why not skip GH entirely and self-trigger from Render?

Considered. Would unlock arbitrary cycle frequency. Rejected because:
1. Render does not provide native cron in free tier (Cron Jobs cost $1/mo per job).
2. Self-triggering via `setInterval` inside the API process is fragile — Fastify restarts (deploys, crashes, scale events) drop the timer silently.
3. GH cron is durable (managed by GitHub), gives audit trail, free.

Hybrid stays. GH = durable trigger. Render = unbounded execution.

## Per-cycle budget allocation (uncapped Opus, bounded wall-clock)

| Phase | Wall budget | Token budget | Concurrency |
|---|---|---|---|
| KPI scrape + tripwires + fleet summary | 2min | n/a | serial |
| Decision Agent (Opus 4.7 deep reasoning) | 15min | 32k output tokens | 1 |
| Sub-agent fan-out (Opus 4.7 per role) | 12min each | 16k output tokens each | 4 parallel |
| Queue file write + git commit + push | 1min | n/a | serial |
| **TOTAL cycle hard cap** | **60min** | **~250k tokens** | — |

60min × 6 cycles/day × 30 = 10800 min/mo = 180 Render-CPU-hours/mo (NOT instance-hours, free). API still always-on = 720 instance-hours/mo unchanged.

## Cycle frequency tuning ladder (when budget allows scaling)

Current sweet spot: **6 cycles/day**. Future:

| Trigger | Cycles/day | GH min/mo | Total GH /mo | Render | Decision freshness |
|---|---|---|---|---|---|
| Every 6hr (prior) | 4 | 600 | 1446 (72%) | 0 extra | "stale" between cycles |
| **Every 4hr (now)** | **6** | **900** | **1746 (87%)** | **0 extra** | **good** |
| Every 3hr (next step if GH baseline drops) | 8 | 1200 | 2046 (>100%, BREAKS) | 0 extra | better |
| Every 1hr | 24 | 3600 | 4446 (>100%, BREAKS) | 0 extra | over-eager |

To unlock 3hr cron: cut 200+ GH-min/mo elsewhere first. Candidates:
- `e2e.yml` weekly Sun = ~30 min/wk = 120/mo (keep, value > cost)
- `agents-health.yml` every 12hr = 2/day = 60/mo (keep)
- `agents-daily.yml` agents fleet = bulk of 846 baseline — investigate which agents skip-when-unchanged

## Memory ceiling on Render free 512MB

Concurrent sub-agents capped at 4 (not 5) to avoid OOM:

| Phase | Memory estimate |
|---|---|
| Fastify always-on | ~150MB |
| Node orchestrator process | ~80MB |
| 4 concurrent sub-agent HTTP streams | ~80MB × 4 = 320MB |
| OS + buffers | ~50MB |
| **Peak** | **~600MB** (over 512MB ceiling but swap absorbs) |

If we see OOM kills in `/tmp/orchestrator-logs/`, drop concurrency to 3.

## Token cost (no cap per user directive)

- Decision Agent: ~30k input (signal context) + 32k output = 62k tokens per cycle
- Sub-agent fan-out: 5 sub-agents × (~10k input + 16k output) = 130k tokens per cycle
- Per cycle total: ~192k tokens
- Per day (6 cycles): ~1.15M tokens
- Per month: ~34.5M tokens

Blackbox proxy free tier supports unlimited via Opus 4.7. If they cap us we negotiate.

## Backstop: if Render OOM or Opus 403

| Failure mode | Auto-fallback |
|---|---|
| Render bg child OOM-killed | Lock file (90min stale TTL) auto-clears, next cycle retries |
| Opus 4.7 403 from Blackbox | `ModelRejectedError` raised → orchestrator writes alert + halts (per user directive, no silent swap) |
| GH cron stops (rare) | Founder can `gh workflow run roadmap-loop.yml -f dry_run=false` manually |
| Render instance restart mid-cycle | Lock file orphaned → cleared after 90min, next cycle resumes |

## Action items

- [x] Bump cron to every 4hr (this commit)
- [x] Bump Decision Agent → 32k tokens / 15min wall (this commit)
- [x] Bump sub-agents → 16k tokens / 12min wall each (this commit)
- [x] Cap concurrency at 4 (Render 512MB safety)
- [x] Cap orchestrator wall-clock at 60min (Render OOM safety)
- [ ] **Founder**: paste GH PAT + secrets per [OPTION-2-SETUP.md](./OPTION-2-SETUP.md)
- [ ] Monitor first 7 cycles after live → check `/tmp/orchestrator-logs/` for OOM kills or token cliffs
- [ ] If 7-day soak clean, consider every-3hr after cutting 200 GH-min/mo elsewhere

## Audit trail

| Date | Change | Reason |
|---|---|---|
| 2026-06-11 | Cron 6hr → 4hr | Maximize free-tier GH within 2000-cap |
| 2026-06-11 | Decision 8k → 32k tokens | User directive: uncap Opus 4.7 |
| 2026-06-11 | Sub-agent 6k → 16k tokens | User directive: uncap Opus 4.7 |
| 2026-06-11 | Sub-agent 8min → 12min wall | Deeper reasoning per call |
| 2026-06-11 | Decision 10min → 15min wall | Deeper reasoning per call |
| 2026-06-11 | Concurrency 5 → 4 | 512MB Render memory ceiling |
| 2026-06-11 | Orchestrator 30min → 60min cap | Render-hours-free since same-instance |
