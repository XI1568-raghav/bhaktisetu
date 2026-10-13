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

// QA 2026-10-13: (1) a payment that arrived AFTER the booking was cancelled bought no
// service, so the admin default is a FULL refund, not the ladder tier at the cancel
// time; (2) approving a refund on a booking that was never cancelled is refused unless
// the admin confirms explicitly.

const ADMIN = { id: 'admin-1', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const LADDER = { refundAmountInr: 251, feeAmountInr: 251, refundFraction: 0.5, tierLabel: '50% refund (4-24h before)' };
const booking = (over: Record<string, unknown> = {}) => ({
  id: 'bk-1', status: 'cancelled', cancelledAt: new Date('2026-10-04T18:40:00Z'), scheduledDate: new Date('2026-10-06T00:00:00Z'),
  scheduledTimeSlot: '07:00', priceAmount: '502', payments: [{ id: 'p1', status: 'captured', amount: '502', metadata: null }], ...over,
});
const FLAGGED = { id: 'p1', status: 'captured', amount: '502', metadata: { needsAdminReview: 'paid-after-cancel' } };

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
  computePolicyRefund.mockResolvedValue(LADDER);
  processRefund.mockResolvedValue({ ok: true, refundId: 'rf_1' });
  prismaMock.pujaBooking.findUnique.mockResolvedValue(booking());
  prismaMock.pujaBooking.findMany.mockResolvedValue([booking()]);
  prismaMock.payment.findMany.mockResolvedValue([]);
});

describe('paid-after-cancel bookings default to a full refund', () => {
  it('approve with the default (policy) refunds in FULL and never asks the ladder', async () => {
    prismaMock.payment.findMany.mockResolvedValue([FLAGGED]);
    const res = await call('POST', '/refunds/bk-1/approve', { reason: 'late payment' });
    expect(res.statusCode).toBe(200);
    expect(computePolicyRefund).not.toHaveBeenCalled();
    const arg = processRefund.mock.calls[0]![0];
    expect(arg.refundType).toBe('full');
    expect(arg.amountInr).toBeUndefined();
    expect(arg.reason).toMatch(/payment arrived after the booking was cancelled/);
  });

  it('an ordinary cancelled booking still follows the ladder', async () => {
    const res = await call('POST', '/refunds/bk-1/approve', {});
    expect(res.statusCode).toBe(200);
    expect(computePolicyRefund).toHaveBeenCalledTimes(1);
    expect(processRefund.mock.calls[0]![0]).toMatchObject({ refundType: 'partial', amountInr: 251 });
  });

  it('an explicit partial still wins over the flag (the admin chose the amount)', async () => {
    prismaMock.payment.findMany.mockResolvedValue([FLAGGED]);
    await call('POST', '/refunds/bk-1/approve', { refundType: 'partial', amountInr: 100 });
    expect(processRefund.mock.calls[0]![0]).toMatchObject({ refundType: 'partial', amountInr: 100 });
  });

  it('the pending queue quotes the whole price for a flagged payment', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([booking({ payments: [FLAGGED] })]);
    const res = await call('GET', '/refunds/pending');
    const q = res.json().bookings[0].policyQuote;
    expect(q).toMatchObject({ refundAmountInr: 502, refundFraction: 1, feeAmountInr: 0 });
    expect(q.tierLabel).toMatch(/after the booking was cancelled/);
    expect(computePolicyRefund).not.toHaveBeenCalled();
  });

  it('an unflagged captured payment is quoted by the ladder as before', async () => {
    const res = await call('GET', '/refunds/pending');
    expect(res.json().bookings[0].policyQuote).toEqual(LADDER);
  });

  it('a flagged but already-refunded payment is not treated as owed in full', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([booking({ payments: [{ ...FLAGGED, status: 'refunded' }, { id: 'p2', status: 'captured', amount: '1', metadata: null }] })]);
    const res = await call('GET', '/refunds/pending');
    expect(res.json().bookings[0].policyQuote).toEqual(LADDER);
  });
});

describe('refunding a booking that was never cancelled', () => {
  for (const status of ['confirmed', 'pending_payment', 'priest_assigned', 'in_progress', 'completed']) {
    it(`is refused with 409 for a ${status} booking and moves no money`, async () => {
      prismaMock.pujaBooking.findUnique.mockResolvedValue(booking({ status }));
      for (const body of [{}, { refundType: 'full' }, { refundType: 'partial', amountInr: 10 }]) {
        const res = await call('POST', '/refunds/bk-1/approve', body);
        expect(res.statusCode).toBe(409);
        expect(res.json().code).toBe('booking_not_cancelled');
      }
      expect(processRefund).not.toHaveBeenCalled();
    });
  }

  it('goes ahead only with confirmNotCancelled: true', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking({ status: 'confirmed' }));
    const res = await call('POST', '/refunds/bk-1/approve', { refundType: 'full', confirmNotCancelled: true });
    expect(res.statusCode).toBe(200);
    expect(processRefund.mock.calls[0]![0].refundType).toBe('full');
  });

  it('a refunded booking is still an idempotent pass-through (processRefund skips it)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking({ status: 'refunded' }));
    const res = await call('POST', '/refunds/bk-1/approve', { refundType: 'full' });
    expect(res.statusCode).toBe(200);
  });

  it('an unknown booking is still a 404', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    const res = await call('POST', '/refunds/bk-1/approve', {});
    expect(res.statusCode).toBe(404);
  });
});
