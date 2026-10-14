/**
 * Slice L: server-side confirmation that the payment a signed /verify refers to really is
 * for the order, amount and currency we opened. The HMAC proves the pair
 * (order_id|payment_id) came from the gateway, not what was paid. Used by the donation and
 * consultation verify routes when REAL credentials are configured (callers skip it in demo
 * mode). The client passed in must already carry the 15s timeout (withGatewayTimeout).
 *
 * verdict 'mismatch'    -> do NOT confirm, flag for admin review.
 * verdict 'unavailable' -> the fetch itself failed; the caller falls back to the signature
 *                          result (a gateway blip must not strand a paid devotee) and logs.
 */
export interface PaymentFetcher {
  payments: { fetch: (id: string) => Promise<unknown> };
}

export type GatewayCheck =
  | { verdict: 'ok' }
  | { verdict: 'mismatch'; reason: string }
  | { verdict: 'unavailable'; reason: string };

export async function checkGatewayPayment(
  client: PaymentFetcher | null | undefined,
  expected: { paymentId: string; orderId: string | null; amountInr: number; currency?: string | null },
): Promise<GatewayCheck> {
  if (!client) return { verdict: 'unavailable', reason: 'no-client' };
  let p: { order_id?: string; amount?: number | string; currency?: string; status?: string } | null;
  try {
    p = (await client.payments.fetch(expected.paymentId)) as typeof p;
  } catch (err) {
    const e = err as { statusCode?: number; error?: { description?: string }; message?: string };
    // A definite "no such payment" from the gateway is a mismatch, not an outage.
    if (e?.statusCode === 400 || e?.statusCode === 404) {
      return { verdict: 'mismatch', reason: `payment not found at gateway (${e.statusCode})` };
    }
    return { verdict: 'unavailable', reason: e?.error?.description ?? e?.message ?? 'fetch failed' };
  }
  if (!p || typeof p !== 'object') return { verdict: 'unavailable', reason: 'empty response' };
  if (expected.orderId && p.order_id !== expected.orderId) {
    return { verdict: 'mismatch', reason: 'order id differs at gateway' };
  }
  const wantPaise = Math.round(expected.amountInr * 100);
  if (Number(p.amount) !== wantPaise) {
    return { verdict: 'mismatch', reason: `amount differs at gateway (expected ${wantPaise}, got ${p.amount})` };
  }
  if ((p.currency ?? 'INR') !== (expected.currency ?? 'INR')) {
    return { verdict: 'mismatch', reason: `currency differs at gateway (${p.currency})` };
  }
  if (p.status && p.status !== 'captured' && p.status !== 'authorized') {
    return { verdict: 'mismatch', reason: `payment status at gateway is ${p.status}` };
  }
  return { verdict: 'ok' };
}
