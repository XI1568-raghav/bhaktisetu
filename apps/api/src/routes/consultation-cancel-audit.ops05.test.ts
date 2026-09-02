import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (residual) — POST /consultation/:id/cancel emitted NO money event at
 * all, and it is the rail with the least surviving evidence of any of them.
 *
 * `ledger-reversal.service.ts` lists its four callers and names this one —
 * `routes/consultation.ts:817` — among the three that unwound the provider
 * ledger and recorded nothing. It is worse off than the other two:
 *
 *   - `astrologer_consultations` is a RAW-SQL table with no Prisma model and no
 *     status history, so the row itself only ever shows `status = 'cancelled'`.
 *     Not who cancelled, not when, not whether a refund was owed.
 *   - the handler PROMISES a refund in its response body ("Refund will be
 *     processed within 5-7 business days") while raising no gateway refund, so
 *     a later manual refund in the Razorpay dashboard had no origin record to
 *     be matched against.
 *   - it unwinds the astrologer's 80% (AW-06) and, until now, left no trace of
 *     the claw-back — including the `alreadySettled` case, which is the
 *     double-pay outcome the handler already log-flags for hand reconciliation.
 *
 * Only `recordMoneyEvent`, the leaf writer, is spied; `recordLedgerReversal`
 * runs for real. Every assertion below FAILS against the unfixed handler, where
 * `recordMoneyEvent` is called zero times on this route.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  // The parameter is declared so `mock.calls` is a 1-tuple and the recorded
  // event is reachable by index rather than through an `any` cast.
  recordMoneyEventSpy: vi.fn((_input: unknown) =>
    Promise.resolve({ ok: true, wrote: true, id: 'evt-1' }),
  ),
}));

// MONEY_EVENTS stays real — a renamed constant must break this test, not slip
// past a hand-typed string literal.
vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

const DEVOTEE_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';
const CONSULTATION_ID = '5523ab80-6591-43f0-9205-59ac341035b0';

const DEMO_DEVOTEE = {
  id: DEVOTEE_ID,
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

/** A confirmed, paid consultation scheduled comfortably inside the refund window. */
function confirmedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CONSULTATION_ID,
    reference: 'AC-20260901-OPS05',
    user_id: DEVOTEE_ID,
    astrologer_id: '71e54617-6963-418e-845f-920f4350505b',
    astrologer_name: 'Acharya Vinod Sharma',
    minutes: 20,
    per_minute_rate_inr: '25.00',
    amount_inr: '500.00',
    currency: 'INR',
    status: 'confirmed',
    room_name: 'darshya-astrologer-acharya-vinod-sharma-e8cacedaa8ac',
    razorpay_order_id: 'order_ac_ops05',
    razorpay_payment_id: 'pay_ac_ops05',
    scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    paid_at: new Date(),
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  return app;
}

/** Events the leaf writer was handed, by type. */
function eventsOfType(type: string) {
  return recordMoneyEventSpy.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((e) => e.eventType === type);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
    return null;
  });
  prismaMock.$executeRawUnsafe.mockResolvedValue(0 as never);
  prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 } as never);
  prismaMock.pujaBooking.update.mockResolvedValue({} as never);

  // Two different questions, two different answers — see the payment-rail
  // sibling test for the full note. `alreadySettled` must be 0 so the unwind
  // proceeds; the REVERSED probe must be > 0 so the emitter may attest.
  prismaMock.commission.count.mockImplementation(async (args: never) => {
    const where = (args as unknown as { where?: { status?: string } })?.where;
    return where?.status === 'REVERSED' ? 1 : 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OPS-05 — cancelling a paid consultation leaves a durable money trail', () => {
  it('records REFUND_INITIATED naming the devotee, the amount and the gateway ids', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmedRow()] as never);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().refundEligible).toBe(true);

    const events = eventsOfType('refund.initiated');
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.subjectType).toBe('consultation');
    expect(event.subjectId).toBe(CONSULTATION_ID);
    // Who cancelled, on whose authority — the whole point of the finding.
    expect(event.actorType).toBe('devotee');
    expect(event.actorId).toBe(DEVOTEE_ID);
    expect(String(event.amount)).toBe('500.00');
    expect(event.currency).toBe('INR');
    // The gateway ids are the only handle a later manual dashboard refund can
    // be reconciled against; the raw-SQL row keeps no history of them.
    expect(event.gatewayOrderId).toBe('order_ac_ops05');
    expect(event.gatewayPaymentId).toBe('pay_ac_ops05');
    expect(event.statusBefore).toBe('confirmed');
    expect(event.statusAfter).toBe('cancelled');
    expect(event.idempotencyKey).toBe(CONSULTATION_ID);

    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.rail).toBe('consultation-cancel');
    expect(metadata.reference).toBe('AC-20260901-OPS05');
    expect(metadata.refundEligible).toBe(true);
  });

  it('records COMMISSION_REVERSED for the astrologer claw-back it performs', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmedRow()] as never);

    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });

    const events = eventsOfType('commission.reversed');
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.bookingId).toBe(CONSULTATION_ID);
    expect(event.actorType).toBe('devotee');
    expect(event.actorId).toBe(DEVOTEE_ID);
    expect(event.statusAfter).toBe('reversed');
    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.rail).toBe('consultation-cancel');
    expect(metadata.reversedCommissions).toBe(1);
  });

  it('records the claw-back even when it was BLOCKED by an already-settled commission', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmedRow()] as never);
    // Nothing reversible; one commission already PAID or attached to a payout.
    // The devotee is promised a refund and the astrologer keeps the earning —
    // the handler already log-flags this for hand reconciliation, and the trail
    // must carry it too or the reconciliation has no source document.
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.commission.count.mockImplementation(async (args: never) => {
      const where = (args as unknown as { where?: { status?: string } })?.where;
      return where?.status === 'REVERSED' ? 0 : 1;
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.json().ledgerManualReview).toBe(1);

    const events = eventsOfType('commission.reversed');
    expect(events).toHaveLength(1);
    expect(events[0]!.statusAfter).toBe('blocked');
    expect((events[0]!.metadata as Record<string, unknown>).alreadySettled).toBe(1);
  });

  it('a cancellation OUTSIDE the refund window is still recorded, and unwinds nothing', async () => {
    // Scheduled in 2 hours: past the 24h window, so no refund is owed and the
    // astrologer keeps the earning. That is a legitimate outcome, but it is
    // still a money decision made about a paid consultation and it must be
    // reconstructable — a devotee disputing "I cancelled and got nothing back"
    // is answered by this row and nothing else.
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      confirmedRow({ scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000) }),
    ] as never);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.json().refundEligible).toBe(false);

    // REFUND_FAILED, not REFUND_INITIATED: no refund is owed, and recording an
    // initiation that will never complete would leave a permanent open item in
    // the trail for every out-of-window cancellation.
    expect(eventsOfType('refund.initiated')).toHaveLength(0);
    const failed = eventsOfType('refund.failed');
    expect(failed).toHaveLength(1);
    expect(String(failed[0]!.note)).toContain('outside the 24h window');
    expect((failed[0]!.metadata as Record<string, unknown>).refundEligible).toBe(false);

    // No unwind ran, so there is nothing to attest to.
    expect(eventsOfType('commission.reversed')).toHaveLength(0);
    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
  });

  it('a second cancel of an already-cancelled consultation writes nothing new', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      confirmedRow({ status: 'cancelled' }),
    ] as never);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.json().alreadyCancelled).toBe(true);
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });
});
