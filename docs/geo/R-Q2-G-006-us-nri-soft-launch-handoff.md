# R-Q2-G-006 — US NRI soft launch (handoff)

> Item: R-Q2-G-006 · Category: geo · Priority: P1 · Owner: sales
> Status: **in_progress** (KPI gated on founder action — see § Founder gates)
> Ship batch: 2026-06-15 R4

## What shipped this round

| Layer | Artifact | Purpose |
|---|---|---|
| API | `apps/api/src/lib/pricing.ts` | Single source of truth for business rule #2 (NRI 9-10× INR). Centralizes the multiplier, exposes `computeNriPrice()` + `validateNriPriceBand()`. |
| API tests | `apps/api/src/lib/pricing.test.ts` | 9 vitest cases — multiplier default, override path, null/zero fallback, negative reject, band validation floor + ceiling. |
| Docs | `docs/geo/R-Q2-G-006-us-nri-soft-launch-handoff.md` | This handoff doc — gates, KPI tracking, follow-up tasks. |

Pre-existing (verified live, no rework needed):
- `apps/web/app/nri/page.tsx` — NRI Premium landing live since prior shipment. Hero + 6 benefits + 8-row comparison table + 6-FAQ + testimonial + EmailCapture(`source='nri-landing'`) + final CTA.
- `apps/web/components/StripeClientSecretCheckout.tsx` — clientSecret-only fallback shipped (P15 HANDOFF 2026-05-27). Full Stripe Elements Provider still parked as engineering item E9.
- `apps/api/src/routes/payments.ts` — USD branch via Stripe Payment Intents already wired (see `bookings.ts:910` `wantsUsd` logic + `services/booking.service.ts:236`).
- Prisma schema — `PujaType.nriPrice` Decimal(10,2) field exists (line 374). `User.isNri` boolean exists.

## Founder gates (blocking — KPI cannot move until cleared)

### Gate U2 — Stripe USD KYC
- **What**: Stripe account US business activation for charging USD via Payment Intents.
- **Who**: Founder only — requires business docs (EIN, business address proof, bank routing) that agents cannot generate.
- **Where**: https://dashboard.stripe.com/account/details — toggle "Activate USD payments" + submit US business profile.
- **Owner action**: ~30-45 min one-time submission. Stripe approves in 1-3 business days.
- **Verify**: After approval, `STRIPE_SECRET_KEY` already in Render env → first USD charge succeeds end-to-end. Curl `POST /api/v1/bookings/from-offering -d '{"currency":"USD",...}'` returns `paymentIntentClientSecret`.
- **Tracked in**: `docs/activation-gates.md` U2.

### Gate — First 100 paid USD users (KPI target)
- **What**: KPI metric `us_nri_paid_users` target: 100. Source: Supabase SQL: `SELECT COUNT(DISTINCT user_id) FROM "Booking" WHERE currency='USD' AND status='completed' AND created_at >= '2026-04-01'`.
- **Who**: Marketing-led — drive traffic to /nri via R-Q2-M-006 ($200/mo Google Ads US/UK/CA/AU).
- **Cannot agent-assign**: requires actual paying users (not a code task). Current: 0 / 100.
- **Tracked in**: `scripts/agents/roadmap/_kpi-supabase.mjs` runs daily, writes to `_kpi-state.json`.

## What good looks like (success criteria checklist)

- [ ] Stripe USD KYC live (gate U2 cleared by founder) — **founder action required**
- [x] `/nri` landing page live with Stripe Elements USD checkout fallback (`apps/web/app/nri/page.tsx`)
- [ ] First 100 paid USD users completed via Stripe (SQL count, target 100, current 0) — **traffic + time required**
- [x] 9-10× INR pricing rule centralized in `apps/api/src/lib/pricing.ts` — verifiable via `pricing.test.ts`
- [ ] EmailCapture `source='nri-landing'` converts ≥5% to paid (PostHog funnel) — **needs PostHog funnel ID paste in agent**

## Wire-up follow-ups (next batch, deferred for tight 20-min cap)

These are mechanical and safe to ship later — none block the KPI.

1. **bookings.ts re-import** — replace local `const NRI_USD_MULTIPLIER = 9` (line 826) with `import { NRI_INR_MULTIPLIER } from '../lib/pricing';`. Single-line change. ~2 min.
2. **temple-portal validator wiring** — call `validateNriPriceBand(basePriceInr, nriPriceUsd)` in `apps/api/src/routes/temple-portal.ts` create + update schemas. Catches mis-priced PujaType entries. ~5 min.
3. **PostHog funnel ID** — paste `NEXT_PUBLIC_POSTHOG_NRI_FUNNEL_ID` env var on CF Pages after creating the funnel in PostHog UI (steps: `Funnels > New > /nri page view → /upgrade view → /checkout/success`).
4. **Stripe Elements full Provider** — E9 carryover. Replace clientSecret-only fallback in `StripeClientSecretCheckout.tsx` with proper `<Elements stripe={stripePromise}>`. Higher conversion vs mailto fallback when JS-loaded.

## Sales agent runbook (R-Q2-M-006 alignment)

When Stripe KYC clears, kick off R-Q2-M-006 in parallel:
- $50/mo per geo × 4 geos (US/UK/CA/AU) = $200/mo total
- Target keywords: "nri puja booking", "send puja to india", "rudrabhishek nri", "satyanarayan katha online"
- Landing: `/nri` (this item) + `/gift` (R-Q1-N-001 already live)
- Track: PostHog funnel `nri-landing → /upgrade → /checkout/success` (target 5%+)
- Trip-wire: blended CAC > $40 by week 8 → fold to NRI-only SKU per `docs/roadmap-archive.md` strategy tripwires.

## Risk register

| Risk | Mitigation |
|---|---|
| Stripe holds funds 7-14 days for new US accounts | Founder pre-fund operating account; consult Stripe sales for accelerated payout if first 30-day volume > $5k. |
| INR-USD FX drift breaks 9-10× band | `INR_USD_INDICATIVE_RATE` constant in `pricing.ts` — refresh quarterly. Next review: 2026-09-15. |
| US tax nexus (sales tax on subscription) | Stripe Tax handles automatically once activated. No founder action beyond enabling Stripe Tax in dashboard. |
| GDPR/CCPA on EmailCapture | Existing site-wide cookie banner + DPDP §6 consent already covers. NRI users opt-in via Stripe checkout (lawful basis: contract). |

## Closing this item

Flip `status: shipped` + set `shipped_at` ONLY when:
1. Gate U2 cleared (Stripe USD KYC live) **AND**
2. KPI `us_nri_paid_users` ≥ 100 (verified via Supabase SQL) **AND**
3. PostHog funnel shows ≥5% conversion from `nri-landing` source

Until then, this item remains `in_progress`. Per R3 rules: do not auto-claim shipped on items where KPI requires founder action or actual paying users.

---

**Generated**: 2026-06-15 by R4 batch agent.
**Item spec**: `docs/roadmap/items/Q2/geo/006-us-nri-soft-launch-landing-page-stripe-usd-first-1.md`
