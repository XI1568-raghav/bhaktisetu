import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologerPortalRoutes } from './astrologer-portal.js';

/**
 * AW-04 (2026-08-12, P1) regression lock — the astrologer dashboard's money row.
 *
 * Observed: dashboard read "Paid out ₹375 · Pending payout — · This month ₹375"
 * for an astrologer with exactly one confirmed ₹375 consultation, while
 * /payouts/balance and the portal's own Earnings page said availableInr 700 /
 * paidOutInr 0 at the same moment.
 *
 * Two defects in one row of cards:
 *   1. `totalEarningsInr` was SUM(amount_inr) over `astrologer_consultations`
 *      — GROSS, before the 20% platform cut — and the page piped it into
 *      EarningsCard's `totalPaid` prop, rendered under the label "Paid out".
 *      So it overstated the astrologer's take by 25% AND claimed money had been
 *      transferred when nothing had settled.
 *   2. `pending` was passed literally `null`, so "Pending payout" was an em dash.
 *
 * The fix makes every rupee on the dashboard come from the Commission ledger —
 * the same source /astrologer-portal/earnings and payout.service already use —
 * so the two screens cannot disagree. `Commission.amount` IS the provider's
 * earning (see lib/commission-math.ts); no reader re-derives it.
 */

const ASTRO_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';

const DEMO_ASTRO = {
  id: ASTRO_USER_ID,
  email: 'astro@demo.com',
  phone: null,
  fullName: 'Acharya Vinod Sharma',
  subscriptionTier: 'free',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(astrologerPortalRoutes, { prefix: '/api/v1/astrologer-portal' });
  return app;
}

/** One ₹375 consultation: the astrologer's 80% share is ₹300, platform rate 0.20. */
function commissionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1',
    bookingId: '5523ab80-6591-43f0-9205-59ac341035b0',
    providerId: ASTRO_USER_ID,
    amount: 300,
    percentage: 0.2,
    status: 'PENDING',
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'astro@demo.com') return DEMO_ASTRO;
    return null;
  });
  prismaMock.astrologerProfile.findUnique.mockResolvedValue({
    id: PROFILE_ID,
    userId: ASTRO_USER_ID,
    displayName: 'Acharya Vinod Sharma',
    pricePerMinute: 25,
    approved: true,
    rating: 0,
    totalConsultations: 0,
  });
  // Raw astrologer_consultations: one confirmed ₹375 row today.
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
    const s = String(sql);
    if (s.includes('COUNT(*)')) return [{ count: '1', sum: '375' }];
    if (s.includes('SELECT id, reference')) return [];
    return [{ sum: '375' }];
  });
  prismaMock.pujaBooking.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-04 — astrologer dashboard money comes from the Commission ledger, not gross', () => {
  it('reports the 80% share for this month, not the ₹375 gross', async () => {
    prismaMock.commission.findMany.mockResolvedValue([commissionRow()]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    const { stats } = res.json();
    expect(stats.earningsMonthInr).toBe(300);
    expect(stats.totalEarningsInr).toBe(300);
  });

  it('reports paid-out as settled money only — ₹0 while everything is PENDING', async () => {
    prismaMock.commission.findMany.mockResolvedValue([commissionRow()]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();

    const { stats } = res.json();
    expect(stats.paidOutInr).toBe(0);
    expect(stats.pendingPayoutInr).toBe(300);
  });

  it('counts a PAID commission as paid out and drops it from pending', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ id: 'c-1', status: 'PAID', amount: 300 }),
      commissionRow({ id: 'c-2', status: 'PENDING', amount: 400, bookingId: 'b-2' }),
    ]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();

    const { stats } = res.json();
    expect(stats.paidOutInr).toBe(300);
    expect(stats.pendingPayoutInr).toBe(400);
    expect(stats.totalEarningsInr).toBe(700);
  });

  it('excludes REVERSED commissions from every figure (AW-06 cancellations)', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ id: 'c-1', status: 'REVERSED', amount: 300 }),
    ]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();

    const { stats } = res.json();
    expect(stats.totalEarningsInr).toBe(0);
    expect(stats.pendingPayoutInr).toBe(0);
    expect(stats.paidOutInr).toBe(0);
  });

  it('agrees with /astrologer-portal/earnings on the same ledger', async () => {
    prismaMock.commission.findMany.mockResolvedValue([commissionRow()]);

    const app = await buildApp();
    const dash = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    const earn = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/earnings',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();

    expect(dash.json().stats.totalEarningsInr).toBe(earn.json().summary.totalEarningsInr);
    expect(dash.json().stats.pendingPayoutInr).toBe(earn.json().summary.pendingInr);
    expect(dash.json().stats.paidOutInr).toBe(earn.json().summary.paidInr);
  });

  it('excludes a dual-role user PUJA commission the way /earnings already does', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ id: 'c-puja', bookingId: 'puja-1', amount: 5000 }),
      commissionRow({ id: 'c-astro', bookingId: 'astro-1', amount: 300 }),
    ]);
    prismaMock.pujaBooking.findMany.mockResolvedValue([{ id: 'puja-1' }]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();

    expect(res.json().stats.totalEarningsInr).toBe(300);
  });
});
