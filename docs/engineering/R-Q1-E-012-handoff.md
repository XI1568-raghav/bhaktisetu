# R-Q1-E-012 — Embedded Stripe Elements full Provider (E9 carry) — handoff

**Status**: in_progress (scaffold + integration shipped previously; founder-action required to confirm KPI)
**Branch**: `engineering/R-Q1-E-012-batch-2026-06-15-r4`
**Quarter**: Q1 / month 2
**Priority**: P2
**Founder blocker**: U2 (Stripe NRI KYC must be active in live mode before a real 4242 test-card pay can be confirmed end-to-end through the Razorpay-routed flow, OR Stripe test-mode publishable key configured).

## Why this is a verification-only item

All four success criteria in the spec are already implemented in the codebase. This handoff captures the audit trail so the next reviewer doesn't re-do the work.

### Spec checklist

1. **`@stripe/stripe-js` + `@stripe/react-stripe-js` packages added to `apps/web`** — ✓
   - `apps/web/package.json` declares:
     - `"@stripe/react-stripe-js": "^2.9.0"`
     - `"@stripe/stripe-js": "^4.10.0"`
2. **`StripeClientSecretCheckout` wrapped in Elements provider with PaymentElement** — ✓
   - `apps/web/components/StripeClientSecretCheckout.tsx` (lines 41–88) renders a full `<Elements stripe={promise} options={{ clientSecret, appearance: { theme: 'stripe', variables: {...} } }}>` wrapping `<CheckoutForm/>`.
   - `<PaymentElement options={{ layout: { type: 'tabs' }, wallets: { applePay: 'auto', googlePay: 'auto' } }}/>` renders inside the form.
   - `stripe.confirmPayment({ elements, confirmParams: { return_url } })` is wired on submit, supporting SCA + return-URL flow.
3. **1 successful test card 4242-4242 payment on the checkout offering page** — ⏳ founder-action
   - The integration is wired into `apps/web/app/checkout/offering/page.tsx` (line 21 import; line 682 component mount within the `clientSecret`-only branch).
   - **Path divergence note**: spec wording references `/checkout/offering/[offeringId]` (dynamic path segment). Current implementation uses query-driven `/checkout/offering?offeringId=...&priestId=...` because the booking flow needs both `offeringId` + `priestId` in one request. Functionally equivalent for KPI purposes; can be refactored to a true segment route in a later round if SEO insists.
   - To confirm KPI, founder needs to:
     1. Ensure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in Cloudflare Pages env (test-mode `pk_test_...` is sufficient for the 4242 case).
     2. Trigger a booking on `/checkout/offering?offeringId=<id>&priestId=<id>` that returns a clientSecret-only intent (no hosted `checkoutUrl`).
     3. Submit the 4242-4242-4242-4242 card via the embedded form.
     4. Verify success page lands on `/checkout/success?ref=<paymentIntentId>&bk=<bookingNumber>`.
4. **mailto fallback retained for Stripe.js load failure** — ✓
   - `StripeClientSecretCheckout` lines 44–66 render the amber fallback card with `onMailtoFallback` callback when `loadStripe` returns null (no `PK`) OR when the Stripe script fails to attach.
   - The parent `checkout/offering/page.tsx` (line 689) wires `onMailtoFallback` to compose a `mailto:support@darshya.online?subject=Booking ${bk}&body=...`.

## Why status stays `in_progress`

Per repo conventions (R2 lost 4 PRs to auto-claiming `shipped` on items requiring founder action), KPI `stripe_elements_embedded` = 1 requires an actual paid test-card confirmation observed in the Stripe dashboard. The code is ready; the founder must do the live verify and flip status to `shipped` once the 4242 success page renders.

## No code change in this PR

This PR ships handoff documentation only. The implementation was shipped in the previous round (E9 in HANDOFF 2026-05-27 batch and reaffirmed in HANDOFF 2026-05-28 Sprint 3.2 commit `6027a60`). No edits to `apps/web/components/StripeClientSecretCheckout.tsx` or `apps/web/app/checkout/offering/page.tsx` are required.

## Next steps (founder)

1. Confirm `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in CF Pages (test or live).
2. Walk a 4242 card through `/checkout/offering?offeringId=...&priestId=...`.
3. On success, update the roadmap item:
   - `status: shipped`
   - `shipped_at: <ISO timestamp>`
   - `kpi.current: 1`
4. Optionally: refactor the route to true `[offeringId]` segment if SEO/parity with spec wording matters.

## Closes

Q-C-<ts>-R-Q1-E-012
