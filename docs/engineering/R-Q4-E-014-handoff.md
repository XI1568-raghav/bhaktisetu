# R-Q4-E-014 — Multi-region failover plan (Mumbai + Singapore + Frankfurt + automatic DNS swap)

Status: handoff scaffold (founder + infra decisions required before execution)
Category: engineering
Priority: P2
Est hours: 32
KPI target: failover RTO ≤ 15 minutes
Depends on: R-Q4-E-003

## Why this matters

Single-region outage today = full Darshya brand outage. NRI lane is geo-distributed by definition (US/UK/CA/AU/SG) and live aarti/darshan during peak festival windows (Maha Shivratri / Janmashtami / Diwali) cannot tolerate Mumbai region downtime. A documented multi-region failover plan with a tested DNS swap procedure cuts mean-time-to-recovery from "however long it takes the founder to manually re-point DNS" to a target ≤ 15 minutes.

This document is the **plan + runbook**, not the implementation. Implementation requires founder decisions on infra costs (Render / Supabase / Cloudflare paid-tier triggers) and is intentionally scoped to fit within free-tier discipline until traffic justifies paid.

## Target architecture

```
                          ┌──────────────────┐
                          │  Cloudflare DNS  │
                          │  (api.darshya)   │
                          │  health-check    │
                          │  load balancer   │
                          └────────┬─────────┘
                                   │
              ┌────────────────────┼─────────────────────┐
              │ primary            │ standby             │ standby
              ▼                    ▼                     ▼
       ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
       │ Mumbai (BOM) │     │ Singapore    │     │ Frankfurt    │
       │ Render apex  │     │ Render mirror│     │ Render mirror│
       │ Supabase BOM │     │ Supabase SG  │     │ Supabase FRA │
       │ primary read │     │ read replica │     │ read replica │
       │ + write      │     │ (logical rep)│     │ (logical rep)│
       └──────────────┘     └──────────────┘     └──────────────┘
              │
              ▼
       ┌──────────────┐
       │ Cloudflare   │
       │ R2 / Pages   │
       │ static asset │
       │ already      │
       │ multi-region │
       └──────────────┘
```

### Region selection rationale

| Region | Code | Why |
|---|---|---|
| Mumbai | BOM | Primary: closest to India devotee + pandit + temple supply. Lowest latency for 80% of traffic. |
| Singapore | SIN | Standby #1: closest fallback for India + SE Asia NRI (~60 ms India ↔ SG). Render + Supabase both have SG region. |
| Frankfurt | FRA | Standby #2: serves UK + EU + US-East NRI cohort. Render + Supabase both have FRA region. |

US-West (SFO) considered but rejected — Frankfurt covers US-East latency reasonably, SFO would only help US-West cohort which is currently < 5% of NRI traffic. Re-evaluate at 10k+ MAU.

### What's already multi-region

| Layer | Status |
|---|---|
| Cloudflare Pages (web) | ✅ Global edge by default (~280 PoPs). No action needed. |
| Cloudflare R2 (assets) | ✅ Multi-region replication built-in. |
| Cloudflare DNS | ✅ Global anycast. |

### What's currently single-region

| Layer | Current | Required for failover |
|---|---|---|
| Render API service | Mumbai-only | Replicas in SIN + FRA, identical env vars |
| Supabase Postgres | Mumbai-only (poojly project) | Read replicas in SIN + FRA via logical replication; promotion runbook for write failover |
| Razorpay webhooks | Single endpoint | Cloudflare worker fan-out or single endpoint that routes to active region |
| Stripe webhooks | Single endpoint | Same as above |
| FCM / Resend / WhatsApp | Stateless 3rd-party | No change needed |

## DNS strategy — Cloudflare Load Balancer

Use Cloudflare Load Balancer (paid: $5/mo + $0.50 per million queries) with three origin pools:

1. **Pool primary**: `api-bom.render.com` (Mumbai). Weight 100.
2. **Pool standby-sin**: `api-sin.render.com` (Singapore). Weight 0 (failover).
3. **Pool standby-fra**: `api-fra.render.com` (Frankfurt). Weight 0 (failover).

Health check config:

```yaml
endpoint: https://api-bom.render.com/health
method: GET
interval: 60s
timeout: 5s
retries: 2
status_code: 200
expected_body_contains: '"status":"ok"'
```

Failover logic:

- If primary fails 2 consecutive health checks (≈ 2 min):
  - Cloudflare auto-routes 100% to `standby-sin` if healthy, else `standby-fra`.
- DNS TTL on the LB record = 60s. Worst-case client-side DNS cache adds 60s to RTO.
- Total automatic RTO target: 2 min health-check failure detection + 60s DNS propagation + 1 min Render warmup if replica was sleeping = **≤ 4 min for read-only traffic**.
- Write failover (Supabase promotion) is the long pole — see below.

**Free-tier alternative** (if $5/mo Load Balancer not yet justified): Cloudflare DNS A records with manual swap. RTO becomes ~10-15 min (founder pages on PagerDuty / WhatsApp + executes runbook). Acceptable for first 6 months.

## Database failover — the hard part

Supabase free tier does not include read replicas. Paid Pro tier ($25/mo per project) does. Options:

### Option A: Supabase Pro + read replicas (recommended once revenue ≥ ₹50k MRR)

1. Upgrade poojly project to Pro tier.
2. Create read replicas in `ap-southeast-1` (Singapore) and `eu-central-1` (Frankfurt).
3. App reads from regional replica via `DATABASE_URL_READONLY_{region}` env var.
4. All writes go to Mumbai primary.
5. On Mumbai outage: founder promotes Singapore replica to primary via Supabase dashboard. Re-point app `DATABASE_URL` to new primary. **Manual step, ≈ 5-10 min**.

### Option B: Per-region Supabase projects with logical replication (free-tier path)

1. Create three separate Supabase projects: `darshya-bom`, `darshya-sin`, `darshya-fra`.
2. Set up `pglogical` replication from primary → replicas (free-tier supports outbound replication slot).
3. Replication lag typically < 1s on healthy network.
4. On Mumbai outage: founder runs `scripts/db/promote-replica.mjs <region>` which (a) marks replica as new primary, (b) updates Cloudflare worker secret with new `DATABASE_URL`, (c) triggers Render env redeploy.
5. **Caveat**: data conflicts if Mumbai writes after partition heals before promotion is reverted. Document as accepted risk for first year.

### Option C: Accept India-only availability for first year (do-nothing baseline)

If revenue stays sub-₹50k MRR and traffic stays < 5k DAU, the cost of multi-region failover exceeds the cost of a 1-2 hour outage. Document the explicit decision and revisit at next quarterly review.

**Recommendation as of Q4 2026**: Option C until ARR ≥ ₹25 lakh, then Option B for 6 months, then Option A at ARR ≥ ₹1 Cr.

## Render multi-region

Render supports multi-region but each region is a separate service (no built-in active-passive). Setup:

1. Create three Render Web Services: `darshya-api-bom`, `darshya-api-sin`, `darshya-api-fra`.
2. Each connects to the same git repo, same Dockerfile, same env vars except `DATABASE_URL` which points to the regional Supabase replica.
3. SIN + FRA services use Render's free tier "sleep after 15 min idle" since they are standby. Cold start ~30s acceptable for failover (added to RTO budget).
4. Health check endpoint at `/health` already exists in `apps/api/src/server.ts`.

**Free-tier note**: Three free Render services = 3 × 750 hr/mo allowance. SIN + FRA standbys consume nearly nothing because they sleep. Primary BOM consumes ~720 hr/mo today (existing baseline). No additional cost.

## Webhook handling

Razorpay and Stripe send webhooks to a single configured URL. Two options:

### Option W1: Cloudflare Worker fan-out (recommended)

A small Cloudflare Worker at `webhooks.darshya.online/razorpay` and `/stripe` receives the webhook, then:

1. Forwards to active region's API based on the Load Balancer's current primary.
2. If forward fails, queues the webhook in Cloudflare Queues for replay (Queues free tier: 1M ops/mo, plenty).
3. Returns 200 to PSP immediately to prevent retry storm.

Code skeleton at `apps/webhook-router/src/index.ts` (NEW package, ~80 LOC, edge runtime).

### Option W2: PSP-side multi-URL (Razorpay supports, Stripe does not natively)

Razorpay allows multiple webhook URLs per account. Configure all three regional URLs. Stripe requires the Worker approach.

For minimal lift: ship W1 Worker, point both PSPs at the Worker URL, retire any direct PSP→API webhook config.

## Static asset failover

Cloudflare R2 is already multi-region. Pages is already global edge. No additional work needed. Image upload writes hit a single R2 bucket which has automatic geo-replication.

## Runbook — manual failover procedure (for Option C / Option B early days)

When Mumbai region is confirmed down:

1. **Detect** (alert from uptime-pinger agent + Cloudflare health check email):
   - `https://api.darshya.online/health` returns non-200 for ≥ 3 consecutive minutes.
   - Verify via `curl -s -o /dev/null -w "%{http_code}" https://api.darshya.online/health` from two networks (mobile + wifi) to rule out local ISP issue.

2. **Decide region** (≤ 1 min):
   - Default to Singapore unless India devotee traffic is the only affected cohort and SG also down (rare).
   - If primary failure is Supabase (not Render): promote regional Supabase replica first, then proceed.

3. **Promote Supabase replica** (≤ 5 min):
   - Open Supabase dashboard for `darshya-sin` (or `darshya-fra`).
   - Run: `node apps/api/scripts/promote-replica.mjs sin` (script TBD per Option B).
   - Verify: `psql $NEW_DATABASE_URL -c 'SELECT count(*) FROM "User";'` returns ≥ baseline.

4. **Swap DNS** (≤ 2 min):
   - Cloudflare dashboard → DNS → `api.darshya.online` A record.
   - Change target to standby region's IP.
   - Confirm TTL = 60s.
   - OR: Cloudflare dashboard → Load Balancers → primary pool → mark unhealthy.

5. **Redeploy API to standby region** (≤ 3 min):
   - Render dashboard → `darshya-api-sin` (or `-fra`) → Settings → Environment → update `DATABASE_URL` to new primary.
   - Trigger Manual Deploy.
   - Wait for `/health` to return 200.

6. **Verify** (≤ 2 min):
   - `curl https://api.darshya.online/health` → 200
   - `curl https://api.darshya.online/api/v1/temples` → returns at least one temple row
   - Verify a Razorpay test webhook arrives (webhook router log)

7. **Communicate** (parallel to above):
   - Tweet from @darshya: "Brief outage resolved. We're back online — appreciate your patience 🙏."
   - In-app banner via PostHog feature flag `emergency_banner_message`.

8. **Post-incident** (within 24h):
   - Write incident report at `docs/incidents/YYYY-MM-DD-region-failover.md`.
   - Decide whether to fail back to Mumbai or promote SIN/FRA permanently.
   - If failing back: run reverse procedure, ensure logical replication has caught up.

**Total target RTO: ≤ 15 min** (matches KPI).

## Smoke test runbook (quarterly drill)

Once per quarter, founder runs a **planned failover drill** during off-peak (3 AM IST):

1. Schedule maintenance window. Post in #status Discord.
2. Mark Mumbai primary as unhealthy in Cloudflare LB.
3. Verify traffic flows to Singapore standby within target RTO.
4. Verify all 14 critical surfaces from `uptime-pinger` agent return 200.
5. Verify Razorpay test booking completes end-to-end.
6. Verify Supabase write to SIN replica succeeds.
7. Mark Mumbai healthy. Verify traffic returns to primary.
8. Write drill report at `docs/incidents/YYYY-MM-DD-failover-drill.md`.

This drill validates the runbook stays current. Skipping it for > 2 quarters = treat as failed (per OWASP/AWS Well-Architected guidance).

## Implementation roadmap (to be scheduled after founder approval)

| Phase | Effort | Trigger | Deliverables |
|---|---|---|---|
| Phase 0 — Document (this doc) | ~2h | Now | This handoff doc. |
| Phase 1 — Webhook router Worker | ~4h | Before Razorpay live KYC clears | `apps/webhook-router/` package, Cloudflare Worker deployed at `webhooks.darshya.online`. |
| Phase 2 — Standby Render services | ~3h | Anytime (no cost on free tier) | `darshya-api-sin` + `darshya-api-fra` services, env vars synced via shared Render env group. |
| Phase 3 — Cloudflare Load Balancer | ~2h | When ARR ≥ ₹50 lakh ($5/mo justified) | LB config + health checks + alerting webhook. |
| Phase 4 — Supabase Pro + replicas | ~6h | When ARR ≥ ₹1 Cr ($25/mo per region justified) | Read replicas in SIN + FRA, app config to use `DATABASE_URL_READONLY_*`. |
| Phase 5 — Promote-replica script | ~4h | Same as Phase 4 | `apps/api/scripts/promote-replica.mjs` + integration test in CI. |
| Phase 6 — Quarterly drill cron | ~2h | After Phases 1-5 ship | GH workflow that sends founder a reminder at start of each quarter. |
| Phase 7 — Documented incident review | ~1h | After first real or drill failover | Update this doc with lessons. |

**Total implementation budget: ~24 hours engineering + ~$30/mo recurring at full deployment.** Estimate of 32 hours in the roadmap item is conservative; reflects 8 hours of unknowns + 24 hours of known work.

## Decisions that require founder input

Founder cannot delegate these to the agent fleet:

1. **When to upgrade Supabase to Pro?** (Cost ₹2000/mo per project × 1-3 regions = ₹2-6k/mo). Recommend at ARR ≥ ₹50 lakh.
2. **When to enable Cloudflare Load Balancer?** (Cost $5/mo + per-query). Recommend at first paid Razorpay live transaction.
3. **Which standby goes online first — Singapore or Frankfurt?** Default Singapore for India + APAC NRI, Frankfurt for EU + US-East NRI.
4. **Drill cadence**: quarterly default, but festival weeks need higher cadence — monthly during Q4 calendar?
5. **Webhook router hosting**: Cloudflare Workers (free tier 100k requests/day) or fold into existing Pages middleware?

## Free-tier impact of Phase 0 (this doc only)

| Resource | Cost |
|---|---|
| CF Pages builds | 0 (docs-only commit, `[skip ci]`) |
| GH Actions | 0 |
| Render | 0 |
| Supabase | 0 |
| Anthropic tokens | 0 |

Total: **₹0**.

## Tripwires that should trigger this work

The orchestrator should bump R-Q4-E-014 priority from P2 → P0 when any of these fire:

1. Single Mumbai-region outage ≥ 30 min (verified via uptime-pinger reports).
2. Razorpay live transaction volume > ₹50k / day for 7 consecutive days.
3. NRI Stripe transactions > 100 / week.
4. Cloudflare Load Balancer pricing changes (re-evaluate).
5. Supabase free-tier replica support changes (re-evaluate).

## References

- Cloudflare Load Balancers docs: https://developers.cloudflare.com/load-balancing/
- Render region selection: https://render.com/docs/regions
- Supabase replication: https://supabase.com/docs/guides/platform/read-replicas
- AWS Well-Architected — Reliability Pillar (failover patterns, RTO/RPO terminology).
- Existing `apps/api/src/server.ts` `/health` endpoint already returns `{ status: "ok" }`.
- Existing `scripts/agents/uptime-pinger.mjs` detects outage in ≤ 3 min.

## Status (item stays in_progress)

Per project doctrine (R2 PR loss): items where KPI requires real infra spend + founder decisions stay `in_progress` until at least Phase 1 ships. This doc unblocks future implementation but is **scaffold only**. Status remains `in_progress`.
