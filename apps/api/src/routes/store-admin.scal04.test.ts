import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'owner-1', roles: ['STORE_OWNER'] };
  },
}));

import Fastify from 'fastify';
import { storeAdminRoutes } from './store-admin.js';

/**
 * SCAL-04 — the store dashboard and revenue pages walk orders in pages.
 *
 * /dashboard read every order of the current month with `include: { user }`,
 * and /revenue read a full YEAR of orders with their `items` JSON, both in one
 * unbounded findMany, to produce five scalars and a ten-row strip. Per-store
 * revenue is attributed by walking the items JSON against this store's product
 * ids, so the rows must be read — but not all at once in a 512 MB container.
 */

const PAGE = 200;

/** An order table the mock pages through exactly as Prisma's cursor would. */
function seedOrders(count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `o-${String(i).padStart(5, '0')}`,
    orderNumber: `SO-${i}`,
    status: 'DELIVERED',
    userId: `buyer-${i % 3}`,
    createdAt: new Date(Date.now() - i * 1000),
    items: [{ productId: 'p-1', qty: 2, priceAtPurchase: 100 }],
  }));
  prismaMock.storeOrder.findMany.mockImplementation(async (args: any) => {
    const take = args?.take ?? rows.length;
    const start = args?.cursor
      ? rows.findIndex((r) => r.id === args.cursor.id) + (args.skip ?? 0)
      : 0;
    return rows.slice(start, start + take);
  });
  return rows;
}

async function call(url: string) {
  const app = Fastify();
  await app.register(storeAdminRoutes);
  const res = await app.inject({ method: 'GET', url });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'store-1' });
  prismaMock.storeProduct.findMany.mockResolvedValue([
    { id: 'p-1', name: 'Tulsi Mala', stock: 40 },
  ]);
  prismaMock.user.findMany.mockResolvedValue([
    { id: 'buyer-0', fullName: 'Asha' },
    { id: 'buyer-1', fullName: 'Ravi' },
    { id: 'buyer-2', fullName: 'Meera' },
  ]);
});

describe('SCAL-04 — store dashboard order scan', () => {
  it('pages the month scan and still totals every order', async () => {
    seedOrders(450); // 200 + 200 + 50

    const res = await call('/dashboard');

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // 450 orders x 2 units x Rs 100 — paging must not change the arithmetic.
    expect(body.stats.monthSales).toBe(90000);
    expect(prismaMock.storeOrder.findMany).toHaveBeenCalledTimes(3);
    for (const c of prismaMock.storeOrder.findMany.mock.calls) {
      expect(c[0].take).toBe(PAGE);
      // A tie-break on id keeps the cursor stable when two orders share a date.
      expect(c[0].orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    }
    expect(prismaMock.storeOrder.findMany.mock.calls[1]![0].cursor).toEqual({ id: 'o-00199' });
  });

  it('joins the buyer name once for the ten rows shown, not for every order', async () => {
    seedOrders(450);

    const res = await call('/dashboard');

    const body = res.json();
    expect(body.recentOrders).toHaveLength(10);
    expect(body.recentOrders[0].customer).toBe('Asha');
    // No `include: { user: ... }` on the scan itself.
    for (const c of prismaMock.storeOrder.findMany.mock.calls) {
      expect(c[0].include).toBeUndefined();
      expect(c[0].select.userId).toBe(true);
    }
    // One name lookup for the whole request.
    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    // …and it asks only about the buyers actually displayed.
    expect(prismaMock.user.findMany.mock.calls[0]![0].where.id.in).toEqual([
      'buyer-0',
      'buyer-1',
      'buyer-2',
    ]);
    // The join key never reaches the store owner's payload.
    expect(body.recentOrders[0].userId).toBeUndefined();
  });

  it('pages the year-long revenue scan too', async () => {
    seedOrders(450);

    const res = await call('/revenue');

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totals.yearInr).toBe(90000);
    expect(body.topProducts[0]).toMatchObject({ id: 'p-1', sold: 900, revenueInr: 90000 });
    expect(prismaMock.storeOrder.findMany).toHaveBeenCalledTimes(3);
    for (const c of prismaMock.storeOrder.findMany.mock.calls) {
      expect(c[0].take).toBe(PAGE);
    }
  });
});
