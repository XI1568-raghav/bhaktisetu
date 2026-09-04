import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminOpsRoutes } from './admin-ops.js';

/**
 * OPS-05 (read half) — GET /api/v1/admin/ops/money-trail.
 *
 * The money-event WRITER shipped with 13+ call sites. The READER,
 * `lib/audit-money.getMoneyTrail`, shipped with none: grepping `apps/api` for
 * it returned only its own declaration and its own unit test. Every money
 * event was being recorded and nothing in the product could show it, so
 * "reconstruct this disputed refund" still meant opening a psql session
 * against the production database with DIRECT_URL — which is not a
 * reconstruction path the product supports, and is exactly the gap the finding
 * describes.
 *
 * Three behaviours are load-bearing and asserted below:
 *   1. admin-gated, not cron-token-gated (the trail carries actor ids and IPs);
 *   2. an unreadable trail answers 503, NEVER 200 with an empty list — an
 *      operator deciding whether to refund must not be shown "no events" when
 *      the truth is "the log could not be read";
 *   3. the polymorphic `subjectId` handle reaches the rails that write no
 *      Payment row (donations, consultations, store orders), which the four
 *      FK-shaped id filters structurally cannot.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const DEMO_DEVOTEE = {
  id: 'user-demo-devotee-1',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await adminOpsRoutes(instance);
    },
    { prefix: '/api/v1/admin/ops' },
  );
  return app;
}

const ROW = {
  id: 'e1',
  event_type: 'donation.received',
  occurred_at: '2026-08-30T10:05:00.000Z',
  actor_type: 'gateway',
  actor_id: null,
  subject_type: 'donation',
  subject_id: 'don_1756000000000_abcd1234',
  booking_id: null,
  payment_id: null,
  commission_id: null,
  payout_id: null,
  amount: '2500.00',
  currency: 'INR',
  gateway: 'razorpay',
  gateway_order_id: 'order_ROrDeR001',
  gateway_payment_id: 'pay_RcApTuRe01',
  gateway_refund_id: null,
  status_before: 'created',
  status_after: 'paid',
  request_id: null,
  ip: null,
  note: 'donation received via razorpay-webhook-backstop',
  metadata: { doneeKind: 'gaushala' },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockImplementation(
    async (args: { where: { email?: string } }) => {
      if (args.where.email === 'admin@demo.com') return DEMO_ADMIN;
      if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
      return null;
    },
  );
  process.env.NODE_ENV = 'test'; // demo-token bypass in the auth middleware
  delete process.env.CRON_AUTH_TOKEN;
});

describe('GET /api/v1/admin/ops/money-trail (OPS-05 read half)', () => {
  it('401 without auth, 403 for a devotee — the trail is not cron-token-gated', async () => {
    const app = await buildApp();

    const anon = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/ops/money-trail?bookingId=bk-1',
    });
    expect(anon.statusCode).toBe(401);

    const devotee = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/ops/money-trail?bookingId=bk-1',
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(devotee.statusCode).toBe(403);
    // A non-admin must never reach the query.
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns the trail for a booking, oldest first', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { ...ROW, event_type: 'payment.initiated', booking_id: 'bk-1', subject_type: 'payment' },
    ] as never);
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/ops/money-trail?bookingId=bk-1',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ ok: true, available: true, count: 1 });
    expect(body.events[0]).toMatchObject({
      eventType: 'payment.initiated',
      bookingId: 'bk-1',
      amount: '2500.00',
    });
    expect(String(prismaMock.$queryRawUnsafe.mock.calls[0]?.[0])).toMatch(
      /ORDER BY "occurred_at" ASC/,
    );

    await app.close();
  });

  it('reaches a donation through subjectId — no Payment row exists to key on', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([ROW] as never);
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url:
        '/api/v1/admin/ops/money-trail?subjectId=don_1756000000000_abcd1234&subjectType=donation',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().events[0]).toMatchObject({
      eventType: 'donation.received',
      subjectType: 'donation',
      subjectId: 'don_1756000000000_abcd1234',
      statusAfter: 'paid',
    });
    // subject_id bound as $5, subject_type as $6 — every FK-shaped filter NULL,
    // which is precisely the row shape a donation writes.
    expect(prismaMock.$queryRawUnsafe.mock.calls[0]?.slice(1)).toEqual([
      null,
      null,
      null,
      null,
      'don_1756000000000_abcd1234',
      'donation',
    ]);

    await app.close();
  });

  it('400 when no handle is supplied — the route is not an export', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/ops/money-trail?subjectType=donation',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    await app.close();
  });

  it('503 — never 200-with-[] — when the trail cannot be read', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation does not exist'));
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/ops/money-trail?paymentId=pay-1',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toBe('read-failed');
    // The one thing this response must never contain is an empty event list
    // that an operator could read as "nothing happened".
    expect(body.events).toBeUndefined();

    await app.close();
  });
});
