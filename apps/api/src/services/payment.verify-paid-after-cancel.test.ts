import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/pdf-invoice.js', () => ({
  generateInvoice: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
}));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

/** QA 2026-10-13: money arriving for an already-cancelled booking is flagged, never silent. */
const ORDER_ID = 'order_PAY08V';
const PAYMENT_ID = 'pay_PAY08V';
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OFFERING_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const KEY_SECRET = 'test_secret_key';
const MINUTES = 60_000;

const ORIG_ENV = { ...process.env };

async function verify() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  const service = new mod.PaymentService();
  const signature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${ORDER_ID}|${PAYMENT_ID}`)
    .digest('hex');
  return service.verifyPayment(ORDER_ID, PAYMENT_ID, signature, 'user-1');
}


beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  prismaMock.payment.update.mockResolvedValue({});
  prismaMock.pujaBooking.update.mockResolvedValue({});
  prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
  prismaMock.commission.findFirst.mockResolvedValue({ id: 'c-existing' });
  prismaMock.templePayout.findFirst?.mockResolvedValue?.(null);
  prismaMock.templePujaOffering.findUnique.mockResolvedValue({ maxBookingsPerSlot: 1 });
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});


describe('verifyPayment on a cancelled booking', () => {
  it('records the capture, flags it for refund and tells the devotee', async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      amount: new Prisma.Decimal('1100.00'),
      status: 'initiated',
      metadata: {},
      gatewayPaymentId: null,
      bookingId: BOOKING_ID,
      booking: {
        id: BOOKING_ID,
        bookingNumber: 'BS-1',
        status: 'cancelled',
        userId: 'user-1',
        createdAt: new Date(),
        templePujaOfferingId: OFFERING_ID,
        priestPujaOfferingId: null,
        scheduledDate: new Date('2026-12-01T00:00:00Z'),
        scheduledTimeSlot: '09:00',
      },
    });
    await expect(verify()).rejects.toThrow(/already been cancelled/);
    const data = prismaMock.payment.update.mock.calls[0]![0].data as { status: string; metadata: Record<string, unknown> };
    expect(data.status).toBe('captured');
    expect(data.metadata.needsAdminReview).toBe('paid-after-cancel');
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });
});
