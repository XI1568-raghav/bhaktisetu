import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/pdf-invoice.js', () => ({
  generateInvoice: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
}));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

/**
 * PAY-08 (2026-08-20, P2) — a late webhook confirms a booking whose slot was
 * already resold, and nothing anywhere notices.
 *
 * `activeSlotHoldWhere` deliberately stops counting an unpaid `pending_payment`
 * booking against its slot once the row is older than `UNPAID_HOLD_MINUTES`
 * (30) — an abandoned checkout must not burn a pandit's calendar. The
 * consequence is that the slot can legitimately be sold to someone else while a
 * Razorpay capture is still in flight, and Razorpay retries a webhook for up to
 * 24 hours. The capture then confirmed the stale booking into a slot that was
 * already full, in total silence: no re-check, no flag, no log.
 *
 * The fix is detection, not refusal. A devotee who has paid must never be
 * stranded, so the booking is still confirmed — but the capture is stamped for
 * admin review and logged, and the reconciliation sweep reports the backlog.
 */

const SECRET = 'test_webhook_secret';
const ORDER_ID = 'order_PAY08';
const PAYMENT_ID = 'pay_PAY08';
const BOOKING_ID = '77777777-7777-7777-7777-777777777777';
const OFFERING_ID = '88888888-8888-8888-8888-888888888888';
const MINUTES = 60_000;

const ORIG_ENV = { ...process.env };

async function fire() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  const service = new mod.PaymentService();
  const payload = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: PAYMENT_ID, order_id: ORDER_ID, method: 'upi' } } },
  };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return service.handleWebhookRaw(raw, payload, sig);
}

function paymentWithBookingAgedMinutes(ageMinutes: number) {
  return {
    id: 'pmt-1',
    amount: new Prisma.Decimal('1100.00'),
    status: 'initiated',
    metadata: {},
    bookingId: BOOKING_ID,
    booking: {
      id: BOOKING_ID,
      status: 'pending_payment',
      userId: 'user-1',
      createdAt: new Date(Date.now() - ageMinutes * MINUTES),
      templePujaOfferingId: OFFERING_ID,
      scheduledDate: new Date('2026-09-01T00:00:00Z'),
      scheduledTimeSlot: '09:00-10:00',
    },
    storeOrders: [],
  };
}

function metadataOfCapture(): Record<string, unknown> | undefined {
  const call = prismaMock.payment.update.mock.calls[0];
  if (!call) return undefined;
  return (call[0].data as { metadata?: Record<string, unknown> }).metadata;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
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

describe('PAY-08 — capture is re-checked against slot capacity', () => {
  it('flags a capture that lands on a slot already resold', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentWithBookingAgedMinutes(180));
    // One OTHER active booking now occupies the slot, and capacity is 1.
    prismaMock.pujaBooking.count.mockResolvedValue(1);

    await fire();

    const metadata = metadataOfCapture();
    expect(metadata?.needsAdminReview).toBe('slot-capacity');
    expect(String(metadata?.slotOversoldNote)).toMatch(/1 of 1/);
  });

  it('still confirms the booking — a paid devotee is never stranded', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentWithBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(1);

    await fire();

    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'confirmed' } }),
    );
  });

  it('does not flag when the slot still has room', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentWithBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(0);

    await fire();

    expect(metadataOfCapture()).toBeUndefined();
  });

  it('does not even look while the unpaid hold is still live', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentWithBookingAgedMinutes(5));
    prismaMock.pujaBooking.count.mockResolvedValue(99);

    await fire();

    expect(prismaMock.pujaBooking.count).not.toHaveBeenCalled();
    expect(metadataOfCapture()).toBeUndefined();
  });

  it('excludes the booking being confirmed from its own capacity count', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentWithBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(0);

    await fire();

    const where = prismaMock.pujaBooking.count.mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.id).toEqual({ not: BOOKING_ID });
    expect(where.templePujaOfferingId).toBe(OFFERING_ID);
  });
});
