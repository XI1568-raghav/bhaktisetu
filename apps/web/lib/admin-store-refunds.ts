/**
 * Admin queue for refunds on cancelled store orders.
 *   GET  /store/orders/refunds/pending
 *   POST /store/orders/:id/refund         { reason?, refundType: 'policy' }
 *   POST /store/orders/:id/refund/reject  { reason }   (min 3 chars)
 */

import { API_BASE_URL, fetchWithTimeout } from './api-config';
import { UserFacingError } from './friendly-error';

export const MIN_REJECT_REASON = 3;

export interface PendingStoreRefund {
  id: string;
  orderNumber: string;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  customerName: string;
  items: { name: string; quantity: number }[];
  payment?: { id: string; status: string; amount: string; refundAmount?: string | null } | null;
  statusHistory?: { status?: string; note?: string | null; changedAt?: string }[];
}

export function validateRejectReason(reason: string): string | null {
  return reason.trim().length >= MIN_REJECT_REASON
    ? null
    : `Give a reason of at least ${MIN_REJECT_REASON} characters. The customer sees it.`;
}

/** What the admin is about to send back: the captured amount less anything already refunded. */
export function refundableAmount(o: PendingStoreRefund): number {
  const paid = Number(o.payment?.amount ?? o.totalAmount);
  const done = Number(o.payment?.refundAmount ?? 0);
  return Math.max(0, Math.round((paid - done) * 100) / 100);
}

export function describeApproveFailure(status: number, code: string | null, serverText: string | null): string {
  if (code === 'gateway_failed') return `The payment gateway refused the refund${serverText ? `: ${serverText}` : ''}. Nothing was refunded; you can retry.`;
  if (code === 'no_captured_payment') return 'There is no captured online payment on this order, so there is nothing to refund.';
  if (code === 'order_not_cancelled') return 'This order is not cancelled, so the policy owes no refund.';
  if (code === 'already_refunded' || code === 'payment_already_refunded') return 'This order was already refunded.';
  if (status === 403) return 'Admin access is required.';
  return serverText ?? 'We could not process this refund. Please try again.';
}

function headers(token: string | undefined): Record<string, string> {
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function readBody(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function listPendingStoreRefunds(token: string | undefined): Promise<PendingStoreRefund[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store/orders/refunds/pending`, { headers: headers(token) });
  const body = await readBody(res);
  if (!res.ok) {
    throw new UserFacingError(String(body?.error ?? 'Could not load the refund queue.'), res.status);
  }
  return ((body?.data as PendingStoreRefund[]) ?? []) as PendingStoreRefund[];
}

export async function approveStoreRefund(
  token: string | undefined,
  orderId: string,
  reason?: string,
): Promise<{ amountInr?: number; skipped?: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store/orders/${orderId}/refund`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ refundType: 'policy', ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
  });
  const body = await readBody(res);
  if (!res.ok) {
    const code = typeof body?.code === 'string' ? body.code : null;
    throw new UserFacingError(
      describeApproveFailure(res.status, code, typeof body?.error === 'string' ? body.error : null),
      res.status,
    );
  }
  const refund = (body?.refund ?? {}) as { amountInr?: number; skipped?: boolean };
  return { amountInr: refund.amountInr, skipped: refund.skipped };
}

export async function rejectStoreRefund(token: string | undefined, orderId: string, reason: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store/orders/${orderId}/refund/reject`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ reason: reason.trim() }),
  });
  const body = await readBody(res);
  if (!res.ok) {
    throw new UserFacingError(String(body?.error ?? 'We could not record the rejection.'), res.status);
  }
}
