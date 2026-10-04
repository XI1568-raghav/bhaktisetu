import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { processRefund, computePolicyRefund } = vi.hoisted(() => ({ processRefund: vi.fn(), computePolicyRefund: vi.fn() }));
vi.mock('../services/refund.service.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, processRefund, computePolicyRefund };
});

import Fastify from 'fastify';
import { adminBookingsRoutes } from './admin-bookings.js';

/**
 * The admin refund queue now carries what the cancellation policy owes each
 * cancelled booking, and approving "per policy" refunds exactly that. The amount
 * is computed on the server from the booking, never typed or posted by the page.
 */
const ADMIN = { id: 'admin-1', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const QUOTE = { refundAmountInr: 376.5, feeAmountInr: 125.5, refundFraction: 0.75, tierLabel: '75% refund (24–48h before)' };
const pendingBooking = {
  id: 'bk-1', status: 'cancelled', cancelledAt: new Date('2026-10-04T18:40:00Z'), scheduledDate: new Date('2026-10-06T00:00:00Z'),
  scheduledTimeSlot: '07:00', priceAmount: '502', payments: [{ id: 'p1', status: 'captured', amount: '502' }],
};

async function call(method: 'GET' | 'POST', url: string, payload?: unknown) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminBookingsRoutes(i); }, { prefix: '/api/v1/admin/bookings' });
  const res = await app.inject({ method, url: `/api/v1/admin/bookings${url}`, headers: { authorization: 'Bearer demo-admin', 'content-type': 'application/json' }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: { where: { email?: string } }) => (a.where.email === 'admin@demo.com' ? ADMIN : null));
  computePolicyRefund.mockResolvedValue(QUOTE);
  processRefund.mockResolvedValue({ ok: true, refundId: 'rf_1' });
  prismaMock.pujaBooking.findMany.mockResolvedValue([pendingBooking]);
  prismaMock.pujaBooking.findUnique.mockResolvedValue({ ...pendingBooking });
});

describe('GET /admin/bookings/refunds/pending', () => {
  it('attaches what the policy owes to every pending booking', async () => {
    const res = await call('GET', '/refunds/pending');
    expect(res.statusCode).toBe(200);
    expect(res.json().bookings[0].policyQuote).toEqual(QUOTE);
  });

  it('a quote that cannot be computed is null, and does not take the queue down', async () => {
    computePolicyRefund.mockRejectedValue(new Error('policy lookup exploded'));
    const res = await call('GET', '/refunds/pending');
    expect(res.statusCode).toBe(200);
    expect(res.json().bookings[0].policyQuote).toBeNull();
    expect(res.json().bookings).toHaveLength(1);
  });
});

describe('POST /admin/bookings/refunds/:id/approve with refundType "policy"', () => {
  it('refunds exactly the policy amount as a partial, with the tier in the reason', async () => {
    const res = await call('POST', '/refunds/bk-1/approve', { refundType: 'policy', reason: 'Devotee cancellation' });
    expect(res.statusCode).toBe(200);
    expect(processRefund).toHaveBeenCalledTimes(1);
    const arg = processRefund.mock.calls[0]![0];
    expect(arg.refundType).toBe('partial');
    expect(arg.amountInr).toBe(376.5);
    expect(arg.reason).toContain('75% refund (24–48h before)');
  });

  it('a 100% tier is processed as a full refund, not a partial of the same amount', async () => {
    computePolicyRefund.mockResolvedValue({ ...QUOTE, refundAmountInr: 502, feeAmountInr: 0, refundFraction: 1, tierLabel: 'Full refund' });
    await call('POST', '/refunds/bk-1/approve', { refundType: 'policy' });
    const arg = processRefund.mock.calls[0]![0];
    expect(arg.refundType).toBe('full');
    expect(arg.amountInr).toBeUndefined();
  });

  it('refuses when the policy owes nothing, and moves no money', async () => {
    computePolicyRefund.mockResolvedValue({ ...QUOTE, refundAmountInr: 0, feeAmountInr: 502, refundFraction: 0, tierLabel: 'No refund' });
    const res = await call('POST', '/refunds/bk-1/approve', { refundType: 'policy' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/policy.*no refund|owes nothing/i);
    expect(processRefund).not.toHaveBeenCalled();
  });

  it('ignores any amount posted alongside "policy": the server decides', async () => {
    await call('POST', '/refunds/bk-1/approve', { refundType: 'policy', amountInr: 9999 });
    expect(processRefund.mock.calls[0]![0].amountInr).toBe(376.5);
  });

  it('full and partial work exactly as before', async () => {
    await call('POST', '/refunds/bk-1/approve', { refundType: 'full' });
    expect(processRefund.mock.calls[0]![0].refundType).toBe('full');
    expect(computePolicyRefund).not.toHaveBeenCalled();
    await call('POST', '/refunds/bk-1/approve', { refundType: 'partial', amountInr: 100 });
    expect(processRefund.mock.calls[1]![0]).toMatchObject({ refundType: 'partial', amountInr: 100 });
  });
});
