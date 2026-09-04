import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));
vi.mock('./cancellation.service.js', () => ({
  cancellationService: {
    getPolicy: vi.fn(async () => ({ tiers: [], refundDaysLabel: '5-7 business days' })),
    computeDevoteeRefund: vi.fn(() => ({
      refundFraction: 1,
      refundAmountInr: 1100,
      tierLabel: 'Full refund (48h+ before)',
    })),
  },
}));

import { processRefund } from './refund.service.js';

// ── PAY-03 regression lock ───────────────────────────────────────────────────
//
// `Payment.refundAmount` is the CUMULATIVE total refunded against one capture.
// payment.service's admin rail has always read it that way (`refundable =
// paid - alreadyRefunded`, `newRefundTotal = alreadyRefunded + refundAmount`).
// refund.service's rail wrote the LAST refund only, and passed the full
// `paidInr` as `refundableBefore` to the proportional ledger unwind.
//
// So on a second partial the two rails disagreed:
//   Rs 1,100 captured, Rs 550 already refunded, second partial of Rs 275.
//     - stored refundAmount became 275 (not 825), so a third refund believed
//       Rs 825 was still refundable when only Rs 275 was;
//     - the ledger unwind used retain = (1100-275)/1100 = 0.75 instead of
//       (550-275)/550 = 0.50, leaving the pandit Rs 330 of a Rs 440 pending
//       commission where Rs 220 is correct — the platform keeps paying
//       providers on revenue it has already handed back.
//
// Both assertions below FAIL against the pre-fix refund.service (measured:
// refundAmount 275, commission 330).

const BOOKING_ID = '22222222-2222-2222-2222-222222222222';

/** A Rs 1,100 capture that has ALREADY had one Rs 550 partial refund applied. */
function bookingAfterFirstPartial() {
  return {
    id: BOOKING_ID,
    bookingNumber: 'BS-20260820-PAY03',
    status: 'cancelled',
    cancelledAt: new Date('2026-08-20T00:00:00Z'),
    cancellationReason: '[partially-refunded 550] first partial',
    user: { email: 'devotee@example.com', fullName: 'Devotee' },
    pujaType: { name: 'Rudrabhishek' },
    temple: { name: 'Kashi Vishwanath' },
    payments: [
      {
        id: 'pay-1',
        status: 'partially_refunded',
        amount: 1100,
        refundAmount: new Prisma.Decimal('550.00'),
        gatewayPaymentId: 'pay_razorpay_1',
        metadata: { refundIds: ['rfnd_first'] },
      },
    ],
  };
}

describe('refund.service — PAY-03 cumulative refundAmount', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    prismaMock.pujaBooking.findUnique.mockResolvedValue(bookingAfterFirstPartial());
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.pujaBooking.update.mockResolvedValue({});
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 1 });
    // The pending commission has ALREADY been scaled by the first partial:
    // Rs 880 * (1100-550)/1100 = Rs 440.
    prismaMock.commission.findMany.mockResolvedValue([
      { id: 'c1', amount: new Prisma.Decimal('440.00') },
    ]);
    prismaMock.commission.update.mockResolvedValue({});
    prismaMock.templePayout.findMany.mockResolvedValue([]);
    prismaMock.templePayout.update.mockResolvedValue({});
    prismaMock.priestPayout.findMany?.mockResolvedValue?.([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'rfnd_second', status: 'processed' }),
      })),
    );
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.unstubAllGlobals();
  });

  it('a SECOND partial ACCUMULATES onto the stored refund total', async () => {
    const r = await processRefund({
      bookingId: BOOKING_ID,
      reason: 'second partial',
      refundType: 'partial',
      amountInr: 275,
    });
    expect(r.ok).toBe(true);

    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    // 550 already refunded + 275 now = 825. NOT 275.
    expect(Number(data.refundAmount)).toBe(825);
    expect(data.status).toBe('partially_refunded');
  });

  it('the proportional ledger unwind scales against what was STILL refundable', async () => {
    await processRefund({
      bookingId: BOOKING_ID,
      reason: 'second partial',
      refundType: 'partial',
      amountInr: 275,
    });
    // retain = (550 - 275) / 550 = 0.5 → 440 * 0.5 = 220.
    // The bug computed (1100 - 275) / 1100 = 0.75 → 330.
    const amount = prismaMock.commission.update.mock.calls[0]![0].data.amount;
    expect(amount.toString()).toBe('220');
  });

  it('records the Razorpay refund id so the webhook cannot double-count it', async () => {
    await processRefund({
      bookingId: BOOKING_ID,
      reason: 'second partial',
      refundType: 'partial',
      amountInr: 275,
    });
    const data = prismaMock.payment.update.mock.calls[0]![0].data as {
      metadata: { refundIds?: string[] };
    };
    expect(data.metadata.refundIds).toEqual(['rfnd_first', 'rfnd_second']);
  });

  it('a partial that completes the total flips the payment to refunded and fully reverses the ledger', async () => {
    await processRefund({
      bookingId: BOOKING_ID,
      reason: 'balance',
      refundType: 'partial',
      amountInr: 550,
    });
    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(Number(data.refundAmount)).toBe(1100);
    expect(data.status).toBe('refunded');
    // Fully refunded → the remaining pending commission is REVERSED, not scaled.
    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REVERSED' } }),
    );
  });

  it('never refunds more than what is still refundable', async () => {
    // Asking for the whole Rs 1,100 again when only Rs 550 remains.
    await processRefund({
      bookingId: BOOKING_ID,
      reason: 'over-ask',
      refundType: 'partial',
      amountInr: 1100,
    });
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: any[][] } };
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(body.amount).toBe(55000); // paise — the Rs 550 balance, not Rs 1,100
    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(Number(data.refundAmount)).toBe(1100);
  });

  it('refuses a refund on a capture that is already fully refunded', async () => {
    const b = bookingAfterFirstPartial();
    b.payments[0]!.refundAmount = new Prisma.Decimal('1100.00');
    prismaMock.pujaBooking.findUnique.mockResolvedValue(b);

    const r = await processRefund({
      bookingId: BOOKING_ID,
      reason: 'third bite',
      refundType: 'partial',
      amountInr: 100,
    });
    expect(r.skipped).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });
});
