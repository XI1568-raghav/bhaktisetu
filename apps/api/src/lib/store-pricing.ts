/**
 * Server-authoritative store order totals.
 *
 * COM-06 / S-09 (prod sweep 2026-08-12): the checkout screen computed
 * `subtotal + deliveryFee + 5% "GST"` in the browser, showed that number on
 * the Place Order button, and POSTed it — while the server recomputed
 * `Σ(unitPrice × qty)` with neither line and charged THAT. So the ₹49 shipping
 * fee on every sub-₹499 basket was never collected, and the checkout screen
 * disagreed with the order record and with Razorpay.
 *
 * One source of truth lives here. The mirror the browser needs to render a
 * pre-order preview is apps/web/lib/store-pricing.ts; store-pricing.parity.test.ts
 * reads that file and fails if the two ever drift.
 *
 * NO TAX LINE. The audit's other half: the 5% figure was the code's own
 * "GST estimate" — one flat rate over books (nil-rated), brass idols and malas
 * alike — displayed by a business that has no GSTIN. Quote tax-inclusive
 * prices (the Indian retail norm) until a GSTIN and per-HSN rates exist.
 */

export const FREE_DELIVERY_THRESHOLD_INR = 499;
export const DELIVERY_FEE_INR = 49;

export interface StoreOrderTotals {
  subtotalInr: number;
  deliveryFeeInr: number;
  totalInr: number;
}

export function computeDeliveryFeeInr(subtotalInr: number): number {
  return subtotalInr >= FREE_DELIVERY_THRESHOLD_INR ? 0 : DELIVERY_FEE_INR;
}

/**
 * @param items unit prices already resolved from the catalogue — never the
 *              client's `priceAtPurchase`.
 */
export function computeStoreOrderTotals(
  items: { qty: number; unitPriceInr: number }[],
): StoreOrderTotals {
  const subtotalInr = items.reduce((sum, it) => sum + it.unitPriceInr * it.qty, 0);
  const deliveryFeeInr = computeDeliveryFeeInr(subtotalInr);
  return { subtotalInr, deliveryFeeInr, totalInr: subtotalInr + deliveryFeeInr };
}
