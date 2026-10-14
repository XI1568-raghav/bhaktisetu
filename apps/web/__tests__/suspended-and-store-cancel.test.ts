import { describe, expect, it } from 'vitest';
import {
  isSuspendedBody,
  suspendedLoginHref,
  suspendedLoginMessage,
  suspensionReason,
} from '../lib/suspended-notice';
import { blockUpdates } from '../lib/admin-block';
import {
  canCancelStoreOrder,
  composeShippedNote,
  courierFromHistory,
  describeStoreCancelError,
  describeStoreCancelled,
  storeCancelBlockedReason,
  storeCancelConfirmText,
  storeRefundState,
} from '../lib/store-order-cancel';
import { refundableAmount, validateRejectReason, describeApproveFailure } from '../lib/admin-store-refunds';

describe('suspended notice', () => {
  it('recognises the API wordings', () => {
    expect(isSuspendedBody(403, { error: 'Forbidden', message: 'This account has been suspended.' })).toBe(true);
    expect(isSuspendedBody(403, { message: 'Account suspended: fraud' })).toBe(true);
    expect(isSuspendedBody(403, { error: 'Forbidden', message: 'Not authorized' })).toBe(false);
    expect(isSuspendedBody(401, { message: 'Account suspended' })).toBe(false);
  });
  it('extracts the reason and builds the login message', () => {
    expect(suspensionReason({ message: 'Account suspended: chargeback abuse' })).toBe('chargeback abuse');
    expect(suspensionReason({ message: 'This account has been suspended.' })).toBeNull();
    const href = suspendedLoginHref('chargeback abuse');
    expect(href.startsWith('/auth/login?suspended=1')).toBe(true);
    const msg = suspendedLoginMessage(href.split('?')[1]!);
    expect(msg).toMatch(/This account has been suspended\. Reason: chargeback abuse/);
    expect(suspendedLoginMessage('')).toBeNull();
  });
});

describe('admin block', () => {
  it('sends blockedReason only when given', () => {
    expect(blockUpdates('  ')).toEqual({ blocked: true });
    expect(blockUpdates(' spam ')).toEqual({ blocked: true, blockedReason: 'spam' });
    expect(blockUpdates('x'.repeat(600)).blockedReason).toHaveLength(500);
  });
});

describe('store order cancel', () => {
  it('only pre-shipment states are cancellable', () => {
    for (const s of ['PENDING', 'CONFIRMED', 'PROCESSING']) expect(canCancelStoreOrder(s)).toBe(true);
    for (const s of ['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']) expect(canCancelStoreOrder(s)).toBe(false);
    expect(storeCancelBlockedReason('SHIPPED')).toMatch(/Shipped/);
  });
  it('confirm text differs for paid vs unpaid', () => {
    expect(storeCancelConfirmText({ status: 'PENDING', paymentId: null })).toMatch(/nothing will be charged/);
    expect(storeCancelConfirmText({ status: 'CONFIRMED', paymentId: 'p' })).toMatch(/pending|approval/);
  });
  it('derives refund state from history', () => {
    const requested = storeRefundState({ status: 'CANCELLED', statusHistory: [{ status: 'CANCELLED', note: 'Cancelled by customer [refund-requested]' }] });
    expect(requested).toMatchObject({ kind: 'requested' });
    const declined = storeRefundState({
      status: 'CANCELLED',
      statusHistory: [
        { status: 'CANCELLED', note: 'Cancelled by customer [refund-requested]' },
        { status: 'CANCELLED', note: '[refund-rejected] item used' },
      ],
    });
    expect(declined).toMatchObject({ kind: 'declined' });
    expect((declined as { text: string }).text).toMatch(/item used/);
    expect(storeRefundState({ status: 'CANCELLED', statusHistory: [{ status: 'CANCELLED', note: 'Cancelled by customer' }] }).kind).toBe('none');
    expect(storeRefundState({ status: 'REFUNDED' }).kind).toBe('refunded');
  });
  it('courier rides in the shipped note', () => {
    const note = composeShippedNote('packed', 'India Post');
    expect(note).toBe('Courier: India Post\npacked');
    expect(courierFromHistory({ status: 'SHIPPED', statusHistory: [{ status: 'SHIPPED', note }] })).toBe('India Post');
    expect(composeShippedNote('', '')).toBe('');
  });
  it('messages', () => {
    expect(describeStoreCancelled({ refundStatus: 'pending_admin_approval', refundOwedInr: 499 })).toMatch(/pending admin approval/);
    expect(describeStoreCancelled({ refundStatus: 'none' })).toMatch(/Nothing was charged/);
    expect(describeStoreCancelError(409, { code: 'order_not_cancellable', error: 'This order has already shipped and can no longer be cancelled.' })).toMatch(/already shipped/);
  });
});

describe('admin store refunds', () => {
  it('validates reject reason and computes refundable', () => {
    expect(validateRejectReason('ab')).not.toBeNull();
    expect(validateRejectReason(' abc ')).toBeNull();
    expect(refundableAmount({ totalAmount: 500, payment: { id: 'p', status: 'captured', amount: '500.00', refundAmount: '100' } } as never)).toBe(400);
    expect(describeApproveFailure(502, 'gateway_failed', 'bad')).toMatch(/Nothing was refunded/);
  });
});
