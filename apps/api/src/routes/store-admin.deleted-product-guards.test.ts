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
 * Three defects measured on prod 2026-09-08, all downstream of one thing:
 * `store_products.deleted_at` was added for DELETE, and the paths around it
 * were not all updated with it.
 *
 *   1. PATCH /products/:id looked the row up with findUnique and never read
 *      deletedAt, so a deleted product could be PATCHed back to isActive:true
 *      / stock:5 / price:1. It reappeared on the PUBLIC shelf
 *      (GET /store/products/live) while staying absent from the owner's own
 *      catalogue — buyable by devotees, unreachable by the seller who deleted
 *      it. No attacker required: two tabs on /store-admin/products, delete in
 *      one, save in the other.
 *   2. GET /dashboard answered `lowStock: 3` to an owner whose catalogue was
 *      `{"products":[],"total":0}` — soft delete forces stock to 0, and the
 *      low-stock filter did not exclude deleted rows, so the number only grew.
 *   3. DELETE and PATCH /products/not-a-uuid answered 500 INTERNAL_ERROR:
 *      the id went straight into findUnique against a uuid column and Prisma
 *      raised P2023. A valid-but-absent uuid already 404s correctly.
 *
 * The dashboard's money aggregates are deliberately NOT part of fix 2 — they
 * attribute historical order lines and must keep resolving against deleted
 * products, which is why DELETE soft-deletes at all. The last test here is the
 * guard against "fixing" lowStock by filtering the query and silently moving
 * revenue.
 */

const PRODUCT_ID = '8b460bdb-4a34-4c8f-9a2c-3f1f1e6d2b77';

const LIVE_PRODUCT = {
  id: PRODUCT_ID,
  storeProfileId: 'store-1',
  name: 'QA-Test-Product',
  description: null,
  price: 199.5,
  imageUrl: null,
  category: null,
  stock: 1,
  sku: null,
  isActive: true,
  createdAt: new Date('2026-09-08T15:00:00Z'),
  updatedAt: new Date('2026-09-08T15:00:00Z'),
  deletedAt: null,
};

const DELETED_PRODUCT = {
  ...LIVE_PRODUCT,
  isActive: false,
  stock: 0,
  deletedAt: new Date('2026-09-08T15:30:00Z'),
};

/** What Prisma actually throws when a non-uuid reaches a @db.Uuid column. */
function p2023(): Error {
  return Object.assign(
    new Error(
      'Inconsistent column data: Error creating UUID, invalid character: expected an optional ' +
        'prefix of `urn:uuid:` followed by [0-9a-fA-F-], found `o` at 3',
    ),
    { code: 'P2023', clientVersion: '5.22.0' },
  );
}

async function call(
  method: 'GET' | 'PATCH' | 'DELETE',
  url: string,
  payload?: Record<string, unknown>,
) {
  const app = Fastify({ logger: false });
  await app.register(storeAdminRoutes);
  // Two literal calls rather than a spread: a conditionally-present `payload`
  // widens the argument enough that inject resolves to its chainable overload.
  const res =
    payload === undefined
      ? await app.inject({ method, url })
      : await app.inject({ method, url, payload });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'store-1' });
  prismaMock.storeProduct.findUnique.mockResolvedValue(LIVE_PRODUCT);
  prismaMock.storeProduct.update.mockResolvedValue(LIVE_PRODUCT);
  prismaMock.storeProduct.findMany.mockResolvedValue([]);
  prismaMock.storeProduct.count.mockResolvedValue(0);
  prismaMock.storeOrder.findMany.mockResolvedValue([]);
  prismaMock.user.findMany.mockResolvedValue([]);
});

describe('PATCH /store-admin/products/:id — a deleted product is not mutable', () => {
  it('404s instead of putting a deleted product back on the public shelf', async () => {
    prismaMock.storeProduct.findUnique.mockResolvedValue(DELETED_PRODUCT);

    const res = await call('PATCH', `/products/${PRODUCT_ID}`, {
      isActive: true,
      stock: 5,
      price: 1,
    });

    expect(res.statusCode).toBe(404);
    expect(
      prismaMock.storeProduct.update,
      'a row GET /products cannot show must not be writable — it comes back on the public shelf where the owner has no row to click',
    ).not.toHaveBeenCalled();
  });

  it('still applies a patch to a product that is merely deactivated', async () => {
    // isActive:false is the owner's own listing toggle, not a deletion marker.
    // Blocking this patch would strand every deliberately unlisted product.
    prismaMock.storeProduct.findUnique.mockResolvedValue({ ...LIVE_PRODUCT, isActive: false });
    prismaMock.storeProduct.update.mockResolvedValue({ ...LIVE_PRODUCT, isActive: true });

    const res = await call('PATCH', `/products/${PRODUCT_ID}`, { isActive: true });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.storeProduct.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.storeProduct.update.mock.calls[0]![0].data).toEqual({ isActive: true });
  });
});

describe('malformed product id — a miss, not a P2023 crash', () => {
  beforeEach(() => {
    // If the guard is missing the handler reaches this and answers 500.
    prismaMock.storeProduct.findUnique.mockRejectedValue(p2023());
  });

  it('404s DELETE /products/not-a-uuid', async () => {
    const res = await call('DELETE', '/products/not-a-uuid');

    expect(
      res.statusCode,
      'an id that cannot be a uuid cannot match a uuid column — a miss, not a 500',
    ).toBe(404);
    expect(prismaMock.storeProduct.update).not.toHaveBeenCalled();
  });

  it('404s PATCH /products/not-a-uuid', async () => {
    const res = await call('PATCH', '/products/not-a-uuid', { price: 5 });

    expect(res.statusCode).toBe(404);
    expect(prismaMock.storeProduct.update).not.toHaveBeenCalled();
  });

  it('leaks no Prisma frame or filesystem path in the body', async () => {
    const bodies = [
      (await call('DELETE', '/products/not-a-uuid')).body,
      (await call('PATCH', '/products/not-a-uuid', { price: 5 })).body,
    ];
    for (const body of bodies) {
      expect(body).not.toMatch(/P2023|prisma\.|E:\\|\/apps\/api\/src\//);
    }
  });

  it('absorbs P2023 only — any other driver failure is still a 5xx', async () => {
    // The narrow catch is the point: a connection drop or a constraint error
    // must not be laundered into "Product not found".
    prismaMock.storeProduct.findUnique.mockRejectedValue(
      Object.assign(new Error('Timed out fetching a new connection from the pool'), {
        code: 'P2024',
      }),
    );

    const res = await call('DELETE', '/products/00000000-0000-0000-0000-000000000000');

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
  });
});

describe('valid-but-absent uuid — unchanged', () => {
  it('still 404s on both verbs', async () => {
    prismaMock.storeProduct.findUnique.mockResolvedValue(null);

    expect((await call('DELETE', '/products/00000000-0000-0000-0000-000000000000')).statusCode).toBe(
      404,
    );
    expect(
      (await call('PATCH', '/products/00000000-0000-0000-0000-000000000000', { price: 5 }))
        .statusCode,
    ).toBe(404);
  });
});

describe('GET /store-admin/dashboard — catalogue aggregates', () => {
  it('does not count deleted products as low stock', async () => {
    prismaMock.storeProduct.findMany.mockResolvedValue([
      { id: 'p-live', stock: 40, deletedAt: null },
      { id: 'p-del-1', stock: 0, deletedAt: new Date() },
      { id: 'p-del-2', stock: 0, deletedAt: new Date() },
      { id: 'p-del-3', stock: 0, deletedAt: new Date() },
    ]);

    const res = await call('GET', '/dashboard');

    expect(res.statusCode).toBe(200);
    expect(
      res.json().stats.lowStock,
      'soft delete zeroes stock, so an unfiltered low-stock count grows by one per deletion forever',
    ).toBe(0);
  });

  it('still counts a live product that genuinely is low', async () => {
    prismaMock.storeProduct.findMany.mockResolvedValue([
      { id: 'p-live', stock: 2, deletedAt: null },
      { id: 'p-del', stock: 0, deletedAt: new Date() },
    ]);

    expect((await call('GET', '/dashboard')).json().stats.lowStock).toBe(1);
  });

  it('still attributes a deleted product\'s past orders to this store', async () => {
    // The guard on over-correcting: excluding deleted rows from the product
    // lookup itself would drop their historical revenue out of the totals,
    // which is precisely what soft delete exists to prevent.
    prismaMock.storeProduct.findMany.mockResolvedValue([
      { id: 'p-del', stock: 0, deletedAt: new Date() },
    ]);
    prismaMock.storeOrder.findMany.mockResolvedValue([
      {
        id: 'o-1',
        orderNumber: 'SO-1',
        status: 'DELIVERED',
        userId: 'buyer-1',
        createdAt: new Date(),
        items: [{ productId: 'p-del', qty: 2, priceAtPurchase: 100 }],
      },
    ]);

    const stats = (await call('GET', '/dashboard')).json().stats;

    expect(stats.monthSales).toBe(200);
    expect(stats.todaySales).toBe(200);
    expect(stats.todayOrders).toBe(1);
    expect(stats.lowStock).toBe(0);
  });
});
