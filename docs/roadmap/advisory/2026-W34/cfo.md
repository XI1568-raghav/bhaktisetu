# CFO Advisory — 2026-W34

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 16
- Planned: 0
- In progress: 11
- Shipped: 5
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
_None ready (DAG blocked or all in progress)_

## Founder-blocked
- R-Q1-F-003 blocked by U1: Razorpay live KYC submission for domestic real payments
- R-Q1-F-004 blocked by U2: Stripe NRI KYC (US/UK/CA/AU activation)
- R-Q2-F-001 blocked by design_send_investors: Pre-seed pitch deck v2 — unit economics + 12mo financial model
- R-Q3-F-001 blocked by U4: Pre-seed round close — $250K-$500K raised + SAFEs signed + bank wire received
- R-Q4-F-001 blocked by U4: Seed round close — $1.5M-$3M raised + SAFEs/SHA signed + bank wire received

## Live KPIs (this role)
_No matching KPIs cached yet — run orchestrator first cycle_

## Dept doctrine (top 30 lines of 03-cfo.md)
```
# CFO Memo — Darshya money map (2026-04-27)

Solo founder, $0 budget, pre-revenue. Everything below is reconciled against `apps/api/.env.example`, `apps/web/lib/pricing.ts`, `apps/api/prisma/schema.prisma`, and `docs/launch-state.md`. Numbers in `[ASSUMPTION]` are flagged at the end.

## 1. Current monthly burn (verified)

| Service | Tier | Verified usage | What pushes it off free | Cost today |
|---|---|---|---|---|
| Render (API) | Free web service | 1 service (`api.darshya.online`) | 750 instance-hrs/mo (one always-on service = 720h, fits). Service spins down after 15 min idle. Bandwidth 100GB/mo soft. | $0 |
| Cloudflare Pages (web) | Free | `darshya.online` static + ISR | 500 builds/mo, unlimited requests/bandwidth | $0 |
| Supabase (Postgres + Storage + Auth) | Free | DB + `darshya-media` bucket (R2 swap, see `docs/launch-state.md`) | 500MB DB / 1GB Storage / 2GB egress / 50K MAU. Project pauses after 7 days inactivity. | $0 |
| Resend (email) | Free | magic-link, booking, donation receipts | 3,000 emails/mo, 100/day. Above: $20/mo Pro (50K) | $0 |
| Cohere (embeddings) | Trial | `embed-multilingual-v3` for semantic search + backfill | 1,000 calls/min trial; production = $0.10/1M tokens. Free trial, no hard cap published. | $0 |
| Sentry | Developer free | errors web + api | 5K errors/mo, 10K performance units | $0 |
| PostHog | Free | product analytics | 1M events/mo, 5K session recordings | $0 |
| Cloudflare Web Analytics | Free | edge beacon (auto-injected) | unlimited | $0 |
| Groq (Llama 3.3 70B) | Free | Pandit AI chat, sankalp gen | rate-limited (30 req/min, 14.4K/day on free); no $ until paid tier | $0 |
| Razorpay | Pay-per-txn | code wired, KYC pending | 2% + 18% GST = 2.36% per successful txn. No monthly fee. | $0 (no txns yet) |
| Domain `darshya.online` | Annual | already paid | renewal ~₹999/yr | ~₹83/mo amortised |
| GitHub Actions cron | Free | `daily-cron.yml` 1×/day | 2,000 min/mo on private repos. Job is seconds. | $0 |
| AWS IVS (live darshan) | **Not provisioned** | env unset | $0.20/hr ingest + viewer egress. **First stream = first bill.** | $0 |
| Cloudflare R2 | **Not used** | swapped to Supabase Storage | n/a | $0 |
| Stripe (NRI) | **Not provisioned** | code path exists | 2.9% + 30¢ + 2% currency conv | $0 |

**Total verified cash burn: ~₹83/mo (~$1)** — domain amortisation only. Everything else is genuinely free-tier today.

## 2. First-paid-tier triggers (ordered by what trips first)

| # | Service | Threshold | Trigger event |
|---|---|---|---|
```

## Recommended next-cycle prompts for Decision Agent
_Defer to founder — all CFO items either in flight or blocked_
