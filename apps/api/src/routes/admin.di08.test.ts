/**
 * DI-08 — /admin/revenue and /admin/commissions reported figures 5.8x apart,
 * both labelled "commissions".
 *
 * Measured live at the same instant with the same admin token:
 *   GET /admin/revenue     -> totalCommissions 1142.91
 *   GET /admin/commissions -> 8 rows summing to 6580, matching
 *                             SQL sum(commissions.amount) = 6580.00
 *
 * The two measure DIFFERENT quantities and the maths behind each is correct:
 * `Commission.amount` is the PROVIDER's earning and `Commission.percentage` is
 * the PLATFORM's take rate (lib/commission-math.ts), so /admin/revenue reports
 * the platform's cut and the ledger reports provider earnings. Nothing on
 * either response says which is which, so an admin reconciling them cannot
 * tell whether the platform is under-collecting or the ledger is corrupt.
 *
 * The fix is naming, not arithmetic: every money total ships under a field
 * name that states what it measures, and each screen carries BOTH sides so the
 * relationship is visible rather than inferred.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

async function get(url: string) {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await adminRoutes(instance);
  }, { prefix: '/api/v1/admin' });
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/admin${url}`,
    headers: { authorization: 'Bearer demo-admin' },
  });
  await app.close();
  return res;
}

const ROW = {
  id: 'com-1',
  bookingId: 'bk-1',
  storeOrderId: null,
  wellnessEnrollmentId: null,
  payoutRequestId: null,
  providerId: 'prov-1',
  amount: new Prisma.Decimal('880.00'),
  percentage: new Prisma.Decimal('0.2000'),
  status: 'PAID',
  paidAt: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  payoutRequest: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.commission.findMany.mockResolvedValue([] as never);
  prismaMock.commission.count.mockResolvedValue(0 as never);
  prismaMock.user.findMany.mockResolvedValue([] as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.storeOrder.findMany.mockResolvedValue([] as never);
  prismaMock.wellnessEnrollment.findMany.mockResolvedValue([] as never);
  prismaMock.marketplaceSubscription.findMany.mockResolvedValue([] as never);
  prismaMock.commission.groupBy.mockResolvedValue([
    { percentage: new Prisma.Decimal('0.2000'), _sum: { amount: new Prisma.Decimal('880.00') } },
  ] as never);
  prismaMock.commission.aggregate.mockResolvedValue({
    _sum: { amount: new Prisma.Decimal('0') },
  } as never);
});

describe('DI-08: money totals are named for what they measure', () => {
  it('/admin/revenue labels the platform take AND the provider earnings behind it', async () => {
    const body = (await get('/revenue')).json();

    // Rs 880 of PAID provider earnings at a 20% platform take rate is a
    // Rs 1,100 gross puja: the platform kept Rs 220.
    expect(body.platformTakeInr).toBeCloseTo(220, 2);
    expect(body.providerEarningsInr).toBeCloseTo(880, 2);
    // The old ambiguous field must keep meaning exactly what it always meant —
    // renaming its VALUE would be a silent revenue change on the dashboard.
    expect(body.totalCommissions).toBeCloseTo(body.platformTakeInr, 2);
  });

  it('/admin/commissions carries the same two totals over the FILTERED set', async () => {
    prismaMock.commission.findMany.mockResolvedValue([ROW] as never);
    prismaMock.commission.count.mockResolvedValue(1 as never);

    const body = (await get('/commissions')).json();

    expect(body.totals).toBeDefined();
    expect(body.totals.providerEarningsInr).toBeCloseTo(880, 2);
    expect(body.totals.platformTakeInr).toBeCloseTo(220, 2);
    expect(body.totals.grossInr).toBeCloseTo(1100, 2);
    // The identity an admin uses to sanity-check the ledger must hold.
    expect(body.totals.providerEarningsInr + body.totals.platformTakeInr).toBeCloseTo(
      body.totals.grossInr,
      2,
    );
  });

  it('/admin/commissions totals cover every matching row, not just the page', async () => {
    // One row on the page, but the grouped aggregate says the filter matched
    // Rs 880 of earnings across the whole set — the totals must come from the
    // aggregate, never from `data`.
    prismaMock.commission.findMany.mockResolvedValue([] as never);
    prismaMock.commission.count.mockResolvedValue(40 as never);

    const body = (await get('/commissions?page=2')).json();

    expect(body.data).toHaveLength(0);
    expect(body.totals.providerEarningsInr).toBeCloseTo(880, 2);
  });
});
