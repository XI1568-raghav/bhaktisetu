# CFO Advisory — 2026-W44

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

> **Correction 2026-09-02 (`OPS-10`).** The §1 burn table listed **"Cloudflare Pages (web) | Free | `darshya.online` static + ISR | 500 builds/mo"** as the web host and **"Stripe (NRI) | Not provisioned | code path exists | 2.9% + 30¢ + 2% currency conv"** as a payment line, read Render's free allowance as 750 instance-hours *per service*, and closed with "Everything else is genuinely free-tier today." Verified reality: **Cloudflare Pages has not served the web tier since the 2026-07-08 cutover** — the web tier is the Render Docker service `darshya-web`, region `oregon` (`render.yaml:52-60`), and Cloudflare is DNS + edge proxy only, so there is no Pages build quota to budget against. **The Stripe rail was deleted from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`); no replacement international/NRI processor has been chosen, so **no fee or FX rate for one may appear in this memo** — Razorpay is the only live rail and settles **INR only**. And Render's 750 instance-hours are **per account**: two always-on free services need ~1,488 h, which suspended the account on **2026-08-17**. The rows below are corrected; the total is no longer "$0 forever".

## 1. Current monthly burn (verified)

| Service | Tier | Verified usage | What pushes it off free | Cost today |
|---|---|---|---|---|
| Render (API) | Free web service | 1 service (`api.darshya.online`), blueprint name `bhaktisetu` (`render.yaml:12`), region `oregon` (`render.yaml:15`) | **750 instance-hrs/mo per ACCOUNT, not per service** — with the web service below, two always-on services need ~1,488h and do **not** fit. Bandwidth 100GB/mo soft. `autoDeploy: false` (`render.yaml:28`). | $0 |
| Render (web) | Free web service | `darshya.online` — Docker service `darshya-web`, region `oregon`, Next standalone on Node (`render.yaml:52-60`) | Shares the **same account-wide 750 instance-hrs/mo** as the API row above — see the corrected total below. `autoDeploy: false` (`render.yaml:60`): a git push deploys nothing. | $0 |
| Cloudflare | Free | **DNS + edge proxy only** | n/a — no Pages project, no build quota | $0 |
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
| ~~Stripe (NRI)~~ | **Removed from the codebase 2026-08-11** | `[verify — Stripe was removed; the NRI rail is undecided]` | *Row corrected 2026-09-02 (`OPS-10`). It used to read "**Not provisioned** \| code path exists \| 2.9% + 30¢ + 2% currency conv". There is no Stripe code path left — every surviving mention in `apps/api/src` is a removal note (`lib/env.ts:45-46`, `services/payment.service.ts:2506-2517`, `routes/payments.ts:304`, `routes/subscriptions.ts:274`). **No replacement international/NRI processor has been chosen, so no fee, FX rate or vendor may be entered here.** Razorpay (row above) is the only live rail and it settles **INR only**.* | $0 |

**Total verified cash burn: ~₹83/mo (~$1)** — domain amortisation only. **[CORRECTED 2026-09-02, `OPS-10`. This sentence used to end "Everything else is genuinely free-tier today." It is not.** Render's free allowance is **750 instance-hours per account, not per service**. Both `bhaktisetu` (API) and `darshya-web` run always-on and need ~1,488 h between them, and **the Render account was suspended for exactly this on 2026-08-17**. A paid Render tier for at least one service is a required line item, not an optional one; this table's "$0" for the web row is therefore not sustainable. The rupee figure above still reflects domain amortisation only and has not been re-costed — `[verify]` the current Render bill before quoting any burn number.]

## 2. First-paid-tier triggers (ordered by what trips first)
```

## Recommended next-cycle prompts for Decision Agent
_Defer to founder — all CFO items either in flight or blocked_
