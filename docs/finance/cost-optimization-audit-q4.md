# Post-Scale Cost Optimization Audit — Render + CF + Supabase + Razorpay

> **Roadmap item**: R-Q4-IT-002 (P0) · **Authored**: 2026-06-13 · **Target**: Q4 (Feb 2027) after first 12 months ops data

> **Correction 2026-09-02 (`OPS-10`).** Two premises in this audit were false.
>
> 1. It costed a **"Stripe (NRI)"** line at "2.9% + $0.30 per transaction" and a Q4/Y2 fee burn, and set a founder action to "explore Stripe India for lower NRI rates". **Stripe was removed from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`, `apps/api/src/services/payment.service.ts:2438-2450`). Razorpay is the only live rail and it settles INR only; no replacement international processor has been chosen, so both the processor and its rate are unknown. The lane is kept below with its structure intact and the rate marked `[verify]` — re-run the model once the owner names the rail; do not carry the 2.9% + $0.30 figure over to a different processor.
>
> 2. It audited **"Cloudflare Pages"** as the web host against its "500 builds/mo, 100K req/day" free tier. Cloudflare Pages stopped serving the web tier at the 2026-07-08 cutover — the web tier is the Render Docker service `darshya-web` (`render.yaml:52-60`, region `oregon`) and Cloudflare is DNS + edge proxy only. The Pages build/request caps no longer describe anything we run.

## Goal

Audit cost vs revenue per service. Optimize where over-spent. Validate free-tier still optimal OR scale to paid tiers strategically.

## Service-by-service audit

### Render

- Current tier: Free OR Starter (~₹2.5K/mo)
- Audit: actual CPU usage % + memory usage % at peak
- Decision: stay free OR upgrade to Standard (₹6K/mo) if peak >70% sustained
- Optimization: containerize for faster cold-start, reduce dependency tree

### Cloudflare (DNS + edge proxy — **not** Pages)

- _Corrected 2026-09-02: this section was headed "Cloudflare Pages" and its free tier given as "500 builds/mo, 100K req/day". Pages has not served the web tier since the 2026-07-08 cutover to the Render Docker service `darshya-web` (`render.yaml:52-60`); Cloudflare now does DNS + edge proxy only, so the Pages build cap is not a quantity we consume._
- Free tier: `[verify]` — the applicable caps are the Cloudflare DNS/proxy plan limits, not the Pages ones
- Audit: `[verify]` actual proxied req/day vs the plan cap (build count no longer applies)
- Decision: stay free if usage <80% of cap
- Optimization: `[skip ci]` discipline, CF Workers KV cache for hot reads

### Supabase Postgres

- Free tier: 500MB DB, 50K MAU, 5GB transfer/mo
- Audit: actual DB size, MAU, transfer
- Decision: upgrade to Pro (₹2K/mo) if any metric >80%
- Optimization: archive old bookings (>2 years), prune logs aggressively

### Razorpay

- Pricing: 2% per transaction (NRI 3%)
- Audit: total processing fees vs platform revenue
- Decision: negotiate with Razorpay for volume tier (>₹50L/yr = potential discount)
- Optimization: Razorpay Route for split payouts (no extra fee)

### NRI / international rail — processor undecided `[verify — Stripe was removed; the NRI rail is undecided]`

- _Corrected 2026-09-02: this section was headed "Stripe (NRI)". The model shape below is sound — a per-transaction percentage plus a fixed per-transaction component — only the processor and the numbers are unknown._
- Pricing: `[verify]`% per transaction + `[verify]` fixed per transaction (the removed Stripe rail was modelled at 2.9% + $0.30; that figure belongs to Stripe and must not be reused for a different processor)
- Audit: NRI fee burn rate — `[verify]`, nothing is billed on this lane today
- Decision: `[verify]` — an international processor must be chosen before any rate comparison is possible
- Optimization: a minimum NRI transaction size still applies as a structure, sized so the chosen rail's fixed component does not eat the margin (the Stripe-era version of this line was "minimum NRI transaction = ₹500 to avoid $0.30 fixed eating margin") `[verify]`

### Resend

- Free tier: 100 emails/day
- Audit: actual daily sends + bounce rate
- Decision: upgrade to ₹1.7K/mo for 50K/mo if hitting cap regularly
- Optimization: batch transactional emails, use WA where possible (post-U7)

### Anthropic / Groq

- Current: free tier OR Blackbox proxy
- Audit: orchestrator + sub-agent token spend
- Decision: stay free if cycles work; else evaluate paid tier
- Optimization: signal-context trimmer already in place (R-Q1-F-D fix)

### Render IVS / AWS

- For live darshan streaming
- Current: not yet integrated
- Audit pre-launch: pricing per minute of stream
- Optimization: use CDN replay for non-live aarti playback (cheaper)

## Total cost projection

| Service | Current | Q4 projected | Y2 ceiling |
|---|---|---|---|
| Render | ₹0 | ₹2.5K | ₹6K |
| Cloudflare (DNS + edge, **not** Pages) `[verify]` | ₹0 | ₹0 | ₹1.7K |
| Supabase | ₹0 | ₹2K | ₹4K |
| Razorpay (fees) | ₹0 | ₹15K (on ₹7.5L GMV) | ₹100K |
| NRI rail fees — processor undecided `[verify]` | ₹0 | ₹3K | ₹20K |
| Resend | ₹0 | ₹1.7K | ₹4K |
| AWS IVS | ₹0 | ₹5K | ₹30K |
| Observability stack | ₹0 | ₹2K | ₹10K |
| **TOTAL** | **₹0** | **₹31.2K/mo** | **~₹175K/mo** |

Q4 projection ₹31K/mo = ~6% of ₹5L MRR target. Healthy.

## Founder action

- [ ] Quarterly cost review (Friday 4 PM IST per F-003 cadence)
- [ ] Annual renewal negotiations (Razorpay volume tier) `[verify — Stripe was removed; the NRI rail is undecided]`
- [ ] Sunset unused SaaS (audit subscriptions)

## Closes

R-Q4-IT-002 — audit shipped.
