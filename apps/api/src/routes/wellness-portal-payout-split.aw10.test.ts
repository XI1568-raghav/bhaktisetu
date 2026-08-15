import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessPortalRoutes } from './wellness-portal.js';

/**
 * AW-10 (2026-08-12, P2) — API half.
 *
 * The wellness dashboard rendered "Paid out ₹800 · Pending payout — · This
 * month ₹800" for an instructor whose /payouts/balance said
 * {availableInr: 800, pendingInr: 0, paidOutInr: 0}. Nothing had been
 * transferred. ₹800 was the correct 80% lifetime share — it was just printed
 * under a label that claims settlement, and the dashboard had no settled /
 * unsettled split to print instead, so the page hardcoded `pending={null}`.
 *
 * The split now comes off the Commission ledger, the same source
 * payout.service.getPayoutBalance reads. `Commission.amount` IS the provider's
 * earning (lib/commission-math.ts) — nothing here re-derives it from a rate.
 */

const INSTRUCTOR_ID = '9e15c3a2-0dc7-4677-ac45-f7dfaec619a6';

const DEMO_INSTRUCTOR = {
  id: INSTRUCTOR_ID,
  email: 'wellness@demo.com',
  phone: null,
  fullName: 'Ananya Devi',
  subscriptionTier: 'free',
  blocked: false,
};

function commissionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wc-1',
    wellnessEnrollmentId: '22222222-2222-2222-2222-222222222222',
    providerId: INSTRUCTOR_ID,
    amount: 800,
    percentage: 0.2,
    status: 'PENDING',
    createdAt: new Date(),
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(wellnessPortalRoutes, { prefix: '/api/v1/wellness-portal' });
  return app;
}

function dashboard(app: Awaited<ReturnType<typeof buildApp>>) {
  return app.inject({
    method: 'GET',
    url: '/api/v1/wellness-portal/dashboard',
    headers: { authorization: 'Bearer demo-wellness' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockResolvedValue(DEMO_INSTRUCTOR);
  prismaMock.wellnessProfile.findUnique.mockResolvedValue({ id: 'wp-1', userId: INSTRUCTOR_ID });
  prismaMock.wellnessSession.count.mockResolvedValue(1);
  prismaMock.wellnessSession.findMany.mockResolvedValue([]);
  prismaMock.wellnessEnrollment.findMany.mockResolvedValue([
    { userId: 'devotee-1', session: { priceInr: 1000 } },
  ]);
  prismaMock.commission.findMany.mockResolvedValue([commissionRow()]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-10 — wellness dashboard reports a real settled / unsettled split', () => {
  it('reports paidOutInr 0 while the ₹800 commission is still PENDING', async () => {
    const app = await buildApp();
    const stats = (await dashboard(app)).json().stats;
    expect(stats.paidOutInr).toBe(0);
    expect(stats.pendingPayoutInr).toBe(800);
    // The lifetime net figure stays available — it just stops being called
    // "Paid out".
    expect(stats.totalEarningsInr).toBe(800);
    await app.close();
  });

  it('moves the money to paidOutInr once the commission settles', async () => {
    prismaMock.commission.findMany.mockResolvedValue([commissionRow({ status: 'PAID' })]);
    const app = await buildApp();
    const stats = (await dashboard(app)).json().stats;
    expect(stats.paidOutInr).toBe(800);
    expect(stats.pendingPayoutInr).toBe(0);
    await app.close();
  });

  it('a REVERSED (refunded) commission counts as neither paid nor pending', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ id: 'wc-1', status: 'REVERSED' }),
      commissionRow({ id: 'wc-2', status: 'PENDING', amount: 400 }),
    ]);
    const app = await buildApp();
    const stats = (await dashboard(app)).json().stats;
    expect(stats.pendingPayoutInr).toBe(400);
    expect(stats.paidOutInr).toBe(0);
    await app.close();
  });

  it('reads only wellness commissions — a dual-role provider\'s other earnings never leak in', async () => {
    const app = await buildApp();
    await dashboard(app);
    const args = prismaMock.commission.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(args.where).toMatchObject({
      providerId: INSTRUCTOR_ID,
      wellnessEnrollmentId: { not: null },
    });
    await app.close();
  });

  it('uses Commission.amount verbatim as the earning, never re-derived from the rate', async () => {
    // A row whose amount is deliberately NOT price × (1 − percentage): if the
    // route recomputed from `percentage`, this would come back as something
    // other than 137.5.
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ amount: 137.5, percentage: 0.2, status: 'PENDING' }),
    ]);
    const app = await buildApp();
    const stats = (await dashboard(app)).json().stats;
    expect(stats.pendingPayoutInr).toBe(137.5);
    await app.close();
  });
});
