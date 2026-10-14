import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const refundMock = vi.hoisted(() => vi.fn());
vi.mock('../services/refund.service.js', async (orig) => ({ ...(await orig<object>()), callRazorpayRefund: refundMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

const ADMIN = { id: 'user-demo-admin-1', email: 'admin@demo.com', phone: null, fullName: 'Demo Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const ID = '11111111-1111-4111-8111-111111111111';
const old = new Date(Date.now() - 60 * 60_000);
const base = {
  id: ID, reference: 'AC-1', user_id: 'u1', amount_inr: '500', currency: 'INR', status: 'cancelled',
  razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', paid_at: old, created_at: old,
};

async function call(method: 'GET' | 'POST', url: string) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await consultationRoutes(i); }, { prefix: '/api/v1/consultation' });
  const res = await app.inject({ method, url: `/api/v1/consultation${url}`, headers: { authorization: 'Bearer demo-admin' } });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  refundMock.mockReset();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: { where: { email?: string } }) => (a.where.email === 'admin@demo.com' ? ADMIN : null));
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
});

describe('GET /admin/stuck-refunds', () => {
  it('lists failed and sending consultations with retryable flags, plus wellness owed/in-flight payments', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /astrologer_consultations/.test(sql)
        ? [{ ...base, refund_status: 'sending', refund_id: null, refund_started_at: old }, { ...base, id: 'x', refund_status: 'sending', refund_id: null, refund_started_at: new Date() }]
        : [{ id: 'p1', amount: '100', refund_amount: '100', metadata: { wellnessEnrollmentId: 'e1', wellnessRefundInflight: { amount: 100, at: old.toISOString() } } }],
    );
    const res = await call('GET', '/admin/stuck-refunds');
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b.consultations.map((c: any) => c.retryable)).toEqual([true, false]);
    expect(b.wellness[0]).toMatchObject({ paymentId: 'p1', enrollmentId: 'e1', refundedInr: 100 });
  });
});

describe('POST /admin/:id/refund on a stuck row', () => {
  it('stale sending with no refund id is re-sent once', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_1' });
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ ...base, refund_status: 'sending', refund_id: null, refund_started_at: old }] as never);
    const res = await call('POST', `/admin/${ID}/refund`);
    expect(res.json()).toMatchObject({ refundExecution: 'gateway', refundId: 'rfnd_1' });
    expect(refundMock).toHaveBeenCalledTimes(1);
  });
  it('a lost reservation (fresh sending / has refund id) never reaches the gateway', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValue(0 as never);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ ...base, refund_status: 'sending', refund_id: 'rfnd_0', refund_started_at: old }] as never);
    await call('POST', `/admin/${ID}/refund`);
    expect(refundMock).not.toHaveBeenCalled();
  });
});
