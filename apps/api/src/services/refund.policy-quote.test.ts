import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn() }));
vi.mock('./booking-notify.service.js', () => ({ notifyRefundProcessed: vi.fn() }));

const { getPolicy, computeDevoteeRefund } = vi.hoisted(() => ({ getPolicy: vi.fn(), computeDevoteeRefund: vi.fn() }));
vi.mock('./cancellation.service.js', () => ({
  cancellationService: { getPolicy, computeDevoteeRefund },
}));

import { computePolicyRefund } from './refund.service.js';

/**
 * Customer test 2026-10-05 — the admin refund screen offered only "Full refund"
 * or a hand-typed "Partial", defaulting to Full. A devotee told "you get 376.50
 * back (75%)" on a 502 booking would be refunded 502 by one click on the default.
 * The cron path already refunds by the cancellation ladder, measured from the
 * moment the devotee cancelled; the admin path now asks the same question the
 * same way, from one shared function.
 */
beforeEach(() => {
  vi.clearAllMocks();
  getPolicy.mockResolvedValue({ tiers: [{ minHoursBefore: 24, refundFraction: 0.75, label: '75% refund (24–48h before)' }] });
  computeDevoteeRefund.mockReturnValue({ refundAmountInr: 376.5, feeAmountInr: 125.5, refundFraction: 0.75, tierLabel: '75% refund (24–48h before)', hoursUntilSlot: 30.8 });
});

const booking = {
  id: 'bk-1',
  scheduledDate: new Date('2026-10-06T00:00:00Z'),
  scheduledTimeSlot: '07:00',
  priceAmount: '502',
  cancelledAt: new Date('2026-10-04T18:40:00Z'),
};

describe('computePolicyRefund', () => {
  it('asks the cancellation engine what the policy owes, measured from when the devotee cancelled', async () => {
    const q = await computePolicyRefund(booking);
    expect(getPolicy).toHaveBeenCalledWith('bk-1');
    expect(computeDevoteeRefund).toHaveBeenCalledWith({
      policy: expect.any(Object),
      scheduledDate: booking.scheduledDate,
      scheduledTimeSlot: '07:00',
      pujaPriceInr: 502,
      totalPaidInr: 502,
      now: booking.cancelledAt,
    });
    expect(q).toEqual({ refundAmountInr: 376.5, feeAmountInr: 125.5, refundFraction: 0.75, tierLabel: '75% refund (24–48h before)' });
  });

  it('does not measure from now when the booking has no cancellation time', async () => {
    await computePolicyRefund({ ...booking, cancelledAt: null });
    expect((computeDevoteeRefund.mock.calls[0]![0] as any).now).toBeUndefined();
  });

  it('returns only the figures a screen needs, not the policy object', async () => {
    const q = await computePolicyRefund(booking);
    expect(Object.keys(q).sort()).toEqual(['feeAmountInr', 'refundAmountInr', 'refundFraction', 'tierLabel']);
  });
});
