import { describe, expect, it } from 'vitest';
import {
  isSuspendedError,
  isSuspendedMessage,
  peekSuspendedNotice,
  setSuspendedNotice,
  suspendedNoticeText,
} from './suspended';
import { refreshSession } from './session-refresh';

describe('suspended notice', () => {
  it('detects the API wording on a 403 only', () => {
    expect(isSuspendedError({ statusCode: 403, message: 'This account has been suspended.' })).toBe(true);
    expect(isSuspendedError({ statusCode: 403, message: 'Account suspended: fraud' })).toBe(true);
    expect(isSuspendedError({ statusCode: 401, message: 'Account suspended' })).toBe(false);
    expect(isSuspendedError({ statusCode: 403, message: 'Not authorized' })).toBe(false);
    expect(isSuspendedMessage(undefined)).toBe(false);
  });
  it('includes the reason and stores the notice', () => {
    expect(suspendedNoticeText('Account suspended: chargebacks')).toMatch(/Reason: chargebacks/);
    setSuspendedNotice('This account has been suspended.');
    expect(peekSuspendedNotice()).toMatch(/has been suspended/);
    setSuspendedNotice(null);
    expect(peekSuspendedNotice()).toBeNull();
  });
  it('a suspended refresh is rejected WITH the message', async () => {
    const post = async () => {
      throw { statusCode: 403, message: 'Account suspended: spam' };
    };
    const out = await refreshSession('rt', post as never);
    expect(out).toEqual({ kind: 'rejected', suspendedMessage: 'Account suspended: spam' });
  });
});

import { canCancelEnrolment, describeCancelOutcome, previewEnrolmentCancel } from './wellness';

describe('mobile enrolment cancel', () => {
  const now = new Date('2026-10-14T00:00:00Z');
  const at = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
  it('previews the ladder', () => {
    expect(previewEnrolmentCancel({ status: 'PAID', priceInr: 400, scheduledAt: at(72), now })).toMatchObject({ kind: 'refund', amountInr: 400 });
    expect(previewEnrolmentCancel({ status: 'PAID', priceInr: 400, scheduledAt: at(30), now })).toMatchObject({ kind: 'refund', amountInr: 300 });
    expect(previewEnrolmentCancel({ status: 'PAID', priceInr: 400, scheduledAt: at(5), now }).kind).toBe('blocked');
    expect(previewEnrolmentCancel({ status: 'PENDING_PAYMENT', priceInr: 400, scheduledAt: at(5), now }).kind).toBe('release');
    expect(canCancelEnrolment('ATTENDED')).toBe(false);
  });
  it('reads the API outcome', () => {
    expect(describeCancelOutcome(200, { refundOwedInr: 300, tierLabel: '75% refund' }).message).toMatch(/Rs 300/);
    expect(describeCancelOutcome(409, { code: 'cancellation_window_closed' }).message).toMatch(/less than 24 hours/);
  });
});
