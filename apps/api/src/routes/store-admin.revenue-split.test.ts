/**
 * Unpaid cash-on-delivery orders count toward sales but never produce a
 * commission or platform payout (the buyer pays the seller in cash). The
 * payloads therefore split sales into online-paid vs COD, additively: the
 * existing todaySales/monthSales/totals fields keep their meaning (combined).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'u1', roles: ['STORE_OWNER'] };
  },
}));

import Fastify from 'fastify';
import { storeAdminRoutes } from './store-admin.js';
import { __profileIdMemoClear } from '../lib/profile-id-memo.js';

const now = new Date();
const mk = (id: string, price: number, paymentId: string | null) => ({
  id,
  orderNumber: id,
  status: 'DELIVERED',
  userId: 'b1',
  createdAt: now,
  paymentId,
  items: [{ productId: 'p-1', qty: 1, priceAtPurchase: price }],
});

async function call(url: string) {
  const app = Fastify();
  await app.register(storeAdminRoutes);
  const res = await app.inject({ method: 'GET', url });
  await app.close();
  return res.json();
}

beforeEach(() => {
  vi.clearAllMocks();
  __profileIdMemoClear();
  prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'store-1' });
  prismaMock.storeProduct.findMany.mockResolvedValue([{ id: 'p-1', name: 'Mala', stock: 40 }]);
  prismaMock.user.findMany.mockResolvedValue([{ id: 'b1', fullName: 'Asha' }]);
  prismaMock.storeOrder.findMany.mockResolvedValue([
    mk('o1', 500, 'pay-1'),
    mk('o2', 300, null),
    mk('o3', 200, null),
  ] as never);
});

describe('store sales split online vs cash-on-delivery', () => {
  it('/revenue keeps combined totals and adds the split', async () => {
    const body = await call('/revenue');
    expect(body.totals.yearInr).toBe(1000);
    expect(body.onlinePaid).toEqual({ todayInr: 500, monthInr: 500, yearInr: 500 });
    expect(body.cashOnDelivery).toEqual({ todayInr: 500, monthInr: 500, yearInr: 500 });
  });

  it('/dashboard keeps combined stats and adds the split', async () => {
    const body = await call('/dashboard');
    expect(body.stats.monthSales).toBe(1000);
    expect(body.stats.todaySales).toBe(1000);
    expect(body.stats.monthOnlineSales).toBe(500);
    expect(body.stats.monthCodSales).toBe(500);
    expect(body.stats.todayOnlineSales).toBe(500);
    expect(body.stats.todayCodSales).toBe(500);
  });

  it('empty store returns zeroed split fields', async () => {
    prismaMock.storeProfile.findUnique.mockResolvedValue(null);
    prismaMock.storeProfile.findFirst.mockResolvedValue(null);
    const body = await call('/revenue');
    expect(body.onlinePaid).toEqual({ todayInr: 0, monthInr: 0, yearInr: 0 });
    expect(body.cashOnDelivery).toEqual({ todayInr: 0, monthInr: 0, yearInr: 0 });
  });
});
