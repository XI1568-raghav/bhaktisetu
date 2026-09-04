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
 * PAY-08, second capture→confirm rail (2026-08-21).
 *
 * The first pass covered only the TEMPLE-anchored booking
 * (`templePujaOfferingId`). A pandit-direct booking is anchored on
 * `priestPujaOfferingId` instead — a different column on the same
 * PujaBooking row, with its own `PriestPujaOffering.maxBookingsPerSlot`
 * (default 1, i.e. the STRICTEST capacity in the product). The helper returned
 * null for it, so exactly the case where overselling hurts most — one devotee
 * per pandit per slot — was the case with no detection at all.
 *
 * booking.service builds the two capacity predicates from the same shape
 * (booking.service.ts:1326 `isPriestOffering ? { priestPujaOfferingId } :
 * { templePujaOfferingId }`), so the re-check mirrors it rather than inventing
 * a second definition of "the same slot".
 */

const SECRET = 'test_webhook_secret';
const ORDER_ID = 'order_PAY08P';
const PAYMENT_ID = 'pay_PAY08P';
const BOOKING_ID = '99999999-9999-9999-9999-999999999999';
const PRIEST_OFFERING_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
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

function priestBookingAgedMinutes(ageMinutes: number) {
  return {
    id: 'pmt-priest-1',
    amount: new Prisma.Decimal('2500.00'),
    status: 'initiated',
    metadata: {},
    bookingId: BOOKING_ID,
    booking: {
      id: BOOKING_ID,
      status: 'pending_payment',
      userId: 'user-1',
      createdAt: new Date(Date.now() - ageMinutes * MINUTES),
      // Pandit-direct booking: no temple offering anywhere on the row.
      templePujaOfferingId: null,
      priestPujaOfferingId: PRIEST_OFFERING_ID,
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
  // A priest-anchored booking must never be resolved through the TEMPLE
  // catalog; leaving this unmocked would surface as `undefined` capacity.
  prismaMock.templePujaOffering.findUnique.mockResolvedValue(null);
  prismaMock.priestPujaOffering.findUnique.mockResolvedValue({ maxBookingsPerSlot: 1 });
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe('PAY-08 — the priest-anchored capture rail is re-checked too', () => {
  it('flags a late capture on a pandit slot that was already resold', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(priestBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(1);

    await fire();

    const metadata = metadataOfCapture();
    expect(metadata?.needsAdminReview).toBe('slot-capacity');
    expect(String(metadata?.slotOversoldNote)).toMatch(/1 of 1/);
  });

  it('counts against the PRIEST offering column, not the temple one', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(priestBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(0);

    await fire();

    const where = prismaMock.pujaBooking.count.mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.priestPujaOfferingId).toBe(PRIEST_OFFERING_ID);
    expect(where.templePujaOfferingId).toBeUndefined();
    expect(where.id).toEqual({ not: BOOKING_ID });
    expect(prismaMock.priestPujaOffering.findUnique).toHaveBeenCalled();
    expect(prismaMock.templePujaOffering.findUnique).not.toHaveBeenCalled();
  });

  it('still confirms — a paid devotee is never stranded', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(priestBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(1);

    await fire();

    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'confirmed' } }),
    );
  });

  it('does not flag when the pandit slot still has room', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(priestBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(0);

    await fire();

    expect(metadataOfCapture()).toBeUndefined();
  });

  it('does not even look while the unpaid hold is still live', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(priestBookingAgedMinutes(5));
    prismaMock.pujaBooking.count.mockResolvedValue(99);

    await fire();

    expect(prismaMock.pujaBooking.count).not.toHaveBeenCalled();
    expect(metadataOfCapture()).toBeUndefined();
  });

  it('respects a pandit offering configured for more than one per slot', async () => {
    prismaMock.priestPujaOffering.findUnique.mockResolvedValue({ maxBookingsPerSlot: 3 });
    prismaMock.payment.findFirst.mockResolvedValue(priestBookingAgedMinutes(180));
    prismaMock.pujaBooking.count.mockResolvedValue(2);

    await fire();

    expect(metadataOfCapture()).toBeUndefined();
  });
});
