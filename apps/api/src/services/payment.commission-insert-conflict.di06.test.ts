import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * DI-06 (second half) — the confirm-path commission writers survive the very
 * race the UNIQUE index was added to stop.
 *
 * WHAT THE FIRST HALF DID, AND WHAT IT LEFT BEHIND.
 *
 * migrations/20260824000000_di0607_money_key_indexes creates
 * `commissions_booking_id_key` and `commissions_store_order_id_key` — the
 * database-level expression of a rule ten writers had only ever asserted in
 * application code: at most one Commission per booking, at most one per store
 * order. That is the right constraint and it is not in question here.
 *
 * But a constraint changes what a LOSING racer experiences. Before it, two
 * transactions that both passed `findFirst` both INSERTed and the ledger
 * silently gained a duplicate payable. After it, the second INSERT raises
 * 23505, and Prisma surfaces P2002. Two things then follow, and neither is
 * theoretical in this file:
 *
 *   1. `writePujaCommissionOnConfirm` runs INSIDE the caller's `$transaction`
 *      (P1-12 moved it there deliberately, so a failed ledger write rolls back
 *      the capture rather than leaving a confirmed booking with no payable).
 *      A statement error inside a Postgres transaction aborts the WHOLE
 *      transaction — every later statement fails with 25P02 — and Prisma does
 *      not wrap individual queries in savepoints, so catching P2002 in
 *      JavaScript does NOT recover it. The capture, the confirm and the temple
 *      share all roll back with it.
 *   2. The race is not hypothetical. `claimCaptureTransition` (PAY-09) exists
 *      precisely because BOTH confirmation rails — POST /payments/verify and
 *      the Razorpay webhook — can be in flight for one booking at once, and
 *      its own comment records the decision to gate only the notices and leave
 *      the ledger writes ungated "because they carry their own findFirst
 *      idempotency guards". Those guards are exactly what the UNIQUE index
 *      turns from silently-wrong into loudly-fatal.
 *
 * So the constraint alone converts a rare duplicate row into a rolled-back
 * payment. The fix is to make the INSERT itself conflict-tolerant:
 * `createMany({ data: [...], skipDuplicates: true })`, which Prisma compiles to
 * `INSERT ... ON CONFLICT DO NOTHING`. That is not an error, so it does not
 * abort the transaction; the loser simply writes nothing, which is the
 * behaviour the findFirst guard was reaching for all along.
 *
 * IT IS ALSO CORRECT WHERE THE CONSTRAINT DOES NOT EXIST. The DI-06 migration
 * creates each UNIQUE index only after proving the key holds no duplicates, and
 * announces a skip with RAISE WARNING — so on a dirty production table the
 * constraint may legitimately be absent. With no constraint, ON CONFLICT DO
 * NOTHING never fires and the findFirst guard is doing all the work, exactly as
 * before. The change is safe in both worlds, which matters because production
 * is suspended and which world this is cannot currently be established.
 *
 * WHAT THIS FILE DOES NOT CLAIM. Eight other writers still use a bare `create`
 * (store-commission.service.ts, wellness-sessions.ts, consultation.ts,
 * provider-earning-mint.ts, booking.service.ts, temple-payout.service.ts,
 * bookings.ts, priest.service.ts). They are in other files and are not touched.
 * payment.service.ts is where the two-rail race is documented and real.
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

const ORDER_ID = 'order_DI06C';
const PAYMENT_ID = 'pay_DI06C';
const BOOKING_ID = 'dddddddd-0000-4000-8000-dddddddddddd';
const KEY_SECRET = 'test_secret_key';

const ORIG_ENV = { ...process.env };

async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

function signature(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function verifyPuja() {
  const service = await loadService();
  return service.verifyPayment(ORDER_ID, PAYMENT_ID, signature(ORDER_ID, PAYMENT_ID), 'user-1');
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  prismaMock.payment.findFirst.mockResolvedValue({
    id: 'pmt-di06-conflict',
    amount: new Prisma.Decimal('5000.00'),
    status: 'initiated',
    currency: 'INR',
    metadata: {},
    gatewayPaymentId: null,
    bookingId: BOOKING_ID,
    booking: {
      id: BOOKING_ID,
      bookingNumber: 'BS-20260828-DI06C',
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
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: BOOKING_ID,
    priceAmount: new Prisma.Decimal('5000.00'),
    priestPayout: new Prisma.Decimal('4000.00'),
    priestId: 'priest-1',
    priest: { userId: 'user-priest-1' },
    templeId: null,
    platformCommission: new Prisma.Decimal('1000.00'),
  } as never);
  // No existing row: the writer gets past its guard and reaches the INSERT,
  // which is the only place this file is about.
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);
  // The temple share is a separate writer on the same confirm path; short it
  // out on its own guard so it cannot colour these assertions.
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

describe('DI-06 — the puja confirm inserts the commission conflict-tolerantly', () => {
  it('inserts with skipDuplicates, and never with a bare create', async () => {
    await verifyPuja();

    // The bare `create` is the statement that raises 23505 and poisons the
    // enclosing transaction. It must not be on this path at all.
    expect(prismaMock.commission.create).not.toHaveBeenCalled();

    expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
    const args = prismaMock.commission.createMany.mock.calls[0]![0] as {
      data: Array<Record<string, unknown>>;
      skipDuplicates?: boolean;
    };
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(1);
  });

  it('writes the same row it always wrote — the ledger columns are unchanged', async () => {
    await verifyPuja();

    const row = (
      prismaMock.commission.createMany.mock.calls[0]![0] as {
        data: Array<Record<string, unknown>>;
      }
    ).data[0]!;
    expect(row.bookingId).toBe(BOOKING_ID);
    // lib/commission-math.ts: `amount` is the PROVIDER's earning (the 80%),
    // `percentage` is the PLATFORM's take rate. Getting these the wrong way
    // round is RV-04, a 75% underpayment that looks like a working ledger.
    expect(row.providerId).toBe('user-priest-1');
    expect(String(row.amount)).toBe('4000');
    expect(String(row.percentage)).toBe('0.2');
    expect(row.status).toBe('PENDING');
  });

  it('a lost race writes nothing and does NOT abort the capture', async () => {
    // ON CONFLICT DO NOTHING: the other rail got there between our findFirst
    // and our INSERT. Under a bare `create` this is P2002 propagating out of
    // the `$transaction` — capture, confirm and temple share all rolled back,
    // and the caller answering 500 to a payment Razorpay has already taken.
    prismaMock.commission.createMany.mockResolvedValue({ count: 0 } as never);

    await expect(verifyPuja()).resolves.toMatchObject({ verified: true });

    // The confirm still happened: the payment was captured and the booking moved.
    expect(prismaMock.payment.update).toHaveBeenCalled();
    expect(prismaMock.pujaBooking.update).toHaveBeenCalled();
  });

  it('a lost race records no COMMISSION_MINTED — this transaction minted nothing', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    prismaMock.commission.createMany.mockResolvedValue({ count: 0 } as never);

    await verifyPuja();

    // Logging a mint for a row the winner created would put a second
    // COMMISSION_MINTED on the trail for one earning — the mirror image of the
    // asymmetry OPS-05 exists to remove.
    expect(
      recordedEvents().filter((e) => e.eventType === MONEY_EVENTS.COMMISSION_MINTED),
    ).toHaveLength(0);
  });

  it('a won race reads the id back and puts THAT id on the money trail', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    // First call is the idempotency guard (no row yet); the second is the
    // read-back, because createMany cannot return generated ids on Postgres.
    prismaMock.commission.findFirst
      .mockResolvedValueOnce(null as never)
      .mockResolvedValue({ id: 'cm-di06-won' } as never);
    prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);

    await verifyPuja();

    const minted = recordedEvents().filter(
      (e) => e.eventType === MONEY_EVENTS.COMMISSION_MINTED,
    );
    expect(minted).toHaveLength(1);
    expect(minted[0]!.commissionId).toBe('cm-di06-won');
    expect(minted[0]!.subjectId).toBe('cm-di06-won');
    expect(minted[0]!.bookingId).toBe(BOOKING_ID);
  });

  it('an insert that lands but cannot be read back mints nothing rather than a fake id', async () => {
    // A driver that answers nothing is not answering SQL. Keying an audit row
    // on `undefined` would put an unresolvable commission id on the money trail.
    prismaMock.commission.findFirst.mockResolvedValue(null as never);
    prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);

    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    await expect(verifyPuja()).resolves.toMatchObject({ verified: true });
    expect(
      recordedEvents().filter((e) => e.eventType === MONEY_EVENTS.COMMISSION_MINTED),
    ).toHaveLength(0);
  });

  it('an existing row still short-circuits before any insert at all', async () => {
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'cm-existing' } as never);

    await verifyPuja();

    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
    expect(prismaMock.commission.create).not.toHaveBeenCalled();
  });
});

describe('DI-06 — the store-order confirm inserts the commission conflict-tolerantly', () => {
  async function verifyStore() {
    const service = await loadService();
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-store-di06',
      storeOrders: [
        {
          id: 'so-di06',
          orderNumber: 'ORD-DI06',
          status: 'PENDING',
          statusHistory: [],
          userId: 'user-1',
        },
      ],
    } as never);
    prismaMock.storeOrder.update.mockResolvedValue({} as never);
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-di06',
      orderNumber: 'ORD-DI06',
      user: { fullName: 'User One', email: 'user-1@example.com' },
      items: [{ productId: 'p-1', qty: 2, priceAtPurchase: 250, name: 'Diya' }],
      shippingAddress: {
        fullName: 'User One',
        line1: '12 Ashok Rd',
        city: 'Delhi',
        pincode: '110001',
        country: 'India',
      },
      totalAmountInr: new Prisma.Decimal('500.00'),
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    } as never);
    prismaMock.storeProduct.findUnique.mockResolvedValue({ storeProfileId: 'sp-1' } as never);
    prismaMock.storeProfile.findUnique.mockResolvedValue({
      userId: 'store-owner-1',
      commission: new Prisma.Decimal('0.20'),
    } as never);
    return service.verifyStoreOrderPayment('order_demo_x', 'pay_x', 'demo', 'user-1');
  }

  it('inserts with skipDuplicates, and never with a bare create', async () => {
    await verifyStore();

    expect(prismaMock.commission.create).not.toHaveBeenCalled();
    expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
    const args = prismaMock.commission.createMany.mock.calls[0]![0] as {
      data: Array<Record<string, unknown>>;
      skipDuplicates?: boolean;
    };
    expect(args.skipDuplicates).toBe(true);
    expect(args.data[0]!.storeOrderId).toBe('so-di06');
    // 20% platform cut on ₹500 leaves the store owner ₹400.
    expect(String(args.data[0]!.amount)).toBe('400');
    expect(String(args.data[0]!.percentage)).toBe('0.2');
  });

  it('a lost race leaves the order confirmed rather than rolling the capture back', async () => {
    prismaMock.commission.createMany.mockResolvedValue({ count: 0 } as never);

    await expect(verifyStore()).resolves.toMatchObject({ verified: true });
    expect(prismaMock.storeOrder.update).toHaveBeenCalled();
  });
});
