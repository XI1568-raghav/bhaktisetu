import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const rz = vi.hoisted(() => ({ all: vi.fn(), create: vi.fn() }));
vi.mock('razorpay', () => ({ default: vi.fn().mockImplementation(() => ({ orders: { all: rz.all, create: rz.create } })) }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (req: { currentUser?: unknown }) => { req.currentUser = { id: 'u1' }; },
  requireRole: () => async () => undefined,
}));

import { adminRazorpayDiagnosticRoutes } from './admin-razorpay-diagnostic.js';

async function app() {
  const s = Fastify();
  await s.register(adminRazorpayDiagnosticRoutes, { prefix: '/d' });
  return s;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_live_abc';
  process.env.RAZORPAY_KEY_SECRET = 'secret';
});

describe('GET /razorpay', () => {
  it('reports the gateway verdict without exposing keys', async () => {
    rz.all.mockRejectedValue({ statusCode: 401, error: { code: 'BAD_REQUEST_ERROR', description: 'Authentication failed' } });
    const res = await (await app()).inject({ method: 'GET', url: '/d/razorpay' });
    const body = res.json();
    expect(body).toMatchObject({ mode: 'live', secretPresent: true, read: { ok: false, status: 401, reason: 'Authentication failed' }, orderProbe: null });
    expect(JSON.stringify(body)).not.toMatch(/rzp_live_abc|secret"/);
  });

  it('creates one Rs 1 order only when asked', async () => {
    rz.all.mockResolvedValue({ items: [] });
    rz.create.mockResolvedValue({ id: 'order_x' });
    const res = await (await app()).inject({ method: 'GET', url: '/d/razorpay?probe=order' });
    expect(res.json().orderProbe).toEqual({ ok: true });
    expect(rz.create).toHaveBeenCalledTimes(1);
    expect(rz.create.mock.calls[0]![0]).toMatchObject({ amount: 100, currency: 'INR' });
    const plain = await (await app()).inject({ method: 'GET', url: '/d/razorpay' });
    expect(plain.json().orderProbe).toBeNull();
    expect(rz.create).toHaveBeenCalledTimes(1);
  });

  it('does not call the gateway in demo mode', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
    const res = await (await app()).inject({ method: 'GET', url: '/d/razorpay' });
    expect(res.json().mode).toBe('demo');
    expect(rz.all).not.toHaveBeenCalled();
  });
});
