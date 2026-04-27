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
| 1 | **Supabase project pause** | 7 days no activity | A quiet week kills the API. Set a daily cron ping (already have `daily-cron.yml`). |
| 2 | **Supabase Storage 1GB** | ~40 puja videos at 25MB each `[ASSUMPTION]` | First batch of priest-uploaded video proofs. R2 cutover is escape hatch. |
| 3 | **Resend 3K emails/mo** | ~3K signups + booking receipts/mo | $20/mo Pro = ~₹1,700 |
| 4 | **Render bandwidth 100GB/mo** | Heavy media or AI streaming | Switch to Bun/edge adapter, or move static media off API. |
| 5 | **Razorpay** | First booking | Per-txn only; no fixed cost. |
| 6 | **AWS IVS** | First live darshan stream | Hard tripwire — **do not enable IVS env until monetisation path exists.** |

## 3. Unit economics — one ₹2,500 puja booking

Schema (`schema.prisma:344-347`) stores `priceAmount`, `platformCommission`, `priestPayout` per booking. Default temple commission = 0.20 (`schema.prisma:648`). Pricing page advertises 10–30% temple/pandit rates.

Walk-through at **20% commission** (Basic plan / default temple):

| Line | ₹ |
|---|---:|
| Devotee pays | 2,500.00 |
| Razorpay fee 2% + 18% GST = 2.36% | −59.00 |
| Net to platform escrow | 2,441.00 |
| Platform commission (20% of gross) | 500.00 |
| Priest payout (80% of gross) | 2,000.00 |
| **Net platform take after Razorpay** | **441.00** |

At **30% (Free-tier pandit)**: net = ₹750 commission − ₹59 Razorpay = **₹691**.
At **15% (Pro plan)**: net = ₹375 − ₹59 = **₹316**.

**Effective contribution margin per ₹2,500 booking: 12.6–27.6% of GMV** depending on provider tier.

## 4. Path to first ₹10,000 revenue

At 20% commission and ₹2,500 average booking → ₹441 net per booking. **23 paid bookings = ₹10,143 net.**

Cross-checked against CMO's "first 100 users" target:

| Funnel | Rate `[ASSUMPTION]` | Count |
|---|---:|---:|
| First 100 signups | 100% | 100 |
| Browse a puja | 60% | 60 |
| Initiate checkout | 15% | 15 |
| Complete payment | 60% of initiators | **9 bookings** |

9 bookings × ₹441 = **₹3,969 net** from first 100 users. Need **~250 signups** to clear ₹10K, or push ASP to ₹5,000+ via NRI tier (9–10× domestic per CLAUDE.md rule 2) — at NRI ₹22,500 × 20% − 2.36% = **₹3,969 per booking**, so **3 NRI bookings = ₹10K**. NRI is the leverage point, not volume.

## 5. Free fundraising prep

| Artefact | Can produce today? | Blocker if not |
|---|---|---|
| One-pager (problem, market, traction, ask) | ✅ — `docs/INVESTOR_ONE_PAGER.md` exists, needs refresh against current state | none |
| Pitch deck | ✅ — `docs/PITCH_DECK.md` exists | needs traction slide once bookings exist |
| Live product demo URL | ✅ `darshya.online` | none |
| Founder bio + LinkedIn | ✅ | none |
| Cap table | ✅ — solo, 100% founder | none |
| TAM/SAM/SOM | ⚠️ partial | need NRI Hindu population × ARPU benchmark; AppsForBharat last raise/revenue |
| Unit economics page | ✅ this doc, §3 | none |
| Competitive matrix | ✅ `docs/competitor-matrix.md` | none |
| Traction / MoM growth chart | ❌ | **need first 30 days of paid bookings** |
| Cohort retention | ❌ | need 8 weeks of signups (steelman tripwire) |
| LTV / CAC | ❌ | need paid acquisition data; today is all organic |
| Financial model (24-mo P&L, 18-mo runway ask) | ⚠️ partial | needs pricing assumptions × conversion × cost ramp; can scaffold from §3 |
| YC application long-form answers | ✅ except "what have users said" | need 5 user quotes |
| Indian angel intro deck (Hindi/English) | ✅ | none |

**Producible today: 9 of 13.** True blockers are all "live the product first" — no money fixes them.

## 6. Spend-control tripwires

1. **Render egress > 80 GB/mo** (80% of 100GB free) → switch web to Cloudflare Pages-only origin, move media presigns direct to Supabase. Check weekly via Render dashboard.
2. **Supabase Storage > 800 MB** (80% of 1GB free) → cut over to Cloudflare R2 (10GB free, zero egress). `lib/r2.ts` is already R2-shaped — flip the adapter back. **Do NOT add a card to Supabase.**
3. **Razorpay payouts blocked > ₹50,000 in escrow** → priests not getting paid = trust collapse. Trigger weekly payout job + Aadhaar verification chase. (Not a cost tripwire — a reputational one bigger than any AWS bill.)

Bonus panic line: **anyone enables AWS IVS env vars** → Sentry alert + revert deploy. Live streaming is the only service in this stack that can produce a 4-figure surprise bill in a weekend.

## Numbers I made up

| Figure | Where | What would replace it |
|---|---|---|
| 25 MB per puja video | §2 #2 | First 10 actual priest video uploads — measure mean file size |
| ₹2,500 average booking | §3, §4 | Median `priceAmount` from first 30 `puja_bookings` rows |
| Funnel rates 60% / 15% / 60% | §4 | PostHog funnel: `landing → puja_view → checkout_start → payment_success` once 100 signups exist |
| 23 bookings to ₹10K | §4 | Actual blended commission rate weighted by provider plan mix |
| AppsForBharat NRI ARPU benchmark | §5 | Sri Mandir / VAMA disclosed ARPU or Crunchbase |
| "9 of 13 artefacts producible" | §5 | Hold an actual review of `INVESTOR_ONE_PAGER.md` and `PITCH_DECK.md` for staleness |
| Domain ~₹999/yr | §1 | Check actual Namecheap/GoDaddy invoice |
| Cohere "no hard cap" on free trial | §1 | Cohere billing dashboard once 10K embeddings backfilled |
