/**
 * Pure helpers for cancelling a store order and reading its refund state.
 *
 * Authority is the API (apps/api/src/services/store-order-refund.service.ts):
 * PENDING / CONFIRMED / PROCESSING can be cancelled by the buyer; SHIPPED and
 * DELIVERED cannot. A cancelled order that was paid online carries the
 * `[refund-requested]` marker in its last status-history note and waits for an
 * admin; an admin decline writes `[refund-rejected] <reason>`.
 */

export const REFUND_REQUESTED_MARKER = '[refund-requested]';
export const REFUND_REJECTED_MARKER = '[refund-rejected]';
export const COURIER_NOTE_PREFIX = 'Courier: ';

const CANCELLABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];

export interface OrderHistoryEntry {
  status?: string;
  note?: string | null;
  changedAt?: string;
}

export interface OrderLike {
  status: string;
  paymentId?: string | null;
  trackingNumber?: string | null;
  statusHistory?: OrderHistoryEntry[];
}

export function canCancelStoreOrder(status: string): boolean {
  return CANCELLABLE.includes(status);
}

/** Text for the confirm step before the buyer cancels. */
export function storeCancelConfirmText(order: OrderLike): string {
  if (order.paymentId) {
    return 'If you have paid online, a refund request is sent to our team for approval. It is not refunded instantly.';
  }
  return 'You have not paid online, so nothing will be charged or refunded.';
}

/** Why Cancel is not offered, or null when it is offered. */
export function storeCancelBlockedReason(status: string): string | null {
  if (canCancelStoreOrder(status)) return null;
  if (status === 'SHIPPED') return 'Shipped orders can no longer be cancelled.';
  if (status === 'DELIVERED') return 'Delivered orders cannot be cancelled. Contact support for a return.';
  return null;
}

export type RefundState =
  | { kind: 'none' }
  | { kind: 'requested'; text: string }
  | { kind: 'declined'; text: string }
  | { kind: 'refunded'; text: string };

function lastNote(order: OrderLike): string {
  const h = order.statusHistory ?? [];
  const n = h[h.length - 1]?.note;
  return typeof n === 'string' ? n : '';
}

export function storeRefundState(order: OrderLike): RefundState {
  if (order.status === 'REFUNDED') return { kind: 'refunded', text: 'Refunded to your original payment method.' };
  if (order.status !== 'CANCELLED') return { kind: 'none' };
  const note = lastNote(order);
  if (note.startsWith(REFUND_REJECTED_MARKER)) {
    const reason = note.slice(REFUND_REJECTED_MARKER.length).trim();
    return { kind: 'declined', text: `Refund declined${reason ? `: ${reason}` : ''}. Contact support if you disagree.` };
  }
  // The marker is on the cancel entry; later entries (e.g. a decline) are checked above.
  const cancelEntry = [...(order.statusHistory ?? [])].reverse().find((e) => e.status === 'CANCELLED');
  if ((cancelEntry?.note ?? '').includes(REFUND_REQUESTED_MARKER)) {
    return { kind: 'requested', text: 'Refund requested, pending admin approval.' };
  }
  return { kind: 'none' };
}

/** Courier recorded by the seller when marking shipped (stored in the SHIPPED history note). */
export function courierFromHistory(order: OrderLike): string | null {
  const shipped = [...(order.statusHistory ?? [])].reverse().find((e) => e.status === 'SHIPPED');
  const note = shipped?.note ?? '';
  const m = /(?:^|\n)Courier: ([^\n]+)/.exec(note);
  return m ? m[1]!.trim() : null;
}

/** Compose the history note for a SHIPPED update; the courier rides in the note (the API has no courier field). */
export function composeShippedNote(note: string, courier: string): string {
  const parts: string[] = [];
  if (courier.trim()) parts.push(`${COURIER_NOTE_PREFIX}${courier.trim()}`);
  if (note.trim()) parts.push(note.trim());
  return parts.join('\n');
}

export function describeStoreCancelError(
  status: number,
  body: { error?: string; code?: string } | null,
): string {
  if (status === 409 && body?.code === 'order_not_cancellable') {
    return body.error ?? 'This order can no longer be cancelled.';
  }
  if (status === 401) return 'Please sign in again to cancel this order.';
  if (status === 403) return 'You can only cancel your own orders.';
  if (status === 404) return 'We could not find this order. Refresh the page.';
  return 'We could not cancel this order just now. Please try again.';
}

export function describeStoreCancelled(r: {
  alreadyCancelled?: boolean;
  refundStatus?: string;
  refundOwedInr?: number;
}): string {
  if (r.alreadyCancelled) return 'This order was already cancelled.';
  if (r.refundStatus === 'pending_admin_approval') {
    const amt = Number(r.refundOwedInr ?? 0);
    return `Order cancelled. Refund requested${amt > 0 ? ` (Rs ${amt.toLocaleString('en-IN')})` : ''}, pending admin approval.`;
  }
  return 'Order cancelled. Nothing was charged.';
}
