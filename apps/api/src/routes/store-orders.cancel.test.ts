import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { storeOrderRoutes } from './store-orders.js';

// QA 2026-10-13: cancelling an order never put its units back on the shelf and
// left the owner's commission PENDING (withdrawable); REFUNDED was unreachable.

const ADMIN = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Admin',
  subscriptionTier: 'free',
  blocked: false,
};
const ORDER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

function patch(status: string) {
  const app = Fastify();
  void app.register(storeOrderRoutes, { prefix: '/api/v1/store' });
  return app.inject({
    method: 'PATCH',
    url: `/api/v1/store/orders/${ORDER_ID}/status`,
    headers: { authorization: 'Bearer demo-admin' },
    payload: { status },
  });
}

describe('store order cancel / refund side effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'admin@demo.com' ? ADMIN : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.storeOrder.update.mockImplementation(async (args: any) => ({ id: ORDER_ID, ...args.data }));
    prismaMock.storeProduct.updateMany.mockResolvedValue({ count: 1 } as any);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as any);
  });

  function order(status: string) {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      status,
      statusHistory: [],
      trackingNumber: null,
      items: [
        { productId: PRODUCT_ID, qty: 2, priceAtPurchase: 100 },
        { productId: PRODUCT_ID, qty: 1, priceAtPurchase: 100 },
      ],
    } as any);
  }

  it('restocks and reverses the pending commission on CANCELLED', async () => {
    order('CONFIRMED');
    const res = await patch('CANCELLED');
    expect(res.statusCode).toBe(200);
    expect(prismaMock.storeProduct.updateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, deletedAt: null },
      data: { stock: { increment: 3 } },
    });
    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith({
      where: { storeOrderId: ORDER_ID, status: 'PENDING' },
      data: { status: 'REVERSED' },
    });
  });

  it('allows a delivered order to be REFUNDED: commission reversed, no restock', async () => {
    order('DELIVERED');
    const res = await patch('REFUNDED');
    expect(res.statusCode).toBe(200);
    expect(prismaMock.commission.updateMany).toHaveBeenCalled();
    expect(prismaMock.storeProduct.updateMany).not.toHaveBeenCalled();
  });

  it('still refuses to leave a terminal state', async () => {
    order('CANCELLED');
    const res = await patch('CONFIRMED');
    expect(res.statusCode).toBe(409);
  });
});
