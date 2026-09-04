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
 * The Razorpay webhook is the ONLY confirmation path that survives the browser
 * being closed. Three of the five money rails could not use it.
 *
 * PAY-02 (P0) — every downstream effect was gated on `!!payment.booking`, which
 *   is null by design for a store order (Payment.bookingId is nullable
 *   specifically for non-puja payments). A paid store order was marked
 *   `captured` and then nothing else happened: StoreOrder stayed PENDING
 *   forever, no Commission for the store owner, no invoice.
 *
 * PAY-01 (P0) — consultations write NO prisma.payment row at all (raw INSERT
 *   into astrologer_consultations), so the `else` branch resolved donations and
 *   only donations. A paid consultation was invisible to the webhook, and
 *   jobs/consultation-expire.ts then cancelled it 30 minutes later.
 *
 * PAY-05 / PAY-03 (P1/P0) — the refund webhook OVERWROTE `Payment.refundAmount`
 *   with the last refund instead of accumulating it, never touched the provider
 *   ledger, and listened for `refund.created` only.
 */

const ORDER_ID = 'order_PAY0102';
const PAYMENT_ID = 'pay_PAY0102';
const BOOKING_ID = '33333333-3333-3333-3333-333333333333';
const CONSULT_ID = '44444444-4444-4444-4444-444444444444';
const SECRET = 'test_webhook_secret';

const ORIG_ENV = { ...process.env };

function consultationRow(status: string) {
  return {
    id: CONSULT_ID,
    reference: 'AC-20260820-ABCDEF',
    user_id: '55555555-5555-5555-5555-555555555555',
    astrologer_id: '66666666-6666-6666-6666-666666666666',
    astrologer_name: 'Acharya Vinod Sharma',
    minutes: 15,
    per_minute_rate_inr: '25',
    amount_inr: '375',
    currency: 'INR',
    scheduled_at: null,
    razorpay_order_id: ORDER_ID,
    razorpay_payment_id: null,
    room_name: null,
    status,
    created_at: new Date('2026-08-20T00:00:00Z'),
    paid_at: null,
  };
}

async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

async function fire(payload: Record<string, unknown>) {
  const service = await loadService();
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return service.handleWebhookRaw(raw, payload, sig);
}

function capturedEvent() {
  return {
    event: 'payment.captured',
    payload: { payment: { entity: { id: PAYMENT_ID, order_id: ORDER_ID, method: 'upi' } } },
  };
}

function refundEvent(event: string, refundId: string, amountPaise: number) {
  return {
    event,
    payload: {
      refund: { entity: { id: refundId, payment_id: PAYMENT_ID, amount: amountPaise } },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  prismaMock.payment.update.mockResolvedValue({});
  prismaMock.storeOrder.update.mockResolvedValue({});
  prismaMock.pujaBooking.update.mockResolvedValue({});
  prismaMock.pujaBooking.count.mockResolvedValue(0);
  // Commission already present ⇒ the store/puja commission writers short-circuit.
  prismaMock.commission.findFirst.mockResolvedValue({ id: 'c-existing' });
  prismaMock.commission.findMany.mockResolvedValue([]);
  prismaMock.commission.count.mockResolvedValue(0);
  prismaMock.commission.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.templePayout.findMany.mockResolvedValue([]);
  prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

// ─── PAY-02 ────────────────────────────────────────────────────────────────

describe('PAY-02 — the webhook confirms a paid STORE ORDER', () => {
  beforeEach(() => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-store',
      amount: new Prisma.Decimal('1234.50'),
      status: 'initiated',
      metadata: {},
      bookingId: null,
      booking: null,
      storeOrders: [
        {
          id: 'so-1',
          orderNumber: 'ORD-1',
          status: 'PENDING',
          statusHistory: [],
          userId: 'user-1',
        },
      ],
    });
  });

  it('flips the StoreOrder PENDING → CONFIRMED', async () => {
    const res = await fire(capturedEvent());
    expect(res.handled).toBe(true);
    expect(prismaMock.storeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'so-1' },
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      }),
    );
  });

  it('still marks the Payment captured', async () => {
    await fire(capturedEvent());
    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.status).toBe('captured');
    expect(data.gatewayPaymentId).toBe(PAYMENT_ID);
  });

  it('writes the store-owner commission inside the capture transaction', async () => {
    // The writer short-circuits on an existing row; reaching the lookup at all
    // proves the commission leg ran (it never did before — no store branch).
    await fire(capturedEvent());
    expect(prismaMock.commission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeOrderId: 'so-1' } }),
    );
  });

  it('does not re-confirm an order that is already CONFIRMED', async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-store',
      amount: new Prisma.Decimal('1234.50'),
      status: 'captured',
      metadata: {},
      bookingId: null,
      booking: null,
      storeOrders: [
        { id: 'so-1', orderNumber: 'ORD-1', status: 'CONFIRMED', statusHistory: [], userId: 'u' },
      ],
    });
    await fire(capturedEvent());
    expect(prismaMock.storeOrder.update).not.toHaveBeenCalled();
  });
});

// ─── PAY-01 ────────────────────────────────────────────────────────────────

describe('PAY-01 — the webhook confirms a paid CONSULTATION', () => {
  beforeEach(() => {
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(null);
    prismaMock.astrologerProfile.findFirst.mockResolvedValue(null);
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'c-existing' });
  });

  it('confirms a pending_payment consultation with no prisma.payment row', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /astrologer_consultations/i.test(String(sql)) ? [consultationRow('pending_payment')] : [],
    );

    const res = await fire(capturedEvent());
    expect(res.handled).toBe(true);

    const confirmed = prismaMock.$executeRawUnsafe.mock.calls.some(
      (c: any[]) =>
        /UPDATE astrologer_consultations/i.test(String(c[0])) &&
        /status\s*=\s*'confirmed'/i.test(String(c[0])),
    );
    expect(confirmed).toBe(true);
  });

  it('RECOVERS a consultation the expiry cron already cancelled', async () => {
    // The exact PAY-01 shape: money captured, row destroyed 30 minutes later.
    // A late webhook must be able to put it back, not walk past it.
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /astrologer_consultations/i.test(String(sql)) ? [consultationRow('cancelled')] : [],
    );

    const res = await fire(capturedEvent());
    expect(res.handled).toBe(true);
    const claim = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) =>
      /UPDATE astrologer_consultations/i.test(String(c[0])),
    );
    expect(claim).toBeDefined();
    // The claim must be able to reach a cancelled row.
    expect(String(claim![0])).toMatch(/cancelled/);
  });

  it('leaves an already-confirmed consultation alone', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /astrologer_consultations/i.test(String(sql)) ? [consultationRow('confirmed')] : [],
    );
    await fire(capturedEvent());
    const wrote = prismaMock.$executeRawUnsafe.mock.calls.some((c: any[]) =>
      /UPDATE astrologer_consultations/i.test(String(c[0])),
    );
    expect(wrote).toBe(false);
  });
});

// ─── PAY-05 / PAY-03 ───────────────────────────────────────────────────────

describe('PAY-05 / PAY-03 — the refund webhook', () => {
  beforeEach(() => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      amount: new Prisma.Decimal('1100.00'),
      refundAmount: new Prisma.Decimal('550.00'),
      status: 'partially_refunded',
      bookingId: BOOKING_ID,
      metadata: { refundIds: ['rfnd_a'] },
    });
    prismaMock.commission.findMany.mockResolvedValue([
      { id: 'c1', amount: new Prisma.Decimal('440.00') },
    ]);
    prismaMock.commission.update.mockResolvedValue({});
  });

  it('ACCUMULATES onto the stored refund total instead of overwriting it', async () => {
    const res = await fire(refundEvent('refund.created', 'rfnd_b', 27500));
    expect(res.handled).toBe(true);
    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(Number(data.refundAmount)).toBe(825);
    expect(data.status).toBe('partially_refunded');
  });

  it('handles refund.processed as well as refund.created', async () => {
    const res = await fire(refundEvent('refund.processed', 'rfnd_b', 27500));
    expect(res.handled).toBe(true);
    expect(prismaMock.payment.update).toHaveBeenCalled();
  });

  it('never double-counts a refund the rail already recorded', async () => {
    const res = await fire(refundEvent('refund.created', 'rfnd_a', 55000));
    expect(res.handled).toBe(true);
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  it('unwinds the provider ledger proportionally', async () => {
    await fire(refundEvent('refund.created', 'rfnd_b', 27500));
    // retain = (550 - 275)/550 = 0.5 → the pandit's Rs 440 becomes Rs 220.
    expect(prismaMock.commission.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
    const amount = prismaMock.commission.update.mock.calls[0]![0].data.amount;
    expect(amount.toString()).toBe('220');
  });

  it('fully reverses the ledger when the refund clears the balance', async () => {
    await fire(refundEvent('refund.created', 'rfnd_b', 55000));
    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(Number(data.refundAmount)).toBe(1100);
    expect(data.status).toBe('refunded');
    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REVERSED' } }),
    );
  });

  it('records the refund id so a retry of the same event is a no-op', async () => {
    await fire(refundEvent('refund.created', 'rfnd_b', 27500));
    const data = prismaMock.payment.update.mock.calls[0]![0].data as {
      metadata: { refundIds?: string[] };
    };
    expect(data.metadata.refundIds).toEqual(['rfnd_a', 'rfnd_b']);
  });

  it('a refund on a non-booking payment (store/donation) still accumulates', async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-2',
      amount: new Prisma.Decimal('500.00'),
      refundAmount: null,
      status: 'captured',
      bookingId: null,
      metadata: {},
    });
    await fire(refundEvent('refund.created', 'rfnd_c', 20000));
    const data = prismaMock.payment.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(Number(data.refundAmount)).toBe(200);
    expect(prismaMock.commission.update).not.toHaveBeenCalled();
  });
});
