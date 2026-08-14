import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { storeOrderRoutes } from './store-orders.js';

// COM-06 / S-09 (prod sweep 2026-08-12): the checkout screen showed
// "Subtotal ₹698 / Delivery FREE / GST (est.) ₹35 / Total ₹733" and the button
// said "Place Order - ₹733" — while the server recomputed
// `serverTotal = Σ(unitPrice × qty)` with NO delivery and NO tax, persisted
// ₹698, and charged ₹698 in Razorpay. The number on the button was never the
// number charged, the ₹49 shipping fee on sub-₹499 baskets was never
// collected, and a "GST" line was displayed by a business with no GSTIN.
//
// The fix: delivery is computed SERVER-side and included in the persisted
// total; the client's displayed total must agree or the order is refused.

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

describe('store orders — server-side delivery fee (COM-06/S-09)', () => {
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
      orderNumber: 'ORD-20260813-AAAA',
      status: 'PENDING',
      createdAt: new Date(),
      ...args.data,
    }));
    prismaMock.storeProduct.update.mockResolvedValue({} as any);
  });

  it('adds the ₹49 delivery fee to the persisted total on a sub-₹499 basket', async () => {
    mockProduct(199);
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/store/orders',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        items: [{ productId: PRODUCT_ID, qty: 1, priceAtPurchase: 199 }],
        totalAmountInr: 248,
        shippingAddress: SHIPPING,
      },
    });
    expect(res.statusCode).toBe(201);
    const created = (prismaMock.storeOrder.create.mock.calls[0] as any[])[0].data;
    expect(Number(created.totalAmountInr)).toBe(248); // 199 + 49
  });

  it('charges no delivery fee at or above the ₹499 free-delivery threshold', async () => {
    mockProduct(349);
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/store/orders',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        items: [{ productId: PRODUCT_ID, qty: 2, priceAtPurchase: 349 }],
        totalAmountInr: 698,
        shippingAddress: SHIPPING,
      },
    });
    expect(res.statusCode).toBe(201);
    const created = (prismaMock.storeOrder.create.mock.calls[0] as any[])[0].data;
    expect(Number(created.totalAmountInr)).toBe(698);
  });

  it('returns the breakdown so the client renders the server numbers', async () => {
    mockProduct(199);
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/store/orders',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        items: [{ productId: PRODUCT_ID, qty: 1, priceAtPurchase: 199 }],
        totalAmountInr: 248,
        shippingAddress: SHIPPING,
      },
    });
    const json = res.json();
    expect(json.data.subtotalInr).toBe(199);
    expect(json.data.deliveryFeeInr).toBe(49);
    expect(json.data.totalAmount).toBe(248);
  });

  it('refuses the order when the client displayed a different total (the ₹733 vs ₹698 divergence)', async () => {
    mockProduct(349);
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/store/orders',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        items: [{ productId: PRODUCT_ID, qty: 2, priceAtPurchase: 349 }],
        // what the old checkout screen showed: 698 + 0 delivery + 35 "GST"
        totalAmountInr: 733,
        shippingAddress: SHIPPING,
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('price_mismatch');
    expect(res.json().serverTotalInr).toBe(698);
    expect(prismaMock.storeOrder.create).not.toHaveBeenCalled();
  });
});
