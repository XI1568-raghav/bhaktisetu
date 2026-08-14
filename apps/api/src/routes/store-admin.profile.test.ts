import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { storeAdminRoutes } from './store-admin.js';

// S-07 (prod sweep 2026-08-12): a store owner logs in, /store-admin/products
// says "No products found — Add your first product to start selling", they
// click Add Product, and the save fails with
//   400 {"error":"No StoreProfile for this user"}
// rendered verbatim by `setError(err.message)`. Seller onboarding dead-ends on
// an internal-sounding string with no route forward, and no endpoint existed
// anywhere to create the missing StoreProfile.

const OWNER = {
  id: '55555555-5555-4555-8555-555555555555',
  email: 'store@demo.com',
  phone: null,
  fullName: 'Demo Store Owner',
  subscriptionTier: 'free',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(storeAdminRoutes, { prefix: '/api/v1/store-admin' });
  return app;
}

describe('store-admin — missing StoreProfile is recoverable (S-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'store@demo.com' ? OWNER : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: OWNER.id, role: 'STORE_OWNER' },
    ] as any);
    prismaMock.storeProfile.findUnique.mockResolvedValue(null);
  });

  it('GET /products tells the client the profile is missing instead of a bare empty list', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/store-admin/products',
      headers: { authorization: 'Bearer demo-store' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ products: [], storeProfileMissing: true });
  });

  it('POST /products answers a machine-readable code + actionable copy, not an internal string', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/store-admin/products',
      headers: { authorization: 'Bearer demo-store' },
      payload: { name: 'QA Brass Diya Set', price: 199, stock: 10 },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.code).toBe('store_profile_required');
    expect(body.error).not.toMatch(/No StoreProfile/);
    expect(body.message).toMatch(/store/i);
  });

  it('PUT /profile creates the StoreProfile with the name the owner supplied', async () => {
    prismaMock.storeProfile.create.mockImplementation(async (args: any) => ({
      id: 'sp-1',
      userId: OWNER.id,
      storeName: args.data.storeName,
      city: args.data.city ?? null,
      state: args.data.state ?? null,
      address: args.data.address ?? null,
      gstNumber: args.data.gstNumber ?? null,
      categories: args.data.categories ?? [],
      approved: false,
      rating: 0,
      totalProducts: 0,
      totalOrders: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const app = makeApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/store-admin/profile',
      headers: { authorization: 'Bearer demo-store' },
      payload: { storeName: 'Vrindavan Puja Bhandar', city: 'Mathura' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().profile.storeName).toBe('Vrindavan Puja Bhandar');
    // Never invented — the name came from the request, and the profile is not
    // auto-approved for public listing.
    expect(prismaMock.storeProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: OWNER.id, storeName: 'Vrindavan Puja Bhandar' }),
      }),
    );
    expect(res.json().profile.approved).toBe(false);
  });

  it('PUT /profile refuses a blank store name rather than inventing one', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/store-admin/profile',
      headers: { authorization: 'Bearer demo-store' },
      payload: { storeName: '  ' },
    });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.storeProfile.create).not.toHaveBeenCalled();
  });

  it('PUT /profile updates rather than duplicates when a profile exists', async () => {
    prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'sp-1' } as any);
    prismaMock.storeProfile.update.mockResolvedValue({
      id: 'sp-1',
      userId: OWNER.id,
      storeName: 'Renamed Store',
      approved: true,
    } as any);
    const app = makeApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/store-admin/profile',
      headers: { authorization: 'Bearer demo-store' },
      payload: { storeName: 'Renamed Store' },
    });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.storeProfile.create).not.toHaveBeenCalled();
    expect(prismaMock.storeProfile.update).toHaveBeenCalled();
  });

  it('GET /profile reports the missing profile honestly (null, not a stub)', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/store-admin/profile',
      headers: { authorization: 'Bearer demo-store' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ profile: null });
  });

  it('still gates every profile route on the STORE_OWNER role', async () => {
    const DEVOTEE = { ...OWNER, id: 'user-devotee-1', email: 'devotee@demo.com' };
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? DEVOTEE : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    const app = makeApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/store-admin/profile',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { storeName: 'Sneaky Store' },
    });
    expect(res.statusCode).toBe(403);
    expect(prismaMock.storeProfile.create).not.toHaveBeenCalled();
  });
});
