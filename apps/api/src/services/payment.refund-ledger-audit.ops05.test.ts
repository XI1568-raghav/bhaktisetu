import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (residual) — the two refund rails in `payment.service.ts` unwound the
 * provider ledger and left NO durable record of having done so.
 *
 * `services/ledger-reversal.service.ts` names its four callers in a comment and
 * states the defect plainly: "Exactly ONE of them — refund.service.ts:484 —
 * records `COMMISSION_REVERSED`." A shared emitter, `recordLedgerReversal`, was
 * written to close that, and then had ZERO production call sites — measured by
 * grepping `apps/api/src` for the identifier and finding it only in its own
 * declaration and its own unit test.
 *
 * So the trail carried REFUND_COMPLETED ("the devotee got money back") for both
 * of these rails and nothing at all about whether the pandit's 80% and the
 * temple's share were clawed back with it. Those are separate facts, and the
 * second is the disputable one: booking BS-20260812-J3M76 was refunded ₹1,151
 * on the admin rail and a ₹770 payout was still raised against it.
 *
 * These tests assert through the REAL `recordLedgerReversal` — only
 * `recordMoneyEvent`, the leaf writer, is spied — so they exercise the wiring,
 * the durability probe and the payload shaping the way production does. Both
 * FAIL against the unfixed rails, where no COMMISSION_REVERSED event is emitted
 * from `payment.service.ts` at all.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  // The parameter is declared so `mock.calls` is a 1-tuple and the event under
  // assertion is reachable by index rather than through an `any` cast.
  recordMoneyEventSpy: vi.fn((_input: unknown) =>
    Promise.resolve({ ok: true, wrote: true, id: 'evt-1' }),
  ),
}));

// MONEY_EVENTS stays REAL: asserting against a hand-typed 'commission.reversed'
// would let a renamed constant pass a test that no longer describes the event
// the product ships.
vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

vi.mock('./booking-notify.service.js', () => ({
  notifyRefundProcessed: vi.fn(async () => undefined),
}));

const razorpayRefund = vi.fn(async () => ({ id: 'rfnd_admin_1' }));

vi.mock('razorpay', () => ({
  default: class MockRazorpay {
    payments = { refund: razorpayRefund, fetch: vi.fn() };
    orders = { create: vi.fn() };
  },
}));

const BOOKING_ID = '33333333-3333-3333-3333-333333333333';
const WEBHOOK_SECRET = 'ops05_webhook_secret';
const ORIG_ENV = { ...process.env };

/** Every COMMISSION_REVERSED event the leaf writer was handed, in order. */
function reversalEvents() {
  return recordMoneyEventSpy.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((e) => e.eventType === 'commission.reversed');
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
  process.env.RAZORPAY_KEY_SECRET = 'secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

  prismaMock.$transaction.mockImplementation((async (fn: (tx: unknown) => unknown) =>
    fn(prismaMock)) as never);
  prismaMock.payment.update.mockResolvedValue({} as never);
  prismaMock.pujaBooking.update.mockResolvedValue({} as never);
  prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templePayout.updateMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templePayout.findMany.mockResolvedValue([] as never);
  prismaMock.commission.findMany.mockResolvedValue([] as never);
  prismaMock.priestPayout?.findMany?.mockResolvedValue?.([] as never);

  // `commission.count` is asked TWO different questions on this path and the
  // answers must differ, or the test proves nothing:
  //   - inside reverseBookingLedger: "is any commission already PAID / attached
  //     to a payout?" -> 0, so the unwind is allowed to proceed;
  //   - inside recordLedgerReversal: the durability probe, "did a REVERSED row
  //     actually survive the caller's transaction?" -> 1, so the emitter is
  //     permitted to attest to it.
  prismaMock.commission.count.mockImplementation(async (args: never) => {
    const where = (args as unknown as { where?: { status?: string } })?.where;
    return where?.status === 'REVERSED' ? 1 : 0;
  });
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

/** A ₹1,100 capture on a cancelled booking, nothing refunded yet. */
function capturedBooking() {
  return {
    id: BOOKING_ID,
    bookingNumber: 'BS-20260901-OPS05',
    status: 'cancelled',
    cancelledAt: new Date('2026-09-01T00:00:00Z'),
    scheduledDate: new Date('2026-09-10T00:00:00Z'),
    scheduledTimeSlot: '09:00',
    priceAmount: new Prisma.Decimal('1100.00'),
    currency: 'INR',
    payments: [
      {
        id: 'pay-ops05',
        status: 'captured',
        amount: new Prisma.Decimal('1100.00'),
        refundAmount: null,
        currency: 'INR',
        gatewayPaymentId: 'pay_rzp_ops05',
        metadata: {},
        createdAt: new Date(),
      },
    ],
  };
}

describe('OPS-05 — the ADMIN refund rail records the ledger unwind it performs', () => {
  it('emits COMMISSION_REVERSED for a full refund, tagged rail=admin and attributed to the admin', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    const service = await loadService();

    await service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true });

    const events = reversalEvents();
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.bookingId).toBe(BOOKING_ID);
    expect(event.subjectId).toBe(BOOKING_ID);
    // Authority is the whole point of the finding: "who initiated the refund,
    // and when, and on whose authority".
    expect(event.actorType).toBe('admin');
    expect(event.actorId).toBe('admin-77');
    expect(event.statusAfter).toBe('reversed');
    expect(event.gatewayRefundId).toBe('rfnd_admin_1');
    // Bare natural key. The writer namespaces it by event type, so sharing the
    // refund id with REFUND_COMPLETED must NOT collapse the two into one row.
    expect(event.idempotencyKey).toBe('rfnd_admin_1');

    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.rail).toBe('admin');
    expect(metadata.fullyRefunded).toBe(true);
    expect(metadata.reversedCommissions).toBe(1);
    expect(metadata.reversedTemplePayouts).toBe(1);
  });

  it('emits COMMISSION_REVERSED for a PARTIAL refund carrying the claw-back figure, not the refund figure', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    // A pending ₹880 provider commission, to be scaled by the partial.
    prismaMock.commission.findMany.mockResolvedValue([
      { id: 'c1', amount: new Prisma.Decimal('880.00') },
    ] as never);
    prismaMock.commission.update.mockResolvedValue({} as never);
    const service = await loadService();

    // ₹550 back on a ₹1,100 capture: the devotee gets 550, the provider loses
    // half of 880 = 440. Those are different numbers and the event is about the
    // second one.
    await service.processRefund(BOOKING_ID, 'admin-77', { amountInr: 550 });

    const events = reversalEvents();
    expect(events).toHaveLength(1);

    const event = events[0]!;
    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.rail).toBe('admin');
    expect(metadata.fullyRefunded).toBe(false);
    expect(metadata.scaledCommissions).toBe(1);
    expect(metadata.clawedBackInr).toBe('440.00');
    expect(event.statusAfter).toBe('reduced');
    // `amount` defaults to the claw-back, NOT the ₹550 handed to the devotee.
    expect(String(event.amount)).toBe('440.00');
  });

  it('still records when the unwind was BLOCKED by an already-settled commission', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    // Nothing reversible, and one row that is already PAID or attached to a
    // payout. This is the double-pay case — devotee refunded, provider keeps
    // the earning — and it is the one outcome that must never be silent.
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.commission.count.mockImplementation(async (args: never) => {
      const where = (args as unknown as { where?: { status?: string } })?.where;
      // Durability probe finds nothing (nothing was reversed) — the emitter
      // must not gate on it when the reason for zero rows is a BLOCK.
      return where?.status === 'REVERSED' ? 0 : 2;
    });
    const service = await loadService();

    await service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true });

    const events = reversalEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.statusAfter).toBe('blocked');
    expect((events[0]!.metadata as Record<string, unknown>).alreadySettled).toBe(2);
  });

  it('a refund whose ledger unwind moved nothing at all writes no attestation', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.commission.count.mockResolvedValue(0 as never);
    const service = await loadService();

    await service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true });

    // A row saying "we unwound zero commissions" reads back later as proof the
    // unwind ran, when all it proves is that it found nothing to do.
    expect(reversalEvents()).toHaveLength(0);
    // ...but the refund itself is still recorded, so this is a gap in the
    // attestation, not a gap in the trail.
    const types = recordMoneyEventSpy.mock.calls.map(
      (c) => (c[0] as { eventType: string }).eventType,
    );
    expect(types).toContain('refund.completed');
  });
});

describe('OPS-05 — the RAZORPAY WEBHOOK refund rail records the ledger unwind it performs', () => {
  function refundWebhook(amountPaise: number) {
    return {
      event: 'refund.created',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_dashboard_1',
            payment_id: 'pay_rzp_ops05',
            amount: amountPaise,
          },
        },
      },
    };
  }

  function capturedPaymentRow() {
    return {
      id: 'pay-ops05',
      bookingId: BOOKING_ID,
      status: 'captured',
      amount: new Prisma.Decimal('1100.00'),
      refundAmount: null,
      currency: 'INR',
      gatewayPaymentId: 'pay_rzp_ops05',
      metadata: {},
    };
  }

  /**
   * Delivered through the PUBLIC entry point with a real HMAC, not by reaching
   * into the private dispatcher: the signature gate is part of this rail and a
   * test that skips it would not notice if the webhook stopped being reachable.
   */
  async function deliver(amountPaise: number) {
    const service = await loadService();
    const payload = refundWebhook(amountPaise);
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    return service.handleWebhook(payload, signature);
  }

  it('emits COMMISSION_REVERSED tagged rail=razorpay-webhook and actor=gateway', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(capturedPaymentRow() as never);

    // A full refund raised straight in the Razorpay dashboard: 110000 paise.
    await deliver(110000);

    const events = reversalEvents();
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.bookingId).toBe(BOOKING_ID);
    // 'gateway' is a DIFFERENT fact from 'admin'. A dashboard refund has no
    // admin id and no request of ours behind it; folding the two together is
    // what makes a refund trail useless in a dispute.
    expect(event.actorType).toBe('gateway');
    expect(event.actorId).toBeNull();
    expect(event.gatewayRefundId).toBe('rfnd_dashboard_1');
    expect(event.idempotencyKey).toBe('rfnd_dashboard_1');
    expect(event.statusAfter).toBe('reversed');
    expect((event.metadata as Record<string, unknown>).rail).toBe('razorpay-webhook');
    expect(String(event.note)).toContain('rfnd_dashboard_1');
  });

  it('records the PARTIAL unwind a dashboard refund triggers', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(capturedPaymentRow() as never);
    prismaMock.commission.findMany.mockResolvedValue([
      { id: 'c1', amount: new Prisma.Decimal('880.00') },
    ] as never);
    prismaMock.commission.update.mockResolvedValue({} as never);

    // ₹550 of ₹1,100 — 55000 paise.
    await deliver(55000);

    const events = reversalEvents();
    expect(events).toHaveLength(1);
    const metadata = events[0]!.metadata as Record<string, unknown>;
    expect(metadata.rail).toBe('razorpay-webhook');
    expect(metadata.fullyRefunded).toBe(false);
    expect(metadata.clawedBackInr).toBe('440.00');
  });

  it('a refund event we already applied ourselves is deduped before any unwind or attestation', async () => {
    // `metadata.refundIds` already carries this id — the admin rail raised it,
    // and recorded it. The webhook must not unwind or attest a second time.
    prismaMock.payment.findFirst.mockResolvedValue({
      ...capturedPaymentRow(),
      metadata: { refundIds: ['rfnd_dashboard_1'] },
    } as never);

    const result = await deliver(110000);

    expect((result as { duplicate?: boolean }).duplicate).toBe(true);
    expect(reversalEvents()).toHaveLength(0);
  });
});
