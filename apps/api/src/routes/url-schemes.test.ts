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
import { __testing as adminTesting } from './admin.js';

const PRODUCT_ID = '8b460bdb-4a34-4c8f-9a2c-3f1f1e6d2b77';
const PRODUCT = {
  id: PRODUCT_ID, storeProfileId: 'store-1', name: 'Diya', description: null, price: 10,
  imageUrl: null, category: null, stock: 1, sku: null, isActive: true,
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
};
const BAD = ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'vbscript:x'];

async function call(method: 'POST' | 'PATCH', url: string, payload: Record<string, unknown>) {
  const app = Fastify({ logger: false });
  await app.register(storeAdminRoutes);
  const res = await app.inject({ method, url, payload });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'store-1', storeName: 'S' });
  prismaMock.storeProduct.findUnique.mockResolvedValue(PRODUCT);
  prismaMock.storeProduct.create.mockResolvedValue(PRODUCT);
  prismaMock.storeProduct.update.mockResolvedValue(PRODUCT);
});

describe('store product imageUrl is http(s) only', () => {
  it.each(BAD)('POST /products rejects %s', async (imageUrl) => {
    const res = await call('POST', '/products', { name: 'Diya', price: 10, imageUrl });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.storeProduct.create).not.toHaveBeenCalled();
  });

  it.each(BAD)('PATCH /products/:id rejects %s', async (imageUrl) => {
    const res = await call('PATCH', `/products/${PRODUCT_ID}`, { imageUrl });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.storeProduct.update).not.toHaveBeenCalled();
  });

  it.each(['https://example.com/a.png', 'http://example.com/a.png'])('accepts %s', async (imageUrl) => {
    const res = await call('PATCH', `/products/${PRODUCT_ID}`, { imageUrl });
    expect(res.statusCode).toBe(200);
  });
});

describe('temple websiteUrl is http(s) only', () => {
  it.each(BAD)('patch schema rejects %s', (websiteUrl) => {
    expect(adminTesting.templePatchSchema.safeParse({ websiteUrl }).success).toBe(false);
  });
  it('patch schema accepts https', () => {
    expect(adminTesting.templePatchSchema.safeParse({ websiteUrl: 'https://temple.example' }).success).toBe(true);
  });
});
