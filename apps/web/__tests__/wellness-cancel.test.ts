import { describe, expect, it } from 'vitest';
import {
  describeAttendanceError,
  describeEnrolmentCancelError,
  describeEnrolmentCancelled,
  describeSessionCancelled,
  previewEnrolmentCancel,
  summariseSessionCancel,
} from '../lib/wellness-cancel';

const now = new Date('2026-10-13T10:00:00Z');
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

describe('previewEnrolmentCancel', () => {
  it('releases an unpaid seat with no charge', () => {
    expect(previewEnrolmentCancel({ status: 'PENDING_PAYMENT', priceInr: '500', scheduledAt: inHours(5), now }).kind).toBe('release');
  });
  it('full refund at 48h+', () => {
    const p = previewEnrolmentCancel({ status: 'PAID', priceInr: '500.00', scheduledAt: inHours(72), now });
    expect(p).toMatchObject({ kind: 'refund', fraction: 1, amountInr: 500 });
  });
  it('75% between 24h and 48h', () => {
    const p = previewEnrolmentCancel({ status: 'PAID', priceInr: '500', scheduledAt: inHours(30), now });
    expect(p).toMatchObject({ kind: 'refund', fraction: 0.75, amountInr: 375 });
  });
  it('is blocked inside 24h and when already started', () => {
    expect(previewEnrolmentCancel({ status: 'PAID', priceInr: '500', scheduledAt: inHours(23), now }).kind).toBe('blocked');
    expect(previewEnrolmentCancel({ status: 'PAID', priceInr: '500', scheduledAt: inHours(-1), now }).kind).toBe('blocked');
  });
  it('blocks attended, ignores cancelled, treats free as release', () => {
    expect(previewEnrolmentCancel({ status: 'ATTENDED', priceInr: '500', scheduledAt: inHours(72), now }).kind).toBe('blocked');
    expect(previewEnrolmentCancel({ status: 'CANCELLED', priceInr: '500', scheduledAt: inHours(72), now }).kind).toBe('none');
    expect(previewEnrolmentCancel({ status: 'PAID', priceInr: '0', scheduledAt: inHours(72), now }).kind).toBe('release');
  });
});

describe('messages', () => {
  it('maps cancellation_window_closed', () => {
    expect(describeEnrolmentCancelError(409, { code: 'cancellation_window_closed', error: 'x' })).toMatch(/less than 24 hours/);
  });
  it('falls back safely on 500', () => {
    expect(describeEnrolmentCancelError(500, { error: 'boom' })).toMatch(/try again/);
  });
  it('states the API refund after cancel', () => {
    expect(describeEnrolmentCancelled({ refundOwedInr: 375, tierLabel: '75% refund (24–48h before)' })).toMatch(/Rs 375/);
    expect(describeEnrolmentCancelled({ refundOwedInr: 0 })).toMatch(/no refund/);
    expect(describeEnrolmentCancelled({ alreadyCancelled: true })).toMatch(/already/);
  });
  it('maps attendance codes', () => {
    expect(describeAttendanceError(409, { code: 'session_not_started' })).toMatch(/once the class has started/);
    expect(describeAttendanceError(403, null)).toMatch(/Only the instructor/);
  });
});

describe('session cancel', () => {
  it('counts paid enrolments and the total refund', () => {
    const s = summariseSessionCancel(
      [{ id: 'a', status: 'PAID' }, { id: 'b', status: 'PAID' }, { id: 'c', status: 'ATTENDED' }],
      '300.00',
    );
    expect(s.paid).toBe(2);
    expect(s.refundTotalInr).toBe(600);
    expect(s.message).toMatch(/2 paid enrolments will be refunded in full \(Rs 600 in total\)/);
    expect(s.message).toMatch(/1 attended learner will not be refunded/);
  });
  it('handles no paid learners', () => {
    expect(summariseSessionCancel([], '300').message).toMatch(/No paid enrolments/);
  });
  it('reports the sweep result', () => {
    expect(describeSessionCancelled({ refunded: 2, refundOwedInr: 600, released: 1 })).toBe(
      'Session cancelled: 2 refunded (Rs 600), 1 unpaid seat released.',
    );
    expect(describeSessionCancelled({ refunded: 0, released: 0 })).toMatch(/No enrolments needed/);
  });
});
