/**
 * Store cart/checkout totals — the browser half of the store pricing contract.
 *
 * COM-06 / S-09 (prod sweep 2026-08-12): the cart computed subtotal plus a
 * delivery fee plus a flat five-percent tax estimate, and put that on the
 * "Place Order - ₹733" button, while the API charged `Σ(price × qty)` = ₹698.
 * The displayed number was never the charged number, and the ₹49 shipping fee
 * was never collected on any sub-₹499 basket.
 *
 * The API now computes the same totals in apps/api/src/lib/store-pricing.ts and
 * REFUSES an order whose client total disagrees, so these two constants must
 * stay identical. A drift guard in the API suite
 * (src/lib/store-pricing.parity.test.ts) reads this file and fails if they
 * diverge.
 *
 * There is deliberately no tax line: the flat 5% "GST (est.)" applied to books
 * (nil-rated), brass and malas alike was never charged and never remitted, and
 * the business has no GSTIN. Prices are quoted tax-inclusive.
 */

export const FREE_DELIVERY_THRESHOLD_INR = 499;
export const DELIVERY_FEE_INR = 49;

export interface StoreOrderTotals {
  subtotalInr: number;
  deliveryFeeInr: number;
  totalInr: number;
}

/**
 * `waiveDelivery` is true only for a signed-in tester on the server's
 * QA_PAYER_EMAILS allowlist (lib/qa-pricing.ts). The API applies the same rule
 * from the account's email, so the page and the order agree.
 */
export function computeDeliveryFeeInr(subtotalInr: number, waiveDelivery = false): number {
  if (waiveDelivery) return 0;
  return subtotalInr >= FREE_DELIVERY_THRESHOLD_INR ? 0 : DELIVERY_FEE_INR;
}

export function computeStoreOrderTotals(
  items: { qty: number; unitPriceInr: number }[],
  opts: { waiveDelivery?: boolean } = {},
): StoreOrderTotals {
  const subtotalInr = items.reduce((sum, it) => sum + it.unitPriceInr * it.qty, 0);
  const deliveryFeeInr = computeDeliveryFeeInr(subtotalInr, opts.waiveDelivery === true);
  return { subtotalInr, deliveryFeeInr, totalInr: subtotalInr + deliveryFeeInr };
}
