import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { storeOrderRoutes } from './store-orders.js';

// QA 2026-10-13: two lines of the same product (3 + 3 against a stock of 5) each
// passed the per-line `stock < qty` check and drove stock to -1.

const BUYER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const SHIPPING = { fullName: 'QA', line1: 'L1', city: 'Delhi', state: 'DL', pincode: '110001', country: 'India' };

function place(items: { productId: string; qty: number; priceAtPurchase: number }[], total: number) {
  const app = Fastify();
  void app.register(storeOrderRoutes, { prefix: '/api/v1/store' });
  return app.inject({
    method: 'POST',
    url: '/api/v1/store/orders',
    headers: { authorization: 'Bearer demo-devotee' },
    payload: { items, totalAmountInr: total, shippingAddress: SHIPPING },
  });
}

describe('store orders — stock accounting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? BUYER : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.storeOrder.findFirst.mockResolvedValue(null);
    prismaMock.storeOrder.create.mockImplementation(async (args: any) => ({
      id: '44444444-4444-4444-8444-444444444444',
      orderNumber: 'ORD-20261013-AAAA',
      status: 'PENDING',
      createdAt: new Date(),
      ...args.data,
    }));
    prismaMock.storeProduct.updateMany.mockResolvedValue({ count: 1 } as any);
    prismaMock.storeProduct.findMany.mockResolvedValue([
      { id: PRODUCT_ID, price: 100, stock: 5, isActive: true, storeProfileId: null },
    ] as any);
  });

  it('refuses split lines of one product that together exceed stock', async () => {
    const res = await place(
      [
        { productId: PRODUCT_ID, qty: 3, priceAtPurchase: 100 },
        { productId: PRODUCT_ID, qty: 3, priceAtPurchase: 100 },
      ],
      649,
    );
    expect(res.statusCode).toBe(409);
    expect(prismaMock.storeOrder.create).not.toHaveBeenCalled();
  });

  it('decrements once per product with a stock guard', async () => {
    const res = await place(
      [
        { productId: PRODUCT_ID, qty: 2, priceAtPurchase: 100 },
        { productId: PRODUCT_ID, qty: 2, priceAtPurchase: 100 },
      ],
      449,
    );
    expect(res.statusCode).toBe(201);
    expect(prismaMock.storeProduct.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.storeProduct.updateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, stock: { gte: 4 } },
      data: { stock: { decrement: 4 } },
    });
  });

  it('answers 409 when a concurrent order took the last unit', async () => {
    prismaMock.storeProduct.updateMany.mockResolvedValue({ count: 0 } as any);
    const res = await place([{ productId: PRODUCT_ID, qty: 1, priceAtPurchase: 100 }], 149);
    expect(res.statusCode).toBe(409);
  });
});
