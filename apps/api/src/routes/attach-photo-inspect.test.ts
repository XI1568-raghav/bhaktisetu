import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'owner-1', roles: ['STORE_OWNER'] };
  },
  requireRole: () => async () => {},
}));
const inspect = vi.fn();
vi.mock('../lib/upload-inspect.js', async (orig) => ({
  ...(await orig<typeof import('../lib/upload-inspect.js')>()),
  inspectOwnPhoto: (u: string) => inspect(u),
}));

import Fastify from 'fastify';
import { storeAdminRoutes } from './store-admin.js';

const PID = '8b460bdb-4a34-4c8f-9a2c-3f1f1e6d2b77';
const URL_ = 'https://cdn.example.test/photos/p.png';

async function call(method: 'POST' | 'PATCH', url: string, payload: Record<string, unknown>) {
  const app = Fastify({ logger: false });
  await app.register(storeAdminRoutes);
  const res = await app.inject({ method, url, payload });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  inspect.mockResolvedValue({ ok: true });
  prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'store-1', storeName: 'S' });
  prismaMock.storeProduct.findUnique.mockResolvedValue({ id: PID, storeProfileId: 'store-1', deletedAt: null });
  prismaMock.storeProduct.create.mockResolvedValue({ id: PID, storeProfileId: 'store-1', name: 'Diya', description: null, price: 10, imageUrl: URL_, category: null, stock: 0, sku: null, isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null });
  prismaMock.storeProduct.update.mockResolvedValue({ id: PID });
});

describe('store product image is content-checked on attach', () => {
  it('create: an empty upload is a 400 and nothing is written', async () => {
    inspect.mockResolvedValue({ ok: false, reason: 'empty' });
    const res = await call('POST', '/products', { name: 'Diya', price: 10, imageUrl: URL_ });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/empty/i);
    expect(prismaMock.storeProduct.create).not.toHaveBeenCalled();
  });
  it('update: a mislabelled file is a 400', async () => {
    inspect.mockResolvedValue({ ok: false, reason: 'wrong_type' });
    const res = await call('PATCH', `/products/${PID}`, { imageUrl: URL_ });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.storeProduct.update).not.toHaveBeenCalled();
  });
  it('update: storage unreachable is a friendly 503', async () => {
    inspect.mockResolvedValue({ ok: false, reason: 'unreachable' });
    const res = await call('PATCH', `/products/${PID}`, { imageUrl: URL_ });
    expect(res.statusCode).toBe(503);
  });
  it('a valid image still saves', async () => {
    const res = await call('POST', '/products', { name: 'Diya', price: 10, imageUrl: URL_ });
    expect(res.statusCode).toBeLessThan(300);
    expect(inspect).toHaveBeenCalledWith(URL_);
  });
});
