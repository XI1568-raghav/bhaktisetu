import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (coverage half) — the mint/reversal asymmetry.
 *
 * `refund.service.ts` records `COMMISSION_REVERSED` when a provider's earning
 * is unwound. Nothing anywhere recorded `COMMISSION_MINTED` — the constant was
 * declared in `MONEY_EVENTS` and had zero call sites in `apps/api/src`.
 *
 * That asymmetry is worse than a uniform gap. A reconstructed trail showed an
 * earning being VOIDED that never appeared to have been CREATED, so the
 * question the module's own docblock names — *"whether the pandit's earning
 * was minted before or after the refund"* — was unanswerable from the log in
 * exactly the direction that matters. Reversal without mint reads as a
 * platform clawing back money it never granted.
 *
 * This covers the confirm path: `writePujaCommissionOnConfirm`, which is the
 * writer both capture rails (POST /payments/verify and the Razorpay webhook)
 * call inside their transaction.
 *
 * ORDERING CONTRACT (the reason this test asserts *when*, not just *whether*):
 * the commission row is written INSIDE the caller's `$transaction`, but the
 * audit row must be written AFTER that transaction resolves. `recordMoneyEvent`
 * deliberately takes no `tx` — a failed audit INSERT inside the caller's
 * transaction would abort it in Postgres and roll back a real capture. So the
 * mint is captured to a variable inside the tx and recorded outside it.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

vi.mock('razorpay', () => ({
  default: class MockRazorpay {
    payments = { refund: vi.fn(), fetch: vi.fn() };
    orders = { create: vi.fn() };
  },
}));

const ORDER_ID = 'order_OPS05M';
const PAYMENT_ID = 'pay_OPS05M';
const BOOKING_ID = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';
const KEY_SECRET = 'test_secret_key';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  prismaMock.payment.findFirst.mockResolvedValue({
    id: 'pmt-ops05-mint',
    amount: new Prisma.Decimal('5000.00'),
    status: 'initiated',
    currency: 'INR',
    metadata: {},
    gatewayPaymentId: null,
    bookingId: BOOKING_ID,
    booking: {
      id: BOOKING_ID,
      bookingNumber: 'BS-20260828-MINT1',
      status: 'pending_payment',
      userId: 'user-1',
      createdAt: new Date(),
      templePujaOfferingId: null,
      priestPujaOfferingId: null,
      scheduledDate: new Date('2026-09-01T00:00:00Z'),
      scheduledTimeSlot: '09:00-10:00',
    },
  } as never);
  prismaMock.payment.update.mockResolvedValue({} as never);
  prismaMock.pujaBooking.update.mockResolvedValue({} as never);
  // The booking as writePujaCommissionOnConfirm reads it: a pandit is on it
  // and that pandit has a linked User, so the mint is not short-circuited.
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: BOOKING_ID,
    priceAmount: new Prisma.Decimal('5000.00'),
    priestPayout: new Prisma.Decimal('4000.00'),
    priestId: 'priest-1',
    priest: { userId: 'user-priest-1' },
    // Read by writeTemplePayoutOnConfirm off the same findUnique mock.
    templeId: null,
    platformCommission: new Prisma.Decimal('1000.00'),
  } as never);
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
  prismaMock.commission.create.mockResolvedValue({ id: 'cm-minted-1' } as never);
  // The temple share is a separate writer on the same confirm path and is not
  // what this file is about — short it out on its own idempotency guard.
  prismaMock.templePayout.findFirst.mockResolvedValue({ id: 'tp-existing' } as never);
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

function recordedEvents(): Array<Record<string, unknown>> {
  return recordMoneyEventSpy.mock.calls.map(
    (c) => (c as unknown as [Record<string, unknown>])[0],
  );
}

describe('OPS-05 — a minted provider earning reaches the money trail', () => {
  it('records COMMISSION_MINTED on the client-verify confirm rail', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    await verify();

    const minted = recordedEvents().filter(
      (e) => e.eventType === MONEY_EVENTS.COMMISSION_MINTED,
    );
    expect(minted).toHaveLength(1);

    const event = minted[0]!;
    expect(event.subjectType).toBe('commission');
    expect(event.subjectId).toBe('cm-minted-1');
    expect(event.commissionId).toBe('cm-minted-1');
    expect(event.bookingId).toBe(BOOKING_ID);
    // `Commission.amount` is the PROVIDER's earning (lib/commission-math.ts:
    // one column, one meaning). The trail must carry the same figure the
    // ledger row carries, in rupees — not the booking price, not paise.
    expect(String(event.amount)).toBe('4000');
    expect(event.statusAfter).toBe('PENDING');
    expect(event.idempotencyKey).toBe('cm-minted-1');
  });

  it('records the mint AFTER the transaction commits, never inside it', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    let eventsSeenInsideTx = -1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      const result = await fn(prismaMock);
      // Sampled at the moment the tx callback returns, i.e. while a real
      // transaction would still be open.
      eventsSeenInsideTx = recordMoneyEventSpy.mock.calls.length;
      return result;
    });

    await verify();

    // Nothing was recorded while the transaction was still open. A failed
    // audit INSERT inside the caller's tx aborts it in Postgres and would roll
    // back a real capture — which is why recordMoneyEvent takes no `tx`.
    expect(eventsSeenInsideTx).toBe(0);
    expect(
      recordedEvents().filter((e) => e.eventType === MONEY_EVENTS.COMMISSION_MINTED),
    ).toHaveLength(1);
  });

  it('records no mint when the ledger row already existed (idempotent re-run)', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'cm-existing' } as never);

    await verify();

    expect(prismaMock.commission.create).not.toHaveBeenCalled();
    // No row was minted, so no mint may be claimed. Logging one here would
    // report a second earning that does not exist.
    expect(
      recordedEvents().filter((e) => e.eventType === MONEY_EVENTS.COMMISSION_MINTED),
    ).toHaveLength(0);
  });

  it('records no mint when the pandit has no linked User (RV-04 orphan guard)', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: BOOKING_ID,
      priceAmount: new Prisma.Decimal('5000.00'),
      priestPayout: new Prisma.Decimal('4000.00'),
      priestId: 'priest-1',
      priest: { userId: null },
    } as never);

    await verify();

    expect(prismaMock.commission.create).not.toHaveBeenCalled();
    expect(
      recordedEvents().filter((e) => e.eventType === MONEY_EVENTS.COMMISSION_MINTED),
    ).toHaveLength(0);
  });
});
