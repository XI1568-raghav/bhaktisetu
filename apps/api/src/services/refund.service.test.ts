import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
  refundSuccessEmail: () => ({ subject: 's', html: 'h', text: 't' }),
}));
vi.mock('./cancellation.service.js', () => ({
  cancellationService: {
    getPolicy: vi.fn(async () => ({ tiers: [], refundDaysLabel: '5-7 business days' })),
    computeDevoteeRefund: vi.fn(() => ({ refundFraction: 1, refundAmountInr: 1100, tierLabel: 'Full refund (48h+ before)' })),
  },
}));

import { processRefund } from './refund.service.js';

// ── RV-02 regression lock ────────────────────────────────────────────────────
// A refunded booking must UNWIND the provider ledger. Commission rows are minted
// at confirm-time, strictly before any refund is possible, and nothing used to
// reverse them: the priest's share stayed PENDING and fully withdrawable and the
// temple's 5% stayed pending, so on a Rs 5,000 refunded booking ~Rs 6,250 left
// the platform on a booking that earned Rs 0.

const BOOKING_ID = '11111111-1111-1111-1111-111111111111';

function bookingFixture() {
  return {
    id: BOOKING_ID,
    bookingNumber: 'BS-20260810-ABCDE',
    status: 'cancelled',
    cancelledAt: new Date('2026-08-10T00:00:00Z'),
    cancellationReason: null,
    user: { email: 'devotee@example.com', fullName: 'Devotee' },
    pujaType: { name: 'Rudrabhishek' },
    temple: { name: 'Kashi Vishwanath' },
    payments: [
      {
        id: 'pay-1',
        status: 'captured',
        amount: 1100,
        gatewayPaymentId: 'pay_razorpay_1',
        metadata: {},
      },
    ],
  };
}

describe('refund.service — RV-02 ledger reversal', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    prismaMock.pujaBooking.findUnique.mockResolvedValue(bookingFixture());
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.pujaBooking.update.mockResolvedValue({});
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ id: 'rfnd_1', status: 'processed' }) })),
    );
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.unstubAllGlobals();
  });

  it('a FULL refund reverses the pending provider commission', async () => {
    const r = await processRefund({ bookingId: BOOKING_ID, reason: 'test', refundType: 'full' });
    expect(r.ok).toBe(true);

    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bookingId: BOOKING_ID, status: 'PENDING', payoutRequestId: null }),
        data: { status: 'REVERSED' },
      }),
    );
  });

  it('a FULL refund also reverses the temple 5% share', async () => {
    await processRefund({ bookingId: BOOKING_ID, reason: 'test', refundType: 'full' });
    expect(prismaMock.templePayout.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bookingId: BOOKING_ID, status: 'pending' }),
        data: { status: 'reversed' },
      }),
    );
  });

  it('only PENDING, unlinked commissions are reversed — a settled payout is never silently clawed back', async () => {
    await processRefund({ bookingId: BOOKING_ID, reason: 'test', refundType: 'full' });
    const where = prismaMock.commission.updateMany.mock.calls[0]![0].where;
    // Must NOT match PAID rows or rows already attached to a payout request.
    expect(where.status).toBe('PENDING');
    expect(where.payoutRequestId).toBeNull();
  });

  it('flags the booking for manual review when a commission was already settled', async () => {
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.commission.count.mockResolvedValue(1); // one already PAID
    await processRefund({ bookingId: BOOKING_ID, reason: 'test', refundType: 'full' });

    const patched = prismaMock.pujaBooking.update.mock.calls.some((c: any) =>
      String(c[0]?.data?.cancellationReason ?? '').includes('ledger-manual-review'),
    );
    expect(patched).toBe(true);
  });

  it('a PARTIAL refund does NOT touch the ledger (splitting an earning needs a policy decision)', async () => {
    await processRefund({
      bookingId: BOOKING_ID,
      reason: 'test',
      refundType: 'partial',
      amountInr: 550,
    });
    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.templePayout.updateMany).not.toHaveBeenCalled();
  });
});
