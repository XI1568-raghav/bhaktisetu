/**
 * CT-ADMIN-1 — a malformed admin id answered 500, a well-formed one 404.
 *
 * Probed on prod with the ct+admin token (2026-09-08):
 *
 *   GET /api/v1/admin/users/not-a-uuid                    -> 500 INTERNAL_ERROR
 *   GET /api/v1/admin/users/00000000-0000-0000-0000-000000000000 -> 404
 *
 * Same account, same route, and the only difference is the SHAPE of the id, so
 * the fault is entirely ours: `User.id` is `@db.Uuid`, Prisma raises P2023
 * ("Error creating UUID") when a uuid column is filtered with something that
 * cannot be cast, and `getUserById`'s catch re-threw it into the route's
 * generic 500 handler. The web page /admin/users/[id] passes its raw path
 * segment straight through, so a truncated or mistyped link is a server error
 * on an operator's screen instead of "not found".
 *
 * Two more handlers on this file reach Prisma with a path id and had the same
 * gap — PATCH /users/:id and PATCH /priests/:id/commission-rate, the second of
 * which has no try/catch at all. The remaining /admin/*\/:id routes are the
 * AO-16 501 stubs and never touch the database, so they are unaffected.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The absent-but-well-formed control: this one already 404s correctly. */
const GHOST = '00000000-0000-0000-0000-000000000000';

/** Every shape the sweep hit on prod, plus an empty-ish segment. */
const MALFORMED = ['not-a-uuid', '123', '__ct_zzz', 'abc-def', 'undefined'];

/**
 * What Prisma actually does when a `@db.Uuid` column is filtered with a value
 * it cannot cast. Without this the mock would answer `null` for a bad id and
 * every assertion below would pass against the unfixed code.
 */
function uuidStrictFindUnique(model: string) {
  return async (args: { where?: { id?: string; email?: string } }) => {
    if (args?.where?.email === 'admin@demo.com') return DEMO_ADMIN;
    const id = args?.where?.id;
    if (typeof id === 'string' && !UUID_RE.test(id)) {
      throw new Prisma.PrismaClientKnownRequestError(
        `Inconsistent column data: Error creating UUID, invalid character: expected an optional prefix of \`urn:uuid:\` followed by [0-9a-fA-F-], found \`${id}\` on ${model}.id`,
        { code: 'P2023', clientVersion: '6.6.0' },
      );
    }
    return null;
  };
}

async function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: Record<string, unknown>,
) {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await adminRoutes(instance);
    },
    { prefix: '/api/v1/admin' },
  );
  const res = await app.inject({
    method,
    url: `/api/v1/admin${url}`,
    headers: { authorization: 'Bearer demo-admin' },
    ...(payload === undefined ? {} : { payload }),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(uuidStrictFindUnique('User') as never);
  prismaMock.priest.findUnique.mockImplementation(uuidStrictFindUnique('Priest') as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);
});

describe('CT-ADMIN-1 — a malformed admin id is a miss, not a server fault', () => {
  it('the simulation rejects a non-uuid, so these tests can fail', async () => {
    // Guard on the guard: if the mock stopped throwing, a 404 below would prove
    // nothing about the handler.
    const lookup = uuidStrictFindUnique('User');
    await expect(lookup({ where: { id: 'not-a-uuid' } })).rejects.toMatchObject({ code: 'P2023' });
    await expect(lookup({ where: { id: GHOST } })).resolves.toBeNull();
  });

  it.each(MALFORMED)('GET /users/%s answers 404, not 500', async (bad) => {
    const res = await call('GET', `/users/${bad}`);
    expect(res.statusCode).toBe(404);
    // The id never reaches Prisma: this is a guard before the lookup, not a
    // catch after it. Swallowing P2023 downstream would satisfy the status
    // assertion while still paying for a round trip that can only fail.
    expect(prismaMock.user.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: bad } }),
    );
  });

  it('GET /users/:id still 404s on a well-formed id that does not exist', async () => {
    const res = await call('GET', `/users/${GHOST}`);
    expect(res.statusCode).toBe(404);
    // The control must keep reaching Prisma — a guard that rejected every id
    // would satisfy the assertion above while breaking the endpoint.
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: GHOST } }),
    );
  });

  it('GET /users/:id never sends the Prisma cast error to the client', async () => {
    const res = await call('GET', '/users/not-a-uuid');
    expect(res.body).not.toContain('P2023');
    expect(res.body).not.toContain('Inconsistent column data');
  });

  it('PATCH /users/:id answers 404 on a malformed id', async () => {
    // This handler has no try/catch, so before the fix the P2023 escaped into
    // Fastify's error handler as a bare 500.
    const res = await call('PATCH', '/users/not-a-uuid', { blocked: true });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /users/:id still answers 400 for an invalid body', async () => {
    const res = await call('PATCH', `/users/${GHOST}`, { blocked: 'yes-please' });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /priests/:id/commission-rate answers 404 on a malformed id', async () => {
    const res = await call('PATCH', '/priests/not-a-uuid/commission-rate', {
      commissionRate: 0.8,
    });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /priests/:id/commission-rate keeps rejecting a bad rate with 400', async () => {
    // The rate band is the more important guard of the two: an out-of-band
    // share silently falls back at booking time. A malformed id must not
    // shadow it.
    const res = await call('PATCH', `/priests/${GHOST}/commission-rate`, {
      commissionRate: 80,
    });
    expect(res.statusCode).toBe(400);
  });
});
