import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import Fastify from 'fastify';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * Route-level wiring of the gateway payment/amount check (lib/razorpay-payment-check.ts) into
 * the donation, consultation and wellness verify routes, plus the wellness webhook backstop.
 * The helper itself is covered by razorpay-payment-check.test.ts; this proves each route USES it:
 * mismatch -> not confirmed + needsAdminReview, fetch failure -> falls back to the signature.
 * Real-credential mode needs the env set before the route module loads (module-level consts).
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('razorpay', () => ({
  default: class {
    payments = { fetch: fetchMock };
    orders = { create: vi.fn() };
    api = {};
  },
}));
const auditSpy = vi.hoisted(() => vi.fn(async (_i: unknown) => ({ ok: true, wrote: true })));
vi.mock('../lib/audit-money.js', async (orig) => ({ ...(await orig<typeof import('../lib/audit-money.js')>()), recordMoneyEvent: auditSpy }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }) }));

const SECRET = 'wiring-secret';
const sig = (o: string, p: string) => crypto.createHmac('sha256', SECRET).update(`${o}|${p}`).digest('hex');
const USER = { id: 'user-demo-devotee-1', email: 'devotee@demo.com', phone: null, fullName: 'Demo Devotee', subscriptionTier: 'free', blocked: false };
const reviewEvents = () => auditSpy.mock.calls.map((c) => c[0] as any).filter((e) => e.metadata?.needsAdminReview);

beforeAll(() => {
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_wiring');
  vi.stubEnv('RAZORPAY_KEY_SECRET', SECRET);
  vi.resetModules();
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: any) => (a.where.email === 'devotee@demo.com' ? USER : null));
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
});

describe('wellness verify + webhook', () => {
  const ENR = '22222222-2222-2222-2222-222222222222';
  const enr = { id: ENR, userId: USER.id, sessionId: 's1', razorpayOrderId: 'order_w', status: 'PENDING_PAYMENT' };
  let app: ReturnType<typeof Fastify>;
  let mod: typeof import('./wellness-sessions.js');
  beforeAll(async () => {
    mod = await import('./wellness-sessions.js');
    app = Fastify();
    void app.register(mod.wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
    await app.ready();
  });
  afterAll(() => app.close());
  const verify = () =>
    app.inject({
      method: 'POST', url: `/api/v1/wellness/enrollments/${ENR}/verify`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { razorpayOrderId: 'order_w', razorpayPaymentId: 'pay_w', razorpaySignature: sig('order_w', 'pay_w') },
    });
  beforeEach(() => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr as any);
    prismaMock.wellnessSession.findUnique.mockResolvedValue({ priceInr: '100' } as any);
    prismaMock.wellnessEnrollment.update.mockResolvedValue({ id: ENR, status: 'PAID' } as any);
  });

  it('amount mismatch at the gateway: not confirmed, 409, audited for admin review', async () => {
    fetchMock.mockResolvedValue({ order_id: 'order_w', amount: 100, currency: 'INR', status: 'captured' }); // Rs 1 paid, Rs 100 owed
    const res = await verify();
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('payment_needs_review');
    expect(prismaMock.wellnessEnrollment.update).not.toHaveBeenCalled();
    expect(reviewEvents()).toHaveLength(1);
  });
  it('gateway matches: confirmed', async () => {
    fetchMock.mockResolvedValue({ order_id: 'order_w', amount: 10000, currency: 'INR', status: 'captured' });
    expect((await verify()).statusCode).toBe(200);
    expect(prismaMock.wellnessEnrollment.update).toHaveBeenCalled();
  });
  it('gateway fetch fails: falls back to the signature result', async () => {
    fetchMock.mockRejectedValue(new Error('ETIMEDOUT'));
    expect((await verify()).statusCode).toBe(200);
    expect(prismaMock.wellnessEnrollment.update).toHaveBeenCalled();
  });

  describe('webhook backstop', () => {
    beforeEach(() => {
      prismaMock.wellnessEnrollment.findFirst.mockResolvedValue({ ...enr, session: { priceInr: '100' } } as any);
      prismaMock.wellnessEnrollment.updateMany.mockResolvedValue({ count: 1 } as any);
    });
    it('gateway amount mismatch: not confirmed, audited', async () => {
      fetchMock.mockResolvedValue({ order_id: 'order_w', amount: 100, currency: 'INR', status: 'captured' });
      const r = await mod.finalizeWellnessEnrollmentFromWebhook('order_w', 10000, 'pay_w');
      expect(r).toEqual({ handled: false, reason: 'amount-mismatch' });
      expect(prismaMock.wellnessEnrollment.updateMany).not.toHaveBeenCalled();
      expect(reviewEvents()).toHaveLength(1);
    });
    it('fetch failure: trusts the signed payload and confirms', async () => {
      fetchMock.mockRejectedValue(new Error('boom'));
      expect((await mod.finalizeWellnessEnrollmentFromWebhook('order_w', 10000, 'pay_w')).handled).toBe(true);
    });
  });
});

describe('donation verify', () => {
  const DON = '33333333-3333-4333-8333-333333333333';
  it('gateway amount mismatch: 409 payment_needs_review, audited, donation not finalised', async () => {
    const { donationRoutes } = await import('./donations.js');
    const app = Fastify();
    await app.register(donationRoutes as never, { prefix: '/api/v1/donations' });
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: DON, user_id: USER.id, amount_inr: '101', razorpay_order_id: 'order_d', status: 'pending', created_at: new Date() },
    ] as never);
    fetchMock.mockResolvedValue({ order_id: 'order_d', amount: 100, currency: 'INR', status: 'captured' });
    const res = await app.inject({
      method: 'POST', url: '/api/v1/donations/verify', headers: { authorization: 'Bearer demo-devotee' },
      payload: { donationId: DON, razorpay_order_id: 'order_d', razorpay_payment_id: 'pay_d', razorpay_signature: sig('order_d', 'pay_d') },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('payment_needs_review');
    expect(reviewEvents()).toHaveLength(1);
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => /status = 'paid'/.test(String(c[0])))).toBe(false);
    // fetch failure is NOT a mismatch: it must proceed past the check
    fetchMock.mockRejectedValue(new Error('ETIMEDOUT'));
    const res2 = await app.inject({
      method: 'POST', url: '/api/v1/donations/verify', headers: { authorization: 'Bearer demo-devotee' },
      payload: { donationId: DON, razorpay_order_id: 'order_d', razorpay_payment_id: 'pay_d', razorpay_signature: sig('order_d', 'pay_d') },
    });
    expect(res2.json().code).not.toBe('payment_needs_review');
    await app.close();
  });
});

describe('consultation verify-payment', () => {
  const CID = '44444444-4444-4444-8444-444444444444';
  const row = { id: CID, reference: 'AC-1', user_id: USER.id, astrologer_name: 'A', amount_inr: '500', currency: 'INR', razorpay_order_id: 'order_c', status: 'pending_payment' };
  it('gateway amount mismatch: payment_review, 409, audited; fetch failure confirms', async () => {
    const { consultationRoutes } = await import('./consultation.js');
    const app = Fastify();
    await app.register(async (i) => { await consultationRoutes(i); }, { prefix: '/api/v1/consultation' });
    prismaMock.$queryRawUnsafe.mockResolvedValue([row] as never);
    const payload = { consultationId: CID, razorpay_order_id: 'order_c', razorpay_payment_id: 'pay_c', razorpay_signature: sig('order_c', 'pay_c') };
    fetchMock.mockResolvedValue({ order_id: 'order_c', amount: 5000, currency: 'INR', status: 'captured' });
    const res = await app.inject({ method: 'POST', url: '/api/v1/consultation/verify-payment', headers: { authorization: 'Bearer demo-devotee' }, payload });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('payment_needs_review');
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => /payment_review/.test(String(c[0])))).toBe(true);
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => /status = 'confirmed'/.test(String(c[0])))).toBe(false);
    expect(reviewEvents()).toHaveLength(1);
    fetchMock.mockRejectedValue(new Error('ETIMEDOUT'));
    const res2 = await app.inject({ method: 'POST', url: '/api/v1/consultation/verify-payment', headers: { authorization: 'Bearer demo-devotee' }, payload });
    expect(res2.statusCode).toBe(200);
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => /status = 'confirmed'/.test(String(c[0])))).toBe(true);
    await app.close();
  });
});
