import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (residual) — the ADMIN refund rail's GATEWAY CALL left no trace.
 *
 * `payment.service.processRefund` recorded exactly one money event:
 * REFUND_COMPLETED, emitted after its local `$transaction` commits. Everything
 * before that commit was invisible, and the call to Razorpay sat naked:
 *
 *     const refund = await razorpay.payments.refund(payment.gatewayPaymentId, {...});
 *
 * with no try, no catch and no event on either side of it. That produced two
 * blind spots, both of which are exactly the dispute this finding names:
 *
 *   1. A REFUSED refund left NOTHING. The throw propagated straight out of the
 *      method, so the Payment metadata write further down never ran either —
 *      not a crumb, not a status change, not a row. An admin could try to
 *      refund a devotee five times, be refused five times by the gateway, and
 *      the product would hold no evidence any attempt was ever made.
 *      `refund.service.ts:300` has recorded REFUND_FAILED since the first
 *      OPS-05 pass; the ADMIN rail — the one a human drives, and therefore the
 *      one where "on whose authority" actually has an answer — did not.
 *
 *   2. An ACCEPTED refund whose local `$transaction` then failed left nothing
 *      either. Razorpay has already debited us at that point, so the devotee IS
 *      refunded while `Payment.status` still reads `captured`. That divergence
 *      is the single most reconstruction-hostile state this rail can reach and
 *      REFUND_COMPLETED, emitted only after a commit that never happened, can
 *      never show it. `refund.service.ts:329` records REFUND_INITIATED at this
 *      point for precisely this reason.
 *
 * Only `recordMoneyEvent`, the leaf writer, is spied. `recordLedgerReversal`
 * and the ledger unwind run for real, as in the sibling
 * `payment.refund-ledger-audit.ops05.test.ts`.
 *
 * NON-VACUITY — measured, not assumed. Against the pre-fix `processRefund`
 * these five assertions fail:
 *   - 'refund.initiated' events: expected 1, received 0
 *   - 'refund.failed' events on a refused gateway: expected 1, received 0
 *   - REFUND_FAILED note carrying the gateway's own message: undefined
 *   - REFUND_INITIATED emitted before `$transaction` ran: no such event
 *   - REFUND_INITIATED surviving a failed `$transaction`: no such event
 * The two ordering/durability tests at the bottom are CHARACTERIZATION tests of
 * the post-commit contract — they pass before and after, and are here because
 * the contract they pin is the reason this module takes no `tx`.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

/** Interleaved log of what happened in what order, across mocks. */
const sequence: string[] = [];

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn((_input: unknown) =>
    Promise.resolve({ ok: true, wrote: true, id: 'evt-1' }),
  ),
}));

// MONEY_EVENTS stays REAL — asserting on a hand-typed 'refund.failed' would let
// a renamed constant pass a test that no longer describes the shipped event.
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

const BOOKING_ID = '44444444-4444-4444-4444-444444444444';
const ORIG_ENV = { ...process.env };

/** Events of one type the leaf writer was handed, in order. */
function eventsOfType(type: string) {
  return recordMoneyEventSpy.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((e) => e.eventType === type);
}

beforeEach(() => {
  vi.clearAllMocks();
  sequence.length = 0;
  process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
  process.env.RAZORPAY_KEY_SECRET = 'secret';

  razorpayRefund.mockImplementation(async () => {
    sequence.push('gateway-refund');
    return { id: 'rfnd_admin_1' };
  });

  recordMoneyEventSpy.mockImplementation((input: unknown) => {
    sequence.push(`event:${(input as { eventType: string }).eventType}`);
    return Promise.resolve({ ok: true, wrote: true, id: 'evt-1' });
  });

  prismaMock.$transaction.mockImplementation((async (fn: (tx: unknown) => unknown) => {
    sequence.push('tx-begin');
    const out = await fn(prismaMock);
    sequence.push('tx-commit');
    return out;
  }) as never);

  prismaMock.payment.update.mockImplementation((async () => {
    sequence.push('payment.update');
    return {};
  }) as never);
  prismaMock.pujaBooking.update.mockImplementation((async () => {
    sequence.push('pujaBooking.update');
    return {};
  }) as never);

  prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templePayout.updateMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templePayout.findMany.mockResolvedValue([] as never);
  prismaMock.commission.findMany.mockResolvedValue([] as never);
  prismaMock.priestPayout?.findMany?.mockResolvedValue?.([] as never);

  // Two different questions, two different answers — see the sibling test's
  // note. 0 lets the unwind proceed; 1 lets the durability probe attest.
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
    bookingNumber: 'BS-20260901-OPS05B',
    status: 'cancelled',
    cancelledAt: new Date('2026-09-01T00:00:00Z'),
    scheduledDate: new Date('2026-09-10T00:00:00Z'),
    scheduledTimeSlot: '09:00',
    priceAmount: new Prisma.Decimal('1100.00'),
    currency: 'INR',
    cancellationReason: null,
    payments: [
      {
        id: 'pay-ops05b',
        status: 'captured',
        amount: new Prisma.Decimal('1100.00'),
        refundAmount: null,
        currency: 'INR',
        gatewayPaymentId: 'pay_rzp_ops05b',
        metadata: {},
        createdAt: new Date(),
      },
    ],
  };
}

describe('OPS-05 — the admin refund rail records what the GATEWAY did', () => {
  it('records REFUND_INITIATED once Razorpay accepts, naming the admin and the refund id', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    const service = await loadService();

    await service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true });

    const events = eventsOfType('refund.initiated');
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.subjectType).toBe('payment');
    expect(event.subjectId).toBe('pay-ops05b');
    expect(event.bookingId).toBe(BOOKING_ID);
    expect(event.paymentId).toBe('pay-ops05b');
    // "on whose authority" — the sentence the finding is written around.
    expect(event.actorType).toBe('admin');
    expect(event.actorId).toBe('admin-77');
    expect(String(event.amount)).toBe('1100');
    expect(event.gateway).toBe('razorpay');
    expect(event.gatewayPaymentId).toBe('pay_rzp_ops05b');
    expect(event.gatewayRefundId).toBe('rfnd_admin_1');
    // The pre-image. Nothing else in the product retains it once the update
    // below rewrites Payment.status.
    expect(event.statusBefore).toBe('captured');
    // Bare natural key; the writer namespaces by event type, so sharing the
    // refund id with REFUND_COMPLETED must not collapse the two into one row.
    expect(event.idempotencyKey).toBe('rfnd_admin_1');
    expect((event.metadata as Record<string, unknown>).rail).toBe('admin');
  });

  it('records REFUND_INITIATED BEFORE the local transaction, because the money has already left', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    const service = await loadService();

    await service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true });

    // The order is the assertion: gateway debits us, we record that fact, and
    // only then do we touch our own rows. Recording after the commit — which is
    // all the pre-fix rail did — cannot describe a refund whose commit fails.
    expect(sequence.indexOf('gateway-refund')).toBeGreaterThanOrEqual(0);
    expect(sequence.indexOf('event:refund.initiated')).toBeGreaterThan(
      sequence.indexOf('gateway-refund'),
    );
    expect(sequence.indexOf('event:refund.initiated')).toBeLessThan(sequence.indexOf('tx-begin'));
  });

  it('records REFUND_FAILED when the gateway REFUSES, and still surfaces the gateway error', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    razorpayRefund.mockImplementation(async () => {
      sequence.push('gateway-refund');
      throw new Error('The refund amount is greater than the payment amount');
    });
    const service = await loadService();

    // The caller must still learn it failed — the audit write may not swallow
    // the gateway's refusal and report a refund that never happened.
    await expect(service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true })).rejects.toThrow(
      'The refund amount is greater than the payment amount',
    );

    const events = eventsOfType('refund.failed');
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.subjectId).toBe('pay-ops05b');
    expect(event.bookingId).toBe(BOOKING_ID);
    expect(event.actorType).toBe('admin');
    expect(event.actorId).toBe('admin-77');
    // The gateway's own words. This is the entire evidentiary value of the row:
    // pre-fix, Razorpay's reason existed only in a Render log line.
    expect(event.note).toBe('The refund amount is greater than the payment amount');
    expect(String(event.amount)).toBe('1100');
    expect(event.gatewayPaymentId).toBe('pay_rzp_ops05b');
    // Nothing moved, so neither status changed and there is no refund id.
    expect(event.statusBefore).toBe('captured');
    expect(event.statusAfter).toBe('captured');
    expect(event.gatewayRefundId).toBeUndefined();
    expect((event.metadata as Record<string, unknown>).rail).toBe('admin');
    expect((event.metadata as Record<string, unknown>).requestedInr).toBe('1100.00');
  });

  it('does NOT touch the local rows when the gateway refused', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    razorpayRefund.mockImplementation(async () => {
      throw new Error('gateway down');
    });
    const service = await loadService();

    await expect(
      service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true }),
    ).rejects.toThrow('gateway down');

    // A REFUND_FAILED row must never be mistakable for a refund that happened.
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(eventsOfType('refund.completed')).toHaveLength(0);
    expect(eventsOfType('refund.initiated')).toHaveLength(0);
  });

  it('keeps REFUND_INITIATED when the local transaction FAILS after the gateway debited us', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    prismaMock.$transaction.mockImplementation((async () => {
      sequence.push('tx-begin');
      throw new Error('deadlock detected');
    }) as never);
    const service = await loadService();

    await expect(
      service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true }),
    ).rejects.toThrow('deadlock detected');

    // THE state this finding exists for: the devotee HAS been refunded and
    // Payment.status still says `captured`. REFUND_COMPLETED is emitted only
    // after a commit that never happened, so without REFUND_INITIATED the
    // product would hold no record at all that ₹1,100 left the account.
    const initiated = eventsOfType('refund.initiated');
    expect(initiated).toHaveLength(1);
    expect(initiated[0]!.gatewayRefundId).toBe('rfnd_admin_1');
    expect(eventsOfType('refund.completed')).toHaveLength(0);
  });
});

describe('OPS-05 — the post-commit contract this module is built on', () => {
  // CHARACTERIZATION: these two pass before and after the fix. They pin the
  // reason `recordMoneyEvent` accepts no `tx` — a guarantee that is invisible
  // in the type signature and would be silently lost by a future refactor that
  // "tidied" the audit call into the transaction callback.
  it('emits REFUND_COMPLETED only AFTER the transaction has committed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    const service = await loadService();

    await service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true });

    const commit = sequence.indexOf('tx-commit');
    const completed = sequence.indexOf('event:refund.completed');
    expect(commit).toBeGreaterThanOrEqual(0);
    expect(completed).toBeGreaterThan(commit);
    // ...and the domain writes it describes happened inside that transaction.
    expect(sequence.indexOf('payment.update')).toBeGreaterThan(sequence.indexOf('tx-begin'));
    expect(sequence.indexOf('payment.update')).toBeLessThan(commit);
  });

  it('cannot roll back a committed domain write even if the audit write THROWS', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(capturedBooking() as never);
    // A catastrophic writer — worse than anything the real one can do, which
    // resolves `{ ok: false }` rather than throwing. If a thrown audit write
    // could unwind the refund, it would have to do it from here.
    recordMoneyEventSpy.mockImplementation((input: unknown) => {
      const type = (input as { eventType: string }).eventType;
      sequence.push(`event:${type}`);
      if (type === 'refund.completed') throw new Error('audit table exploded');
      return Promise.resolve({ ok: true, wrote: true, id: 'evt-1' });
    });
    const service = await loadService();

    await expect(
      service.processRefund(BOOKING_ID, 'admin-77', { fullRefund: true }),
    ).rejects.toThrow('audit table exploded');

    // The refund STANDS. The audit call sits outside the transaction, so the
    // commit had already happened when the writer blew up — the money is
    // refunded and the rows say so. A `tx`-joined writer would instead have
    // aborted the whole transaction in Postgres and un-refunded the devotee.
    expect(sequence).toContain('tx-commit');
    expect(sequence.indexOf('event:refund.completed')).toBeGreaterThan(
      sequence.indexOf('tx-commit'),
    );
    expect(prismaMock.payment.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-ops05b' },
        data: expect.objectContaining({ status: 'refunded' }),
      }),
    );
  });
});
