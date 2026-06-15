# R-Q2-E-012 — Background job queue (BullMQ + Upstash) handoff

**Status**: scaffold shipped, founder activation required.
**Roadmap item**: `docs/roadmap/items/Q2/engineering/012-background-job-queue-bullmq-upstash-for-email-wa-p.md`

## What shipped (this PR)

| Layer | File | Purpose |
|---|---|---|
| Service | `apps/api/src/services/job-queue.service.ts` | `enqueue()` + `getQueueHealth()` + `closeAllQueues()` w/ env-or-noop fallback. Lazy BullMQ Queue construction per queue name, cached. |
| Tests | `apps/api/src/services/job-queue.service.test.ts` | Noop-mode enqueue + health + URL parse + tls/non-tls fixtures. |
| Route | `apps/api/src/routes/admin-queue.ts` | `GET /api/v1/admin/queue/health` — admin-gated, returns per-queue waiting/active/failed counts. |
| Wire | `apps/api/src/server.ts` | Imports route, registers under `/api/v1/admin/queue`. |
| Dep | already in `apps/api/package.json` | `bullmq ^5.45.2` (no install needed). |

4 canonical queue names: `email | whatsapp | payout | notification`. Producers across the codebase can opt in incrementally — first cut leaves direct Resend/WA/Razorpay calls intact, swap them to `await enqueue('email', 'welcome', payload)` per slice.

## Activation steps (founder, ~15 min)

1. **Provision Upstash Redis** (free tier: 10k commands/day, 256 MB, single region).
   - Sign in at https://upstash.com → Create Database → name `darshya-jobs` → region closest to Render (us-east).
   - Copy the `rediss://default:<TOKEN>@<HOST>.upstash.io:6379` URL.

2. **Render env var** — paste `REDIS_URL` on the `darshya-api` service. Render auto-redeploys.

3. **Verify**: `curl https://api.darshya.online/api/v1/admin/queue/health` (admin token) → expect `enabled:true` + zeroed counts per queue.

4. **Worker process** — not started by this PR. Cheapest path is a separate Render Background Worker service running `node dist/workers/job-worker.js` (worker file is **not** part of this scaffold — write it when first producer is migrated, otherwise jobs accumulate in Redis with no consumer).

## Free-tier budget impact

| Resource | Cost added by this scaffold | Cap | Headroom |
|---|---|---|---|
| Upstash Redis | 0 (REDIS_URL absent → noop) | 10k cmds/day | 100% until activated |
| Render | 0 web-service load; 1 background worker required post-activation | 750 hr/mo total | Background worker ~720 hr/mo if always-on. **Switch to Render Cron jobs OR pause worker when no jobs** to stay free. |
| BullMQ retries | 3 attempts w/ exponential backoff (5s/15s/45s) | — | bounded by `removeOnFail: 24h` retention |

**WARNING**: Render free tier already at 720/750 hr per CLAUDE.md baseline. Activating an always-on worker breaks the budget. Recommended alternative:

- Run worker as a Render **Cron Job** (every 5 min, drain queue, exit) instead of always-on.
- OR fold worker into existing api process via `Worker` instance on boot (saves the second dyno). Caveat: any worker crash takes the api down.
- OR migrate to **Upstash QStash** (HTTP-based pub/sub, no worker process required — 500 messages/day free). Tradeoff: BullMQ features (delayed jobs, repeatable jobs, priorities) become DIY.

## Producer migration checklist (per slice, NOT done in this PR)

For each direct external-API call (Resend send, WA send, Razorpay payout):

1. Find the call site (e.g. `apps/api/src/routes/auth.ts` Resend welcome email).
2. Replace `await resend.emails.send({...})` with `await enqueue('email', 'welcome', { to, name })`.
3. Add the corresponding handler in `apps/api/src/workers/job-worker.ts` (new file, write when first producer migrates).
4. Test in noop mode locally (no REDIS_URL) — the request path should still succeed (jobs dropped, logged as noop).
5. Test with REDIS_URL set — verify Redis `LPUSH bull:email:wait` shows the entry.

Suggested migration order:

1. Welcome / magic-link email (lowest stakes, highest volume)
2. WhatsApp OTP send
3. Razorpay payout trigger (post-video-upload)
4. Notification fan-out

## KPI population

Per roadmap spec, `kpi.metric = job_queue_active`, `target = 1`, `source = manual`. Founder flips `current` from 0 → 1 after step 3 above succeeds end-to-end. Eventually replace with PostHog event `job_queue_processed` cumulative count if migrating to data-driven KPI.

## Status decision

Per R3 lessons (HANDOFF block in TASKS.md) — KPI requires founder action (Upstash provisioning + Render env paste). Item status stays **`in_progress`** until founder confirms activation. Do NOT auto-flip to `shipped`.

## Risks captured

- **Always-on worker breaks Render free tier.** Mitigate per "Free-tier budget impact" section above.
- **Noop dropped jobs are invisible.** If producers migrate before worker exists, jobs accumulate in Redis but never process. Counter: ship worker AND first producer in the same PR.
- **bullmq v5 + ioredis** uses Lua scripts for atomic ops — Upstash supports them but rejects EVALSHA without prior LOAD on a fresh connection. Cache warmup is automatic but adds ~50ms p99 to first call after reconnect.
- **Single-region Redis** means cross-region API → Redis hop ~150ms if Render region != Upstash region. Pick same region.

## Next ticket suggestions

- `R-Q2-E-012a` — write `apps/api/src/workers/job-worker.ts` + Render Cron Job config.
- `R-Q2-E-012b` — migrate first producer (auth.ts welcome email) end-to-end.
- `R-Q2-E-012c` — replace manual KPI with PostHog `job_queue_processed` event count.
