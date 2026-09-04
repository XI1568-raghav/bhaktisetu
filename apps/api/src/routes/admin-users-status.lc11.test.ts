/**
 * LC-11 (HTTP surface) — GET /admin/users and the `status` query parameter.
 *
 * `userQuerySchema` in routes/admin.ts has always parsed `status` and the route
 * has always forwarded it to `adminService.getUsers`, which ignored it. The
 * caller therefore got 200 and an unfiltered list: the endpoint accepted a
 * filter, acknowledged it, and did not apply it. There is no worse of the three
 * options — an endpoint that rejected the parameter, or one that never accepted
 * it, would at least tell the operator where they stand.
 *
 * Two things are pinned here, at the layer an operator actually touches:
 *   1. a supported status reaches the query, so the rows AND `total` are filtered;
 *   2. a status this endpoint cannot express is a 400 that names what it can do,
 *      not a 200 over an unfiltered list and not a 500.
 *
 * PROVEN TO FAIL FIRST: run against HEAD's admin.service.ts (copied beside the
 * original so its imports resolved, then deleted) both cases failed — the
 * blocked filter never reached Prisma, and `?status=pending` answered 200.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

async function get(url: string) {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await adminRoutes(instance);
    },
    { prefix: '/api/v1/admin' },
  );
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/admin${url}`,
    headers: { authorization: 'Bearer demo-admin' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
});

describe('LC-11 — GET /admin/users?status=', () => {
  it('applies ?status=blocked to the query instead of answering 200 unfiltered', async () => {
    const res = await get('/users?status=blocked');

    expect(res.statusCode).toBe(200);
    // The assertion the old behaviour failed: the parameter reached Postgres.
    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    expect(listWhere.blocked).toBe(true);
    expect(prismaMock.user.count.mock.calls[0]![0]!.where).toEqual(listWhere);
  });

  it('?status=pending is a 400 naming the supported values, not a silent 200', async () => {
    const res = await get('/users?status=pending');

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.supported).toEqual(['active', 'blocked']);
    expect(body.error).toContain('pending');
    // A bad query parameter must not read the users table at all.
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('no ?status= is unchanged — the whole directory, unconstrained', async () => {
    const res = await get('/users');

    expect(res.statusCode).toBe(200);
    expect(prismaMock.user.findMany.mock.calls[0]![0]!.where).not.toHaveProperty('blocked');
  });
});
