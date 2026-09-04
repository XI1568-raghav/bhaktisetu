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
 * PAY-08, third capture→confirm rail (2026-08-21).
 *
 * There are three ways a booking reaches `confirmed`, and the slot re-check
 * had been fitted to exactly one of them:
 *
 *   1. the Razorpay webhook            — covered (temple + pandit)
 *   2. reconcile-payments              — routes through the webhook method
 *   3. `verifyPayment` (client verify) — NOT covered until now
 *
 * Rail 3 is not a theoretical hole. `verifyPayment` is the browser callback
 * fired when the Razorpay checkout modal succeeds, and the unpaid hold is only
 * `UNPAID_HOLD_MINUTES` (30) long. A devotee who opens checkout, gets
 * interrupted, and finishes paying an hour later comes back through THIS rail,
 * not the webhook — and the slot they are being confirmed into may well have
 * been sold to someone else in the meantime, exactly as in the webhook case.
 * It confirmed in silence: no re-check, no flag, no log, so the oversold
 * booking never reached the operator queue.
 *
 * Same contract as the webhook rail: detect and flag, never refuse. A devotee
 * who has paid is never stranded.
 */

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

function paymentAgedMinutes(ageMinutes: number) {
  return {
    id: 'pmt-verify-1',
    amount: new Prisma.Decimal('1100.00'),
    status: 'initiated',
    metadata: {},
    gatewayPaymentId: null,
    bookingId: BOOKING_ID,
    booking: {
      id: BOOKING_ID,
      bookingNumber: 'BS-20260901-AAAAA',
      status: 'pending_payment',
      userId: 'user-1',
      createdAt: new Date(Date.now() - ageMinutes * MINUTES),
      templePujaOfferingId: OFFERING_ID,
      priestPujaOfferingId: null,
      scheduledDate: new Date('2026-09-01T00:00:00Z'),
      scheduledTimeSlot: '09:00-10:00',
    },
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

describe('PAY-08 — the client-verify rail is re-checked against slot capacity too', () => {
  it('flags a late client verify onto a slot that was already resold', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(1);

    await verify();

    const metadata = metadataOfCapture();
    expect(metadata?.needsAdminReview).toBe('slot-capacity');
    expect(String(metadata?.slotOversoldNote)).toMatch(/1 of 1/);
  });

  it('still confirms — the devotee has already paid', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(1);

    const out = await verify();

    expect(out.verified).toBe(true);
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'confirmed' } }),
    );
  });

  it('does not flag when the slot still has room', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(0);

    await verify();

    expect(metadataOfCapture()).toBeUndefined();
  });

  it('does not even look while the unpaid hold is still live', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentAgedMinutes(5));
    prismaMock.pujaBooking.count.mockResolvedValue(99);

    await verify();

    expect(prismaMock.pujaBooking.count).not.toHaveBeenCalled();
    expect(metadataOfCapture()).toBeUndefined();
  });

  it('never overwrites the gateway id it is stamping while adding the flag', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(paymentAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(1);

    await verify();

    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.status).toBe('captured');
    expect(data.gatewayPaymentId).toBe(PAYMENT_ID);
  });
});
