/**
 * Total-line wording for a store order, from the `paymentStatus` the API adds in
 * serializeOrder (null = no payment on file, e.g. COD). Mirrors
 * apps/web/app/store/orders/page.tsx so both surfaces say the same word and an
 * unpaid or cancelled order never reads "paid".
 */
export function storeOrderTotalLabel(status: string, paymentStatus: string | null): string {
  if (paymentStatus === 'captured' || paymentStatus === 'partially_refunded') return 'Total paid';
  if (paymentStatus === 'refunded') return 'Total (refunded)';
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'Total';
  if (paymentStatus === null) return 'Total (not paid online)';
  return 'Total (payment pending)';
}
