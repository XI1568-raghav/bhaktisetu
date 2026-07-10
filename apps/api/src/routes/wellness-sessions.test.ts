import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';
import crypto from 'node:crypto';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// P0 #wp-02 (2026-07-10): the verify handler must (a) reject an order-id
// mismatch between the client-submitted order id and the order id persisted
// at enroll time, (b) reject a null stored order (pre-fix enrollment that
// never recorded one), and (c) compare the HMAC signature in constant time.
// These are the three behaviours the audit flagged as missing.
//
// The route computes `isDemoPayment` at module load from RAZORPAY_KEY_ID /
// RAZORPAY_KEY_SECRET, so the non-demo signature branch can only be reached
// when those env vars are set BEFORE the route module is imported. The demo
// block below imports the route statically (no env → demo mode); the non-demo
// block uses a dynamic import after stubbing the env so the module re-evaluates
// into real-payment mode.

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';

const SESSION_ID = '11111111-1111-1111-1111-111111111111';
const ENROLLMENT_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = 'user-demo-devotee-1';

const DEMO_DEVOTEE = {
  id: USER_ID,
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  return app;
}

function validSig(orderId: string, paymentId: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('wellness verify — demo mode (no Razorpay env)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? DEMO_DEVOTEE : null,
    );
  });

  it('flips PENDING_PAYMENT → PAID for a matching demo enrollment', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({
      id: ENROLLMENT_ID,
      userId: USER_ID,
      razorpayOrderId: 'order_demo_123',
      status: 'PENDING_PAYMENT',
    });
    prismaMock.wellnessEnrollment.update.mockResolvedValue({
      id: ENROLLMENT_ID,
      status: 'PAID',
    });

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/wellness/enrollments/${ENROLLMENT_ID}/verify`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { razorpayOrderId: 'order_demo_123', razorpayPaymentId: 'pay_demo', razorpaySignature: 'sig' },
    });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.wellnessEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ENROLLMENT_ID }, data: { status: 'PAID' } }),
    );
    await app.close();
  });

  it('403 when caller does not own the enrollment and is not admin', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({
      id: ENROLLMENT_ID,
      userId: 'someone-else',
      razorpayOrderId: 'order_demo_123',
      status: 'PENDING_PAYMENT',
    });
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/wellness/enrollments/${ENROLLMENT_ID}/verify`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { razorpayOrderId: 'order_demo_123', razorpayPaymentId: 'pay_demo', razorpaySignature: 'sig' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

describe('wellness verify — real-payment mode (order-id guard + timingSafeEqual)', () => {
  let app: Awaited<ReturnType<typeof makeApp>>;
  const KEY_ID = 'rzp_live_test123';
  const KEY_SECRET = 'supersecretkey';

  beforeAll(async () => {
    vi.stubEnv('RAZORPAY_KEY_ID', KEY_ID);
    vi.stubEnv('RAZORPAY_KEY_SECRET', KEY_SECRET);
    // Re-import the route module so its module-level isDemoPayment/razorpay
    // consts re-evaluate with the real-payment env. vi.resetModules clears the
    // cached wellness-sessions module; the dynamic import below pulls a fresh
    // copy bound to KEY_ID/KEY_SECRET.
    vi.resetModules();
    const mod = await import('./wellness-sessions.js');
    app = Fastify();
    void app.register(mod.wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? DEMO_DEVOTEE : null,
    );
  });

  it('400 on order-id mismatch (stale order id cannot mark this enrollment paid)', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({
      id: ENROLLMENT_ID,
      userId: USER_ID,
      razorpayOrderId: 'order_real_ENROLL',
      status: 'PENDING_PAYMENT',
    });
    // Client submits a DIFFERENT order id with a valid signature for THAT
    // order — before the guard this would pass and flip PAID.
    const sig = validSig('order_real_OTHER', 'pay_real', KEY_SECRET);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/wellness/enrollments/${ENROLLMENT_ID}/verify`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { razorpayOrderId: 'order_real_OTHER', razorpayPaymentId: 'pay_real', razorpaySignature: sig },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/order id mismatch/i);
    expect(prismaMock.wellnessEnrollment.update).not.toHaveBeenCalled();
  });

  it('400 when stored order id is null (pre-fix enrollment with no recorded order)', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({
      id: ENROLLMENT_ID,
      userId: USER_ID,
      razorpayOrderId: null,
      status: 'PENDING_PAYMENT',
    });
    const sig = validSig('order_anything', 'pay_real', KEY_SECRET);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/wellness/enrollments/${ENROLLMENT_ID}/verify`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { razorpayOrderId: 'order_anything', razorpayPaymentId: 'pay_real', razorpaySignature: sig },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/order id mismatch/i);
    expect(prismaMock.wellnessEnrollment.update).not.toHaveBeenCalled();
  });

  it('flips PAID on a matching order id + valid timing-safe signature', async () => {
    const ORDER_ID = 'order_real_ENROLL';
    const PAY_ID = 'pay_real';
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({
      id: ENROLLMENT_ID,
      userId: USER_ID,
      razorpayOrderId: ORDER_ID,
      status: 'PENDING_PAYMENT',
    });
    prismaMock.wellnessEnrollment.update.mockResolvedValue({ id: ENROLLMENT_ID, status: 'PAID' });
    const sig = validSig(ORDER_ID, PAY_ID, KEY_SECRET);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/wellness/enrollments/${ENROLLMENT_ID}/verify`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { razorpayOrderId: ORDER_ID, razorpayPaymentId: PAY_ID, razorpaySignature: sig },
    });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.wellnessEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ENROLLMENT_ID }, data: { status: 'PAID' } }),
    );
  });

  it('400 on a wrong-length / tampered signature (timingSafeEqual rejects)', async () => {
    const ORDER_ID = 'order_real_ENROLL';
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({
      id: ENROLLMENT_ID,
      userId: USER_ID,
      razorpayOrderId: ORDER_ID,
      status: 'PENDING_PAYMENT',
    });
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/wellness/enrollments/${ENROLLMENT_ID}/verify`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { razorpayOrderId: ORDER_ID, razorpayPaymentId: 'pay_real', razorpaySignature: 'tampered' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/invalid payment signature/i);
    expect(prismaMock.wellnessEnrollment.update).not.toHaveBeenCalled();
  });
});
