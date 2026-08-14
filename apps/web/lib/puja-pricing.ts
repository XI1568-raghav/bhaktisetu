/**
 * Puja checkout pricing — the client-side mirror of the server's fee schedule.
 *
 * CM-03 (prod sweep 2026-08-12): every marketing surface advertised a puja at
 * ₹1,100 and the wizard only revealed ₹1,151 / ₹1,301 at step 3 of 4, while the
 * homepage trust strip promised "₹0 hidden fees". The fees are not phantom —
 * apps/api/src/services/booking.service.ts folds BOTH of them into
 * `priceAmount`, and the Razorpay order is minted from that — so the devotee
 * really is charged them. The fix is therefore disclosure, not deletion.
 *
 * ⚠ THE API IS THE SOURCE OF TRUTH. These two numbers exist here only so the
 * UI can show the buyer what the server will charge. If they drift, the price
 * on screen stops matching the amount collected. `__tests__/booking-fee-
 * disclosure.test.ts` parses the API constants and asserts equality, so drift
 * fails CI rather than reaching a customer.
 *
 * Server counterparts:
 *   apps/api/src/services/booking.service.ts → PLATFORM_FEE_INR
 *   apps/api/src/services/booking.service.ts → PRASAD_DELIVERY_FEE_INR
 */

/** Flat platform fee added to every puja booking. */
export const PLATFORM_FEE_INR = 51;

/** Added only when the devotee opts into prasad delivery. */
export const PRASAD_DELIVERY_FEE_INR = 150;

/**
 * What the devotee will actually be charged.
 *
 * A zero base price means no temple/offering has been chosen yet — in that
 * state we must show ₹0 rather than a bare ₹51, which would read as a fee
 * charged for nothing.
 */
export function pujaTotalInr(basePriceInr: number, wantsPrasad: boolean): number {
  if (!basePriceInr || basePriceInr <= 0) return 0;
  return basePriceInr + PLATFORM_FEE_INR + (wantsPrasad ? PRASAD_DELIVERY_FEE_INR : 0);
}

/** Indian digit grouping (1,301 / 2,25,000) — used everywhere in the funnel. */
export function formatInr(amount: number): string {
  return amount.toLocaleString('en-IN');
}

/**
 * One-line disclosure for surfaces that advertise a "from" price — the puja
 * card, the detail hero, the temple compare row. Keeps the wording identical
 * everywhere so the buyer sees the same sentence at every step.
 */
export function feeDisclosureLine(basePriceInr: number): string {
  return `+ ₹${formatInr(PLATFORM_FEE_INR)} platform fee · ₹${formatInr(
    pujaTotalInr(basePriceInr, false),
  )} total`;
}
