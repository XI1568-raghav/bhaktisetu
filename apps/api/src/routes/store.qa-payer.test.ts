import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { storeOrderRoutes } from './store-orders.js';
import { storeRoutes } from './store.js';

// QA_PAYER_EMAILS: no delivery fee for an allowlisted tester, so a Rs 1 product
// costs Rs 1 at the cart and at the order. Everyone else: Rs 49 under Rs 499.

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
  fullName: 'QA', line1: 'L1', line2: null, city: 'Delhi', state: 'DL',
  pincode: '110001', country: 'India', phone: null,
};
const ORIGINAL = process.env.QA_PAYER_EMAILS;

function order(totalAmountInr: number) {
  const app = Fastify();
  void app.register(storeOrderRoutes, { prefix: '/api/v1/store' });
  return app.inject({
    method: 'POST',
    url: '/api/v1/store/orders',
    headers: { authorization: 'Bearer demo-devotee' },
    payload: {
      items: [{ productId: PRODUCT_ID, qty: 1, priceAtPurchase: 1 }],
      totalAmountInr,
      shippingAddress: SHIPPING,
    },
  });
}

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
    orderNumber: 'ORD-20261104-AAAA',
    status: 'PENDING',
    createdAt: new Date(),
    ...args.data,
  }));
  prismaMock.storeProduct.findMany.mockResolvedValue([
    { id: PRODUCT_ID, price: 1, stock: 100, isActive: true, storeProfileId: null },
  ] as any);
  prismaMock.storeProduct.update.mockResolvedValue({} as any);
  prismaMock.storeProduct.updateMany.mockResolvedValue({ count: 1 } as any);
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QA_PAYER_EMAILS;
  else process.env.QA_PAYER_EMAILS = ORIGINAL;
});

describe('store order delivery fee with QA_PAYER_EMAILS', () => {
  it('normal customer: a Rs 1 product costs Rs 50, and a client total of Rs 1 is refused', async () => {
    delete process.env.QA_PAYER_EMAILS;
    const res = await order(1);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'price_mismatch', serverTotalInr: 50, deliveryFeeInr: 49 });
    expect((await order(50)).statusCode).toBe(201);
  });

  it('allowlisted tester: a Rs 1 product costs Rs 1 and is persisted as 1', async () => {
    process.env.QA_PAYER_EMAILS = 'Devotee@Demo.com';
    const res = await order(1);
    expect(res.statusCode).toBe(201);
    const created = (prismaMock.storeOrder.create.mock.calls[0] as any[])[0].data;
    expect(Number(created.totalAmountInr)).toBe(1);
  });

  it('allowlisted tester whose page still sent the fee-inclusive total is refused (server is the authority)', async () => {
    process.env.QA_PAYER_EMAILS = 'devotee@demo.com';
    const res = await order(50);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'price_mismatch', serverTotalInr: 1, deliveryFeeInr: 0 });
  });

  it('someone not on the list is not affected by the list', async () => {
    process.env.QA_PAYER_EMAILS = 'someone.else@example.com';
    expect((await order(1)).statusCode).toBe(409);
  });
});

describe('store cart delivery fee with QA_PAYER_EMAILS', () => {
  async function cartTotals() {
    const app = Fastify();
    await app.register(storeRoutes, { prefix: '/api/v1/store' });
    const headers = { authorization: 'Bearer demo-devotee' };
    // prod_002 is a Rs 349 fixture: under the Rs 499 threshold.
    await app.inject({ method: 'POST', url: '/api/v1/store/cart/items', headers, payload: { productId: 'prod_002', quantity: 1 } });
    const res = await app.inject({ method: 'GET', url: '/api/v1/store/cart', headers });
    return res.json().cart as { subtotal: number; deliveryFee: number; total: number };
  }

  it('normal customer sees the Rs 49 delivery fee in the cart', async () => {
    delete process.env.QA_PAYER_EMAILS;
    const cart = await cartTotals();
    expect(cart.deliveryFee).toBe(49);
    expect(cart.total).toBe(cart.subtotal + 49);
  });

  it('allowlisted tester sees no delivery fee and total = subtotal', async () => {
    process.env.QA_PAYER_EMAILS = 'devotee@demo.com';
    const cart = await cartTotals();
    expect(cart.deliveryFee).toBe(0);
    expect(cart.total).toBe(cart.subtotal);
  });
});
