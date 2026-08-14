import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import adminSubscriptionsRoutes from './admin-subscriptions.js';

/**
 * AO-09, the half the web page could not close.
 *
 * The page was fixed to stop publishing a zero it could not support: the tiles
 * now take their count from /admin/dashboard and /admin/revenue, and it says
 * out loud that per-subscription detail is missing. That is honest, and it is
 * as far as a client can get — because the server answers a literal
 *
 *     const subs: unknown[] = [];      // admin-subscriptions.ts:24
 *     ... active: 0, activeMrr: 0
 *     note: 'Marketplace subscriptions schema not yet shipped...'
 *
 * while `model MarketplaceSubscription` has existed at schema.prisma:1078 the
 * whole time and admin.service.ts queries it twice — `getDashboardStats`
 * (activeSubscriptions) and `getRevenue` (subscriptionRevenue grouped by
 * plan+role). Two endpoints read the table; the third, whose entire job is this
 * table, declared it did not exist.
 *
 * This locks the list endpoint onto the same rows those two already read, and
 * locks out the three ways to fake it: the literal empty array, the hardcoded
 * `active: 0`, and the self-describing `note` that no longer applies.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

// The six rows the sweep saw on /admin/revenue: one FREE per provider role,
// plus the live ENTERPRISE row at Rs 5,000 for a year.
const ROWS = [
  { role: 'PANDIT', plan: 'FREE', amount: 0 },
  { role: 'STORE_OWNER', plan: 'FREE', amount: 0 },
  { role: 'ASTROLOGER', plan: 'FREE', amount: 0 },
  { role: 'WELLNESS_INSTRUCTOR', plan: 'FREE', amount: 0 },
  { role: 'GAUSHALA_MANAGER', plan: 'FREE', amount: 0 },
  { role: 'TEMPLE_MANAGER', plan: 'ENTERPRISE', amount: 5000 },
].map((r, i) => ({
  id: `sub-${i + 1}`,
  userId: `user-${i + 1}`,
  plan: r.plan,
  role: r.role,
  status: 'ACTIVE',
  amount: r.amount,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2026-12-31T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}));

function makeApp() {
  const app = Fastify();
  void app.register(adminSubscriptionsRoutes, { prefix: '/api/v1' });
  return app;
}

async function get(qs = '') {
  const app = makeApp();
  return app.inject({
    method: 'GET',
    url: `/api/v1/admin/subscriptions${qs}`,
    headers: { authorization: 'Bearer demo-admin' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockImplementation(async (args: any) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.marketplaceSubscription.findMany.mockImplementation(async (args: any) => {
    const want = args?.where?.status;
    return want ? ROWS.filter((r) => r.status === want) : ROWS;
  });
  prismaMock.marketplaceSubscription.count.mockImplementation(async (args: any) =>
    ROWS.filter((r) => !args?.where?.status || r.status === args.where.status).length,
  );
});

describe('AO-09 — /admin/subscriptions reads the table the other two endpoints read', () => {
  it('queries MarketplaceSubscription at all', async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(prismaMock.marketplaceSubscription.findMany).toHaveBeenCalled();
  });

  it('returns the six rows instead of a literal empty array', async () => {
    const body = (await get()).json();
    expect(Array.isArray(body.subscriptions)).toBe(true);
    expect(body.subscriptions).toHaveLength(6);
    expect(body.total).toBe(6);
  });

  it('its ACTIVE count agrees with /admin/dashboard and /admin/revenue', async () => {
    const body = (await get()).json();
    expect(body.active).toBe(6);
  });

  it('drops the "schema not yet shipped" note now that rows are real', async () => {
    const body = (await get()).json();
    expect(body.note ?? '').not.toMatch(/not yet shipped/i);
  });

  it('serialises each row in the shape the admin table renders', async () => {
    const body = (await get()).json();
    const ent = body.subscriptions.find((s: any) => s.planId === 'ENTERPRISE');
    expect(ent, 'the live ENTERPRISE row').toBeTruthy();
    expect(ent.userId).toBe('user-6');
    // The page filters on lowercase status ids ('active','cancelled',…).
    expect(ent.status).toBe('active');
    expect(ent.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(ent.currentPeriodEnd).toBe('2026-12-31T00:00:00.000Z');
    expect(ent.plan.role).toBe('TEMPLE_MANAGER');
    // Rendered under the column header "Billed" — the amount billed over this
    // subscription's own term, which is what the column claims.
    expect(ent.plan.priceMonthly).toBe(5000);
  });

  it('never invents a Razorpay handle — there is no such column on the model', async () => {
    const body = (await get()).json();
    for (const s of body.subscriptions) expect(s.razorpaySubscriptionId).toBeNull();
  });

  it('honours ?status=active by filtering server-side', async () => {
    await get('?status=active');
    const arg = prismaMock.marketplaceSubscription.findMany.mock.calls.at(-1)?.[0] as any;
    expect(arg?.where?.status).toBe('ACTIVE');
  });

  it('rejects an unknown ?status instead of passing it to Prisma', async () => {
    const res = await get('?status=not_a_status');
    expect(res.statusCode).toBe(400);
    expect(prismaMock.marketplaceSubscription.findMany).not.toHaveBeenCalled();
  });

  it('reports an unreadable table as an error, never as zero subscriptions', async () => {
    prismaMock.marketplaceSubscription.findMany.mockRejectedValue(new Error('db down'));
    const res = await get();
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.subscriptions).toBeUndefined();
    expect(body.active).toBeUndefined();
    // And the failure must not hand the caller the driver's own message.
    expect(JSON.stringify(body)).not.toContain('db down');
  });
});
