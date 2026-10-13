import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { storeOrderRoutes } from './store-orders.js';

// Role pass 2026-10-07: support copy and /nri-pujas say store orders are
// delivered within India only; the API used to accept (and charge for) a US address.

const BUYER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

const SHIPPING = {
  fullName: 'QA',
  line1: 'L1',
  line2: null,
  city: 'Delhi',
  state: 'DL',
  pincode: '110001',
  country: 'India',
  phone: null,
};

function makeApp() {
  const app = Fastify();
  void app.register(storeOrderRoutes, { prefix: '/api/v1/store' });
  return app;
}

function mockProduct(price: number) {
  prismaMock.storeProduct.findMany.mockResolvedValue([
    { id: PRODUCT_ID, price, stock: 100, isActive: true, storeProfileId: null },
  ] as any);
}


describe('store orders — India-only delivery', () => {
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
      orderNumber: 'ORD-20261007-AAAA',
      status: 'PENDING',
      createdAt: new Date(),
      ...args.data,
    }));
    prismaMock.storeProduct.update.mockResolvedValue({} as any);
    prismaMock.storeProduct.updateMany.mockResolvedValue({ count: 1 } as any);
    mockProduct(500);
  });

  async function place(country: string | undefined) {
    const app = makeApp();
    const shippingAddress: Record<string, unknown> = { ...SHIPPING };
    if (country === undefined) delete shippingAddress.country;
    else shippingAddress.country = country;
    return app.inject({
      method: 'POST',
      url: '/api/v1/store/orders',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        items: [{ productId: PRODUCT_ID, qty: 1, priceAtPurchase: 500 }],
        totalAmountInr: 500,
        shippingAddress,
      },
    });
  }

  it('refuses a non-Indian delivery address before any order is created', async () => {
    const res = await place('United States');
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.json())).toContain('within India only');
    expect(prismaMock.storeOrder.create).not.toHaveBeenCalled();
  });

  it.each(['India', 'IN', 'india', undefined])('accepts country %s', async (country) => {
    const res = await place(country);
    expect(res.statusCode).toBe(201);
  });
});
