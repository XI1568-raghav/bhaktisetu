import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { storeRoutes } from './store.js';

// Role pass 2026-10-07: a self-created store is `approved:false` until an admin
// reviews it, yet its products were on the public shelf and orderable.
describe('public store shelf: approved stores only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.storeProduct.findMany.mockResolvedValue([] as never);
  });

  it('GET /products/live only reads products of approved stores', async () => {
    const app = Fastify();
    await app.register(storeRoutes, { prefix: '/api/v1/store' });
    const res = await app.inject({ method: 'GET', url: '/api/v1/store/products/live' });
    expect(res.statusCode).toBe(200);
    const where = (prismaMock.storeProduct.findMany.mock.calls[0] as any[])[0].where;
    expect(where.storeProfile).toEqual({ approved: true });
    expect(where.isActive).toBe(true);
  });

  it('GET /products (merged catalogue) only merges in approved stores', async () => {
    const app = Fastify();
    await app.register(storeRoutes, { prefix: '/api/v1/store' });
    const res = await app.inject({ method: 'GET', url: '/api/v1/store/products' });
    expect(res.statusCode).toBe(200);
    const where = (prismaMock.storeProduct.findMany.mock.calls[0] as any[])[0].where;
    expect(where.storeProfile).toEqual({ approved: true });
  });
});
