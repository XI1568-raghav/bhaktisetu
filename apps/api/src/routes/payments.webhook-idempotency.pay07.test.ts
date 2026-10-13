import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import Fastify from 'fastify';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { checkAndRecord } = vi.hoisted(() => ({
  checkAndRecord: vi.fn(async () => ({ alreadyProcessed: false })),
}));
vi.mock('../lib/webhook-idempotency.js', () => ({ checkAndRecord, forgetEvent: vi.fn(async () => undefined) }));

import { paymentRoutes } from './payments.js';

/**
 * PAY-07 (2026-08-20, P2) — the Razorpay webhook wrote its idempotency record
 * BEFORE verifying the signature.
 *
 * `checkAndRecord` is an INSERT … ON CONFLICT DO NOTHING keyed on
 * `x-razorpay-event-id` (or a hash of the body). Running it first means anyone
 * who can reach the endpoint — it is unauthenticated by design, the signature
 * IS the authentication — can POST an unsigned body carrying the event id of a
 * real webhook. The record lands, the request is then rejected as unsigned, and
 * when Razorpay's genuine delivery arrives it is dismissed as a duplicate and
 * silently dropped. A capture is never confirmed and nothing logs an error.
 *
 * This is the precise reason the Stripe webhook route was deleted on
 * 2026-08-11 — the comment left in its place says so — and the identical
 * ordering was left standing on the Razorpay handler one function above it.
 *
 * Verify first. Record second. Process third.
 */

const SECRET = 'test_webhook_secret';
const ORIG_ENV = { ...process.env };

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(paymentRoutes, { prefix: '/api/v1/payments' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  checkAndRecord.mockResolvedValue({ alreadyProcessed: false });
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  // The raw-body path needs the fastify-raw-body plugin, which this harness
  // does not register; the JSON path exercises the identical ordering.
  process.env.RAZORPAY_VERIFY_RAW = 'false';
  prismaMock.payment.findFirst.mockResolvedValue(null);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe('PAY-07 — signature is verified before the idempotency record is written', () => {
  it('an UNSIGNED request cannot poison the dedupe key', async () => {
    const app = await buildApp();
    const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'x', order_id: 'order_x' } } } };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: {
        'x-razorpay-signature': 'a'.repeat(64),
        'x-razorpay-event-id': 'evt_real_one',
        'content-type': 'application/json',
      },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    expect(checkAndRecord).not.toHaveBeenCalled();
    await app.close();
  });

  it('a request with no signature header at all never reaches the dedupe store', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: { 'x-razorpay-event-id': 'evt_real_two', 'content-type': 'application/json' },
      payload: { event: 'payment.captured' },
    });
    expect(res.statusCode).toBe(400);
    expect(checkAndRecord).not.toHaveBeenCalled();
    await app.close();
  });

  it('a CORRECTLY signed request still records the event id', async () => {
    const app = await buildApp();
    const body = { event: 'unknown.event', payload: {} };
    const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: {
        'x-razorpay-signature': sig,
        'x-razorpay-event-id': 'evt_genuine',
        'content-type': 'application/json',
      },
      payload: body,
    });

    expect(res.statusCode).toBe(200);
    expect(checkAndRecord).toHaveBeenCalledWith('razorpay', 'evt_genuine');
    await app.close();
  });

  it('a signed replay of an already-processed event short-circuits to 200 duplicate', async () => {
    checkAndRecord.mockResolvedValue({ alreadyProcessed: true });
    const app = await buildApp();
    const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'p', order_id: 'o' } } } };
    const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: {
        'x-razorpay-signature': sig,
        'x-razorpay-event-id': 'evt_replay',
        'content-type': 'application/json',
      },
      payload: body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ duplicate: true });
    // and the event must NOT have been processed a second time
    expect(prismaMock.payment.findFirst).not.toHaveBeenCalled();
    await app.close();
  });

  it('an unset webhook secret still fails closed with 400, without recording', async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: {
        'x-razorpay-signature': 'b'.repeat(64),
        'x-razorpay-event-id': 'evt_nosecret',
        'content-type': 'application/json',
      },
      payload: { event: 'payment.captured' },
    });
    expect(res.statusCode).toBe(400);
    expect(checkAndRecord).not.toHaveBeenCalled();
    await app.close();
  });
});
