import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { generateInvoice, sendEmail } = vi.hoisted(() => ({
  generateInvoice: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
  sendEmail: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../lib/pdf-invoice.js', () => ({ generateInvoice }));
vi.mock('../lib/email.js', () => ({ sendEmail }));

/**
 * PAY-09 (2026-08-20, P3) — client verify and the webhook race to confirm the
 * same booking, and the devotee gets two payment receipts.
 *
 * Both rails computed `shouldConfirm` from a read taken BEFORE their
 * transaction (`payment.booking.status === 'pending_payment'`). Two overlapping
 * reads both see `pending_payment`, both transactions commit, and both then
 * call `fireAndForgetPostConfirmSideEffects` — two invoice emails, two
 * "confirmed" notifications, two referral-reward attempts.
 *
 * The gate is now the capture transition itself: an `UPDATE payments SET
 * status = 'captured' WHERE id = … AND status <> 'captured'` inside the same
 * transaction reports 1 row for exactly one of the racers and 0 for the other,
 * whoever wins. Ledger writes stay ungated — they carry their own findFirst
 * idempotency guards, and gating them would risk a missing commission row.
 */

const SECRET = 'test_webhook_secret';
const ORDER_ID = 'order_PAY09';
const PAYMENT_ID = 'pay_PAY09';
const BOOKING_ID = '99999999-9999-9999-9999-999999999999';
const ORIG_ENV = { ...process.env };

/** The fire-and-forget invoice chain runs off the awaited call; let it drain. */
const drain = () => new Promise((r) => setTimeout(r, 30));

async function fireWebhook() {
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

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  prismaMock.payment.findFirst.mockResolvedValue({
    id: 'pmt-1',
    amount: new Prisma.Decimal('1100.00'),
    status: 'initiated',
    metadata: {},
    bookingId: BOOKING_ID,
    booking: {
      id: BOOKING_ID,
      status: 'pending_payment',
      userId: 'user-1',
      createdAt: new Date(),
      templePujaOfferingId: null,
      scheduledDate: null,
      scheduledTimeSlot: null,
    },
    storeOrders: [],
  });
  prismaMock.payment.update.mockResolvedValue({});
  prismaMock.pujaBooking.update.mockResolvedValue({});
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: BOOKING_ID,
    bookingNumber: 'BS-20260820-PAY09',
    priceAmount: new Prisma.Decimal('1100.00'),
    priestPayout: new Prisma.Decimal('880.00'),
    platformCommission: new Prisma.Decimal('220.00'),
    priestId: 'pr-1',
    priest: { userId: 'user-pandit-1' },
    templeId: 't-1',
    createdAt: new Date('2026-08-20T00:00:00Z'),
    user: { fullName: 'Devotee', email: 'devotee@example.com', id: 'user-1', phone: null },
    temple: { name: 'Kashi Vishwanath', city: 'Varanasi' },
    pujaType: { name: 'Rudrabhishek' },
  });
  prismaMock.commission.findFirst.mockResolvedValue({ id: 'c-existing' });
  // Both ledger writers short-circuit on an existing row; this test is about
  // the NOTICES, not the ledger.
  prismaMock.templePayout.findFirst.mockResolvedValue({ id: 'tp-existing' });
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe('PAY-09 — only the transaction that actually captured sends the notices', () => {
  it('the WINNER of the capture race sends the payment receipt', async () => {
    // The conditional capture updated this row: this racer won.
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);

    await fireWebhook();
    await drain();

    const subjects = sendEmail.mock.calls.map((c: any[]) =>
      String(c[0]?.subject ?? ''),
    );
    expect(subjects.some((s: string) => /payment receipt/i.test(s))).toBe(true);
    // LEG-10 regression guard: no mail may call the attachment a tax invoice.
    expect(subjects.some((s: string) => /tax invoice/i.test(s))).toBe(false);
  });

  it('the LOSER sends nothing — no second invoice, no second notification', async () => {
    // Zero rows updated: another transaction had already flipped the capture.
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);

    await fireWebhook();
    await drain();

    expect(sendEmail).not.toHaveBeenCalled();
    expect(generateInvoice).not.toHaveBeenCalled();
  });

  it('the LOSER still commits the ledger writes (they carry their own idempotency)', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);

    await fireWebhook();

    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'confirmed' } }),
    );
    // The commission writer was reached (it short-circuits on the existing row).
    expect(prismaMock.commission.findFirst).toHaveBeenCalled();
  });

  it('a RECOVERY of an already-captured payment still notifies the devotee', async () => {
    // PAY-06's sweep finds a Payment stuck `captured` with its booking still
    // `pending_payment`. There is no competing racer, so the claim returns 0 —
    // the devotee must still be told, not confirmed in silence.
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      amount: new Prisma.Decimal('1100.00'),
      status: 'captured',
      metadata: {},
      bookingId: BOOKING_ID,
      booking: {
        id: BOOKING_ID,
        status: 'pending_payment',
        userId: 'user-1',
        createdAt: new Date(),
        templePujaOfferingId: null,
        scheduledDate: null,
        scheduledTimeSlot: null,
      },
      storeOrders: [],
    });
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);

    await fireWebhook();
    await drain();

    const subjects = sendEmail.mock.calls.map((c: any[]) =>
      String(c[0]?.subject ?? ''),
    );
    expect(subjects.some((s: string) => /payment receipt/i.test(s))).toBe(true);
    // LEG-10 regression guard: no mail may call the attachment a tax invoice.
    expect(subjects.some((s: string) => /tax invoice/i.test(s))).toBe(false);
  });

  it('the capture claim is conditional — it can never re-capture an already-captured row', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);

    await fireWebhook();

    const claim = prismaMock.$executeRawUnsafe.mock.calls.find((c: unknown[]) =>
      /UPDATE payments/i.test(String(c[0])),
    );
    expect(claim).toBeDefined();
    expect(String(claim![0])).toMatch(/status\s*<>\s*'captured'/i);
  });
});
