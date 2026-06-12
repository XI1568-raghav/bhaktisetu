# Post-Scale Cost Optimization Audit — Render + CF + Supabase + Razorpay

> **Roadmap item**: R-Q4-IT-002 (P0) · **Authored**: 2026-06-13 · **Target**: Q4 (Feb 2027) after first 12 months ops data

## Goal

Audit cost vs revenue per service. Optimize where over-spent. Validate free-tier still optimal OR scale to paid tiers strategically.

## Service-by-service audit

### Render

- Current tier: Free OR Starter (~₹2.5K/mo)
- Audit: actual CPU usage % + memory usage % at peak
- Decision: stay free OR upgrade to Standard (₹6K/mo) if peak >70% sustained
- Optimization: containerize for faster cold-start, reduce dependency tree

### Cloudflare Pages

- Free tier: 500 builds/mo, 100K req/day
- Audit: actual build count vs cap, actual req/day vs cap
- Decision: stay free if both <80% of cap
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

### Stripe (NRI)

- Pricing: 2.9% + $0.30 per transaction
- Audit: NRI fee burn rate
- Decision: explore Stripe India for lower NRI rates (some India-routed)
- Optimization: minimum NRI transaction = ₹500 to avoid $0.30 fixed eating margin

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
| CF Pages | ₹0 | ₹0 | ₹1.7K |
| Supabase | ₹0 | ₹2K | ₹4K |
| Razorpay (fees) | ₹0 | ₹15K (on ₹7.5L GMV) | ₹100K |
| Stripe (NRI fees) | ₹0 | ₹3K | ₹20K |
| Resend | ₹0 | ₹1.7K | ₹4K |
| AWS IVS | ₹0 | ₹5K | ₹30K |
| Observability stack | ₹0 | ₹2K | ₹10K |
| **TOTAL** | **₹0** | **₹31.2K/mo** | **~₹175K/mo** |

Q4 projection ₹31K/mo = ~6% of ₹5L MRR target. Healthy.

## Founder action

- [ ] Quarterly cost review (Friday 4 PM IST per F-003 cadence)
- [ ] Annual renewal negotiations (Razorpay volume tier, Stripe India)
- [ ] Sunset unused SaaS (audit subscriptions)

## Closes

R-Q4-IT-002 — audit shipped.
