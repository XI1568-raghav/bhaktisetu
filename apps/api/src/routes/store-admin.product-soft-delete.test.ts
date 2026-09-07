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
 * DELETE /store-admin/products/:id destroyed other devotees' content.
 *
 * `Review.product` is declared `onDelete: Cascade`, so `prisma.storeProduct
 * .delete()` took every review of that product with it — reviews are written by
 * buyers, not by the store owner deleting the row.
 * `services/account-deletion.service.ts` already refuses to do this to the same
 * table on account closure ("a review is another devotee's content, not this
 * user's") and deactivates instead; this route contradicted it.
 *
 * WHY `deletedAt` AND NOT `isActive`. `isActive` is the owner's own listing
 * toggle — POST accepts it and PATCH flips it, so an owner deliberately
 * unlisting a product expects to still find it in their catalogue and turn it
 * back on. Hiding rows on `isActive` would make a deactivated product vanish
 * and become unreactivatable, which is a worse bug than the one being fixed.
 * Deletion therefore needs its own marker, and the last test here is the guard
 * that stops a future reader from "simplifying" the two back into one flag.
 */

async function call(method: 'GET' | 'DELETE', url: string) {
  const app = Fastify();
  await app.register(storeAdminRoutes);
  const res = await app.inject({ method, url });
  await app.close();
  return res;
}

const OWN = { id: 'p-1', storeProfileId: 'store-1', name: 'Tulsi Mala' };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'store-1' });
  prismaMock.storeProduct.findUnique.mockResolvedValue(OWN);
  prismaMock.storeProduct.update.mockResolvedValue({ ...OWN, isActive: false });
  prismaMock.storeProduct.findMany.mockResolvedValue([]);
  prismaMock.storeProduct.count.mockResolvedValue(0);
});

describe('DELETE /store-admin/products/:id', () => {
  it('never issues a destructive delete — reviews cascade off it', async () => {
    const res = await call('DELETE', '/products/p-1');

    expect(res.statusCode).toBe(200);
    expect(
      prismaMock.storeProduct.delete,
      'a hard delete cascades away every Review of this product',
    ).not.toHaveBeenCalled();
  });

  it('marks the row deleted, unlists it, and zeroes its stock', async () => {
    await call('DELETE', '/products/p-1');

    expect(prismaMock.storeProduct.update).toHaveBeenCalledTimes(1);
    const arg = prismaMock.storeProduct.update.mock.calls[0]![0];
    expect(arg.where).toEqual({ id: 'p-1' });
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
    // isActive:false keeps it out of the public catalogue (routes/store.ts
    // filters on it) and blocks purchase (routes/store-orders.ts rejects an
    // inactive product), so a deleted product cannot be bought.
    expect(arg.data.isActive).toBe(false);
    expect(arg.data.stock).toBe(0);
  });

  it('still refuses another owner\'s product, and still 404s an unknown one', async () => {
    prismaMock.storeProduct.findUnique.mockResolvedValue({ ...OWN, storeProfileId: 'other-store' });
    expect((await call('DELETE', '/products/p-1')).statusCode).toBe(403);

    prismaMock.storeProduct.findUnique.mockResolvedValue(null);
    expect((await call('DELETE', '/products/p-1')).statusCode).toBe(404);

    expect(prismaMock.storeProduct.update).not.toHaveBeenCalled();
  });

  it('is idempotent — deleting an already-deleted product does not 500', async () => {
    prismaMock.storeProduct.findUnique.mockResolvedValue({ ...OWN, deletedAt: new Date() });

    const res = await call('DELETE', '/products/p-1');

    expect(res.statusCode).toBe(200);
    expect(prismaMock.storeProduct.delete).not.toHaveBeenCalled();
  });
});

describe('GET /store-admin/products', () => {
  it('hides deleted products from the owner catalogue, in both the page and the count', async () => {
    await call('GET', '/products');

    const findArgs = prismaMock.storeProduct.findMany.mock.calls[0]![0];
    expect(findArgs.where).toEqual({ storeProfileId: 'store-1', deletedAt: null });
    // The paired COUNT must carry the same filter or `total` claims rows the
    // page will never show — SCAL-09's lying number, reintroduced.
    const countArgs = prismaMock.storeProduct.count.mock.calls[0]![0];
    expect(countArgs.where).toEqual({ storeProfileId: 'store-1', deletedAt: null });
  });

  it('still shows a product the owner merely DEACTIVATED, so it can be switched back on', async () => {
    await call('GET', '/products');

    const where = prismaMock.storeProduct.findMany.mock.calls[0]![0].where;
    expect(
      where,
      'isActive is the owner\'s listing toggle, not a deletion marker — filtering on it strands deactivated products',
    ).not.toHaveProperty('isActive');
  });
});
