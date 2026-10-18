import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import Fastify from 'fastify';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { checkAndRecord, forgetEvent } = vi.hoisted(() => ({
  checkAndRecord: vi.fn(async () => ({ alreadyProcessed: false })),
  forgetEvent: vi.fn(async () => undefined),
}));
vi.mock('../lib/webhook-idempotency.js', () => ({ checkAndRecord, forgetEvent }));

import { paymentRoutes } from './payments.js';

// QA 2026-10-13 (local stand-in gateway, real non-demo paths):
//  1. a webhook that FAILS to process left its dedupe row and answered 200, so
//     Razorpay never retried and a manual redelivery was dropped as a duplicate;
//  2. a `payment.failed` for an earlier attempt, delivered after the successful
//     capture, overwrote the captured Payment with 'failed';
//  3. a signed capture whose amount differs from the order confirmed the booking.

const SECRET = 'test_webhook_secret';
const ORIG_ENV = { ...process.env };

async function post(body: unknown, eventId: string) {
  const app = Fastify({ logger: false });
  await app.register(paymentRoutes, { prefix: '/api/v1/payments' });
  const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/webhook',
    headers: { 'x-razorpay-signature': sig, 'x-razorpay-event-id': eventId, 'content-type': 'application/json' },
    payload: body as object,
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  checkAndRecord.mockResolvedValue({ alreadyProcessed: false });
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  process.env.RAZORPAY_VERIFY_RAW = 'false';
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
});
afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe('webhook processing failure', () => {
  it('releases the dedupe row and answers 5xx so Razorpay retries', async () => {
    prismaMock.payment.findFirst.mockRejectedValue(new Error('db down'));
    const res = await post(
      { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 100 } } } },
      'evt_fail_1',
    );
    expect(res.statusCode).toBe(500);
    expect(forgetEvent).toHaveBeenCalledWith('razorpay', 'evt_fail_1');
  });
});

describe('payment.failed after capture', () => {
  it('does not overwrite a captured payment', async () => {
    prismaMock.payment.findFirst.mockResolvedValue({ id: 'p1', status: 'captured', metadata: {} });
    const res = await post(
      { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_old', order_id: 'order_1' } } } },
      'evt_failed_late',
    );
    expect(res.statusCode).toBe(200);
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  it('still records a failure for an initiated payment', async () => {
    prismaMock.payment.findFirst.mockResolvedValue({ id: 'p1', status: 'initiated', metadata: {}, amount: 100, currency: 'INR', bookingId: null });
    prismaMock.payment.update.mockResolvedValue({});
    await post(
      { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_x', order_id: 'order_1' } } } },
      'evt_failed_ok',
    );
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });
});

describe('payment.failed with no Payment row (slice L)', () => {
  it('still leaves a money-audit row (donation / consultation / wellness orders own no Payment)', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    const res = await post(
      { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_orph', order_id: 'order_orph', amount: 10100, error_description: 'bank declined' } } } },
      'evt_failed_orphan',
    );
    expect(res.statusCode).toBe(200);
    await new Promise((r) => setTimeout(r, 20));
    const rows = prismaMock.$executeRawUnsafe.mock.calls.filter((c: unknown[]) => c.includes('payment.failed'));
    expect(rows.length).toBe(1);
    expect(rows[0]!.map(String).join('|')).toContain('order_orph');
  });
});

describe('payment.captured amount check', () => {
  it('refuses to confirm when the captured amount differs from the order', async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'p1', status: 'initiated', amount: '1151', currency: 'INR', metadata: {}, booking: { id: 'b1', status: 'pending_payment' }, storeOrders: [],
    });
    prismaMock.payment.update.mockResolvedValue({});
    const res = await post(
      { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 100 } } } },
      'evt_amt',
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ handled: false });
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { metadata: expect.objectContaining({ needsAdminReview: 'amount-mismatch' }) } }),
    );
  });
});
