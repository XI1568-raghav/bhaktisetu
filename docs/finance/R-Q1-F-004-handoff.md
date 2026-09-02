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
>
> ---
>
> ## ⛔ DO NOT EXECUTE ANY STEP IN THIS DOCUMENT
>
> **Correction 2026-09-02 (`OPS-10`) — extends the note above.** Four further items would misfire if actioned:
>
> 1. **The code paths cited under "Why this is open" no longer exist.** `createStripeOrder()` and `handleStripeWebhook()` were deleted — `apps/api/src/services/payment.service.ts:2438-2450` is now their removal note, not their implementation. `apps/api/src/lib/stripe.ts` is gone. `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` were dropped from the env schema (`apps/api/src/lib/env.ts:45-46`). There is no demo mode to flip off, because there is no Stripe code left to flip.
> 2. **Phase 2 says to paste `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on Cloudflare Pages.** Cloudflare Pages stopped serving the web tier at the 2026-07-08 cutover — the web tier is the Render Docker service `darshya-web` (`render.yaml:52-60`, region `oregon`) and Cloudflare is DNS + edge proxy only. There is no Cloudflare Pages environment to paste into.
> 3. **"Render auto-redeploys on env change" is false.** Both services are `autoDeploy: false` (`render.yaml:28` API, `render.yaml:60` web). A deploy must be dispatched by hand — see `docs/runbooks/prod-rollback.md`.
> 4. **`apps/api/src/data/puja-skus.ts` does not exist**, so "already enforced in the puja SKU table" is not a live guarantee. Business rule #2 (NRI pricing 9-10× domestic) survives as data — `PujaType.nriPrice` in `apps/api/prisma/schema.prisma:446` — but it is **not charged at checkout today**.
>
> Razorpay is the only live rail and it settles INR only. No replacement international processor has been chosen, so every processor, rate, fee and FX figure below is `[verify]`. This document is retained as decision history; it is **not** a runbook.

**Status**: superseded — Stripe rail removed; no founder action remains
**Unblocks**: ~~U2 (Stripe live activation for NRI corridor)~~ — void; U2 cannot clear because the rail it names was removed `[verify — Stripe was removed; the NRI rail is undecided]`
**Spec**: `docs/finance/stripe-nri-kyc-spec.md`
**Roadmap item**: `docs/roadmap/items/Q1/finance/004-stripe-nri-kyc-us-uk-ca-au-activation.md`

## Why this is open (HISTORICAL — the code described below has been deleted)

`R-Q1-F-004` activates Stripe live for the NRI diaspora corridor (US / UK / CA / AU). Currently the platform runs Stripe in **demo mode** (`STRIPE_SECRET_KEY` absent on Render → `payment.service.ts#createStripeOrder` returns synthetic `pi_demo_*` intents). All engineering is shipped and gated on env-or-noop:

- `apps/api/src/services/payment.service.ts:996-1117` — `createStripeOrder()` reads `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` from env, falls back to demo intent when absent
- `apps/api/src/services/payment.service.ts:1131-1205` — `handleStripeWebhook()` verifies HMAC against `STRIPE_WEBHOOK_SECRET`, processes `payment_intent.succeeded` / `payment_intent.payment_failed` / `payment_intent.canceled`
- `apps/api/src/lib/stripe.ts` — `getStripe()` lazy-loads the SDK only when key present; `isStripeDemoMode` boolean exposed to clients
- Multi-currency math: NRI pricing 9-10× INR per `PROJECT_CONTEXT.md` business rule #2 — the rule survives as schema data (`PujaType.nriPrice`), but "already enforced in puja SKU table" describes no charge path that exists `[verify — Stripe was removed; the NRI rail is undecided]`

Founder must complete the live KYC submission (cannot be agent-driven — requires Stripe Dashboard login + business doc upload + bank verification).

## What founder must do — ⛔ SUPERSEDED, NO FOUNDER ACTION REMAINS

_Everything in this section targets a rail that no longer exists. It is preserved verbatim as decision history. Do not log into a processor dashboard, submit KYC, or paste any of these env vars._ `[verify — Stripe was removed; the NRI rail is undecided]`

### Phase 1 — Stripe India activation (preferred path, faster) — ⛔ DO NOT EXECUTE

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
6. **Multi-currency settlement** — enable USD/GBP/CAD/AUD → INR auto-convert (the "Stripe FX ~₹83.50/USD as of 2026-06" constant here is exactly the hardcoded-rate class RV-01 was rooted in — `[verify]`, never reuse it)
7. **Webhook endpoint** — add `https://api.darshya.online/api/v1/payment/stripe/webhook` (already implemented), copy the signing secret
8. **Wait** for Stripe approval (typically 5-10 business days for Section 8)

### Phase 2 — paste secrets on Render — ⛔ DO NOT EXECUTE

Once approved, paste 3 env vars on the API service (Render → Environment):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

~~Also paste `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...` on Cloudflare Pages (web) env for client checkout.~~ — **impossible**: Cloudflare Pages has not served the web tier since the 2026-07-08 cutover (web tier = Render Docker service `darshya-web`, `render.yaml:52-60`).

~~Render auto-redeploys on env change. Demo mode flips off automatically (no code change needed — `isStripeDemoMode` derives from key absence).~~ — **false on both counts**: both Render services are `autoDeploy: false` (`render.yaml:28` API, `render.yaml:60` web) and a deploy must be dispatched by hand per `docs/runbooks/prod-rollback.md`; and `isStripeDemoMode` no longer exists.

### Phase 3 — Q3 Option B evaluation (optional) — ⛔ DO NOT EXECUTE

After 90 days live, evaluate Stripe US LLC route (R-Q1-F-004d) if NRI conversion < 5% on USD checkout. Founder establishes Delaware LLC + Mercury bank account → migrates to `sk_live_us_...`. ~$300 + 30-60 day timeline.

## NRI pricing reference (for sanity-check post-activation)

| Puja | India INR | NRI USD (9-10x) |
|---|---|---|
| Satyanarayan | ₹3,000 | $30 |
| Rudrabhishek | ₹5,100 | $51 |
| Mahalakshmi | ₹4,100 | $41 |
| Custom yagna | ₹15,000+ | $150+ |

~~Already enforced in `apps/api/src/data/puja-skus.ts` via dual-currency fields.~~ — that file does not exist. `PujaType.nriPrice` is populated in the schema (`apps/api/prisma/schema.prisma:446`) but is **not charged at checkout today**. The USD amounts in this table are `[verify]`.

## Verification after activation — ⛔ SUPERSEDED (these endpoints no longer exist)

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
