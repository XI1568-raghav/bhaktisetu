# [SUPERSEDED] R-Q1-F-004 — Stripe NRI KYC (US/UK/CA/AU) Handoff

> SUPERSEDED / HISTORICAL — Stripe was removed from Darshya on 2026-08-11. Razorpay is the only
> gateway and INR the only currency. The endpoints, env vars, code paths and Cloudflare Pages
> targets below no longer exist; do not follow these steps. Kept for decision history only.
> See AUDIT.md.
>
> Two specifics worth naming, because acting on them would do real damage: the KYC business
> profile below says "Non-profit / Section 8 Company / Bhaktisetu Foundation", which is NOT the
> platform's entity — the live Razorpay account is an individual/proprietorship, and submitting
> the Section 8 documents would be a false declaration to a payment processor. And the FX
> constant "~₹83.50/USD" is the hardcoded-rate class that RV-01 was rooted in.

**Status**: superseded — Stripe rail removed; no founder action remains
**Unblocks**: U2 (Stripe live activation for NRI corridor)
**Spec**: `docs/finance/stripe-nri-kyc-spec.md`
**Roadmap item**: `docs/roadmap/items/Q1/finance/004-stripe-nri-kyc-us-uk-ca-au-activation.md`

## Why this is open

`R-Q1-F-004` activates Stripe live for the NRI diaspora corridor (US / UK / CA / AU). Currently the platform runs Stripe in **demo mode** (`STRIPE_SECRET_KEY` absent on Render → `payment.service.ts#createStripeOrder` returns synthetic `pi_demo_*` intents). All engineering is shipped and gated on env-or-noop:

- `apps/api/src/services/payment.service.ts:996-1117` — `createStripeOrder()` reads `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` from env, falls back to demo intent when absent
- `apps/api/src/services/payment.service.ts:1131-1205` — `handleStripeWebhook()` verifies HMAC against `STRIPE_WEBHOOK_SECRET`, processes `payment_intent.succeeded` / `payment_intent.payment_failed` / `payment_intent.canceled`
- `apps/api/src/lib/stripe.ts` — `getStripe()` lazy-loads the SDK only when key present; `isStripeDemoMode` boolean exposed to clients
- Multi-currency math: NRI pricing 9-10× INR per `PROJECT_CONTEXT.md` business rule #2 (already enforced in puja SKU table)

Founder must complete the live KYC submission (cannot be agent-driven — requires Stripe Dashboard login + business doc upload + bank verification).

## What founder must do

### Phase 1 — Stripe India activation (preferred path, faster)

1. **Login Stripe Dashboard** at https://dashboard.stripe.com — create account if not present, use founder@darshya.online (or current ops email)
2. **Settings → Activate Account** — submit the live mode application
3. **Business profile** — select "Non-profit / Section 8 Company"
4. **Upload docs** (same set as Razorpay live KYC R-Q1-F-003):
   - MoA + AoA of Bhaktisetu Foundation
   - 12A + 80G registration certificates
   - PAN card (entity)
   - Cancelled cheque + bank statement (last 3 months, HDFC current account)
   - Director KYC: Aadhaar + PAN + selfie
5. **Country activation** — enable India + US + UK + CA + AU
6. **Multi-currency settlement** — enable USD/GBP/CAD/AUD → INR auto-convert (Stripe FX ~₹83.50/USD as of 2026-06)
7. **Webhook endpoint** — add `https://api.darshya.online/api/v1/payment/stripe/webhook` (already implemented), copy the signing secret
8. **Wait** for Stripe approval (typically 5-10 business days for Section 8)

### Phase 2 — paste secrets on Render

Once approved, paste 3 env vars on the API service (Render → Environment):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Also paste `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...` on Cloudflare Pages (web) env for client checkout.

Render auto-redeploys on env change. Demo mode flips off automatically (no code change needed — `isStripeDemoMode` derives from key absence).

### Phase 3 — Q3 Option B evaluation (optional)

After 90 days live, evaluate Stripe US LLC route (R-Q1-F-004d) if NRI conversion < 5% on USD checkout. Founder establishes Delaware LLC + Mercury bank account → migrates to `sk_live_us_...`. ~$300 + 30-60 day timeline.

## NRI pricing reference (for sanity-check post-activation)

| Puja | India INR | NRI USD (9-10x) |
|---|---|---|
| Satyanarayan | ₹3,000 | $30 |
| Rudrabhishek | ₹5,100 | $51 |
| Mahalakshmi | ₹4,100 | $41 |
| Custom yagna | ₹15,000+ | $150+ |

Already enforced in `apps/api/src/data/puja-skus.ts` via dual-currency fields.

## Verification after activation

1. Curl `POST https://api.darshya.online/api/v1/payment/stripe/order` with a valid NRI booking → expect `client_secret: pi_live_...` (NOT `pi_demo_*`)
2. Visit `https://darshya.online/checkout/[bookingNumber]` from US IP / VPN → Stripe Elements should render with live USD price
3. Test mode card `4242 4242 4242 4242` will **fail** in live mode — use Stripe's live-mode test cards or run a real $1 charge then refund
4. Verify webhook firing: trigger payment → check Stripe Dashboard → Events → `payment_intent.succeeded` reaches our endpoint with HTTP 200

## Closes

R-Q1-F-004 (agent portion — spec + handoff + env-or-noop code path). Founder action (KYC submission + Render env paste) closes item end-to-end. After Phase 2 env paste:

1. Update `kpi.current` to `1` in `docs/roadmap/items/Q1/finance/004-stripe-nri-kyc-us-uk-ca-au-activation.md`
2. Flip frontmatter `status: shipped` + add `shipped_at: <date>`
3. Add to `docs/roadmap/_manual-kpis.yml`: `stripe_live_active: 1`

## Engineering follow-ups (tracked, not blockers)

- R-Q1-F-004b: per-geo checkout flow selector (Razorpay default IN, Stripe default non-IN) — light JS in `apps/web/app/checkout/[bookingNumber]/page.tsx`
- R-Q1-F-004c: USD pricing table per puja (already partial in `puja-skus.ts`, audit for coverage)
- R-Q1-F-004d: Q3 Stripe US LLC evaluation gate (revenue-triggered)
