import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (residual) — the consultation rail recorded its CANCELLATION and
 * nothing else. Every step by which money arrived was silent.
 *
 * The earlier pass wired `POST /consultation/:id/cancel` (see
 * `consultation-cancel-audit.ops05.test.ts`). The three transitions BEFORE it
 * were still unwired, and this rail is the least reconstructible of the four
 * money rails in the product:
 *
 *   - `astrologer_consultations` is a RAW-SQL table with no Prisma model, no
 *     status history and no `updated_at`. It stores only its current state.
 *   - it writes NO `prisma.payment` row at all — `findConsultationByOrderId`
 *     exists precisely because the webhook cannot resolve these through the
 *     Payment table — so unlike the puja rail there is no second table holding
 *     a parallel copy of the story.
 *
 * The three gaps:
 *
 *   1. POST /book opened a Razorpay ORDER and recorded nothing. The puja rail
 *      (payment.service.createRazorpayOrder) and the donation rail
 *      (routes/donations) both emit PAYMENT_INITIATED here. A consultation's
 *      trail therefore began at confirmation, with an order id that appeared
 *      from nowhere and no record of who asked for it or what it was for.
 *
 *   2/3. TWO rails confirm a consultation — POST /verify-payment (the devotee
 *      returned with a signature) and `finalizeConsultationPaymentFromWebhook`
 *      (the devotee closed the tab and Razorpay told us). They write the SAME
 *      four columns: status, razorpay_payment_id, paid_at, room_name. Once
 *      either had run the finished row was byte-identical whichever produced
 *      it, so "which rail got there first" — the question `lib/audit-money.ts`
 *      names in its own header as the reason the trail exists — was
 *      unanswerable for this rail. The webhook case is the sharper one: it
 *      deliberately accepts `cancelled` rows, silently un-cancelling a
 *      consultation the expiry cron had already taken out.
 *
 * Only `recordMoneyEvent`, the leaf writer, is spied. The routes run for real.
 *
 * NON-VACUITY — measured against the pre-fix routes, where `recordMoneyEvent`
 * is called ZERO times on all three paths. Every assertion in the first three
 * describes fails with "expected [] to have a length of 1 but got +0".
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn((_input: unknown) =>
    Promise.resolve({ ok: true, wrote: true, id: 'evt-1' }),
  ),
}));

// MONEY_EVENTS stays real — a renamed constant must break this test rather
// than slip past a hand-typed string literal.
vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

// The astrologer notifications are fire-and-forget and irrelevant here; the
// take-rate constant must stay real because writeConsultationCommission uses it.
vi.mock('../services/astrologer.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/astrologer.service.js')>();
  return {
    ...actual,
    notifyAstrologerNewConsult: vi.fn(async () => undefined),
    notifyDevoteeConsultConfirmed: vi.fn(async () => undefined),
  };
});

import Fastify from 'fastify';
import { consultationRoutes, finalizeConsultationPaymentFromWebhook } from './consultation.js';

const DEVOTEE_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';
const CONSULTATION_ID = '5523ab80-6591-43f0-9205-59ac341035b0';
const ASTROLOGER_PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const ASTROLOGER_USER_ID = '9c1e1d2a-4a55-4a2e-9c3a-2f7c1b0d8e44';

const DEMO_DEVOTEE = {
  id: DEVOTEE_ID,
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const APPROVED_ASTROLOGER = {
  id: ASTROLOGER_PROFILE_ID,
  userId: ASTROLOGER_USER_ID,
  displayName: 'Acharya Vinod Sharma',
  pricePerMinute: 25,
  approved: true,
};

/** The row POST /book raw-INSERTs and returns. */
function pendingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CONSULTATION_ID,
    reference: 'AC-20260901-OPS05',
    user_id: DEVOTEE_ID,
    astrologer_id: ASTROLOGER_PROFILE_ID,
    astrologer_name: 'Acharya Vinod Sharma',
    minutes: 20,
    per_minute_rate_inr: '25.00',
    amount_inr: '500.00',
    currency: 'INR',
    status: 'pending_payment',
    room_name: null,
    razorpay_order_id: 'order_demo_ops05rail',
    razorpay_payment_id: null,
    scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    paid_at: null,
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  return app;
}

function eventsOfType(type: string) {
  return recordMoneyEventSpy.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((e) => e.eventType === type);
}

const silentLog = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';

  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
    return null;
  });
  prismaMock.astrologerProfile.findUnique.mockResolvedValue(APPROVED_ASTROLOGER as never);
  prismaMock.astrologerProfile.findFirst.mockResolvedValue(APPROVED_ASTROLOGER as never);
  prismaMock.astrologerProfile.update.mockResolvedValue({} as never);
  // writeConsultationCommission's idempotency guard: no prior row.
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);
  // DDL from ensureConsultationTables, plus the confirming UPDATEs. 1 = claimed.
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  // Everything answers the pending row except the idempotency probe, which finds no open order.
  prismaMock.$queryRawUnsafe.mockImplementation((async (sql: string) =>
    /status = 'pending_payment' AND razorpay_order_id IS NOT NULL/.test(String(sql)) ? [] : [pendingRow()]) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OPS-05 — POST /consultation/book opens the money story', () => {
  it('records PAYMENT_INITIATED naming the devotee, the astrologer and the order', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/book',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { astrologerId: ASTROLOGER_PROFILE_ID, minutes: 20 },
    });
    expect(res.statusCode).toBe(201);

    const events = eventsOfType('payment.initiated');
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.subjectType).toBe('consultation');
    expect(event.subjectId).toBe(CONSULTATION_ID);
    expect(event.actorType).toBe('devotee');
    expect(event.actorId).toBe(DEVOTEE_ID);
    // ₹25/min × 20 min. The rate is resolved server-side (AW-02), so this is
    // also the record that the client could not inject a price.
    expect(Number(event.amount)).toBe(500);
    expect(event.currency).toBe('INR');
    expect(event.statusAfter).toBe('pending_payment');
    // The order id is the ONLY handle the Razorpay webhook can later resolve
    // this consultation by (findConsultationByOrderId) — there is no Payment
    // row. Without this event nothing recorded that it was ever issued.
    expect(event.gatewayOrderId).toBe(res.json().razorpayOrderId);
    expect(event.idempotencyKey).toBe(res.json().razorpayOrderId);

    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.rail).toBe('consultation-book');
    expect(metadata.reference).toBe('AC-20260901-OPS05');
    expect(metadata.astrologerId).toBe(ASTROLOGER_PROFILE_ID);
    expect(metadata.minutes).toBe(20);
    expect(metadata.perMinuteRateInr).toBe(25);
  });

  it('records nothing when the astrologer is refused before any money moves', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/book',
      headers: { authorization: 'Bearer demo-devotee' },
      // A fixture slug — AW-02 refuses these with 409 before an order exists.
      payload: { astrologerId: 'astro_001', minutes: 20 },
    });
    expect(res.statusCode).toBe(409);
    // A trail that logs orders which were never opened is worse than a gap.
    expect(eventsOfType('payment.initiated')).toHaveLength(0);
  });
});

describe('OPS-05 — the two confirmation rails are distinguishable after the fact', () => {
  it('POST /verify-payment records PAYMENT_VERIFIED attributed to the DEVOTEE', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/verify-payment',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        consultationId: CONSULTATION_ID,
        razorpay_order_id: 'order_demo_ops05rail',
        razorpay_payment_id: 'pay_demo_ops05rail',
        razorpay_signature: 'demo',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().verified).toBe(true);

    const events = eventsOfType('payment.verified');
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.subjectType).toBe('consultation');
    expect(event.subjectId).toBe(CONSULTATION_ID);
    // A HUMAN came back and completed this. That is the fact the webhook rail
    // cannot claim, and the row itself cannot distinguish.
    expect(event.actorType).toBe('devotee');
    expect(event.actorId).toBe(DEVOTEE_ID);
    expect(event.statusBefore).toBe('pending_payment');
    expect(event.statusAfter).toBe('confirmed');
    expect(event.gatewayOrderId).toBe('order_demo_ops05rail');
    expect(event.gatewayPaymentId).toBe('pay_demo_ops05rail');
    expect(event.idempotencyKey).toBe('pay_demo_ops05rail');
    expect((event.metadata as Record<string, unknown>).rail).toBe(
      'consultation-verify-payment',
    );
  });

  it('the webhook backstop records PAYMENT_CAPTURED attributed to the GATEWAY', async () => {
    const result = await finalizeConsultationPaymentFromWebhook(
      pendingRow() as never,
      'pay_demo_ops05rail',
      silentLog as never,
    );
    expect(result.handled).toBe(true);

    const events = eventsOfType('payment.captured');
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.subjectType).toBe('consultation');
    expect(event.subjectId).toBe(CONSULTATION_ID);
    // 'gateway', NOT 'system'. Razorpay acted; our cron did not. Collapsing
    // those two is what audit-money.ts calls out as making a refund trail
    // unusable in a dispute.
    expect(event.actorType).toBe('gateway');
    expect(event.actorId).toBeNull();
    expect(event.statusBefore).toBe('pending_payment');
    expect(event.statusAfter).toBe('confirmed');
    expect(event.gatewayPaymentId).toBe('pay_demo_ops05rail');
    expect((event.metadata as Record<string, unknown>).rail).toBe(
      'consultation-webhook-backstop',
    );
    expect((event.metadata as Record<string, unknown>).recovered).toBe(false);
  });

  it('flags `recovered` when the backstop un-cancels a consultation the expiry cron took out', async () => {
    await finalizeConsultationPaymentFromWebhook(
      pendingRow({ status: 'cancelled' }) as never,
      'pay_demo_ops05rail',
      silentLog as never,
    );

    const event = eventsOfType('payment.captured')[0]!;
    // The row ends up `confirmed` either way, so nothing in the product records
    // that it had been cancelled and was silently revived. This is now the only
    // place that fact survives.
    expect(event.statusBefore).toBe('cancelled');
    expect(event.statusAfter).toBe('confirmed');
    expect((event.metadata as Record<string, unknown>).recovered).toBe(true);
  });

  it('emits nothing when a replayed webhook claims no row', async () => {
    // The conditional UPDATE is the idempotency gate: 0 rows means an earlier
    // rail already confirmed this. A second PAYMENT_CAPTURED would invent a
    // capture that did not happen.
    prismaMock.$executeRawUnsafe.mockResolvedValue(0 as never);

    const result = await finalizeConsultationPaymentFromWebhook(
      pendingRow() as never,
      'pay_demo_ops05rail',
      silentLog as never,
    );
    expect(result.handled).toBe(false);
    expect(result.reason).toBe('not-claimable');
    expect(eventsOfType('payment.captured')).toHaveLength(0);
  });

  it('gives the two rails DIFFERENT event types on the same gateway payment id', async () => {
    // Both rails key their event on `razorpay_payment_id`. `recordMoneyEvent`
    // namespaces the key by event type before storing, and `idempotency_key` is
    // UNIQUE across the whole table with ON CONFLICT DO NOTHING — so if these
    // two ever shared an event type, whichever landed second would be silently
    // discarded and the trail would show one rail where two ran.
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/verify-payment',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        consultationId: CONSULTATION_ID,
        razorpay_order_id: 'order_demo_ops05rail',
        razorpay_payment_id: 'pay_demo_ops05rail',
        razorpay_signature: 'demo',
      },
    });
    await finalizeConsultationPaymentFromWebhook(
      pendingRow() as never,
      'pay_demo_ops05rail',
      silentLog as never,
    );

    const verified = eventsOfType('payment.verified');
    const captured = eventsOfType('payment.captured');
    expect(verified).toHaveLength(1);
    expect(captured).toHaveLength(1);
    // Same bare key...
    expect(verified[0]!.idempotencyKey).toBe('pay_demo_ops05rail');
    expect(captured[0]!.idempotencyKey).toBe('pay_demo_ops05rail');
    // ...different events, and different actors — which is the whole answer to
    // "which rail got there first".
    expect(verified[0]!.eventType).not.toBe(captured[0]!.eventType);
    expect(verified[0]!.actorType).toBe('devotee');
    expect(captured[0]!.actorType).toBe('gateway');
  });
});
