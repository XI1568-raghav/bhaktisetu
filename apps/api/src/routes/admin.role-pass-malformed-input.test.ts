/**
 * Role pass 2026-10-07: two admin inputs that answered 500 instead of a client error.
 *
 *   POST /admin/bookings/refunds/not-a-uuid/approve|reject -> 500 (Prisma P2023)
 *   GET  /admin/users?search=%00                          -> 500 (NUL byte in a text query)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminBookingsRoutes } from './admin-bookings.js';
import { adminRoutes } from './admin.js';

const ADMIN = { id: 'admin-1', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'bhakti_pass', blocked: false };

function p2023() {
  return new Prisma.PrismaClientKnownRequestError('Error creating UUID', { code: 'P2023', clientVersion: 'test' });
}

async function inject(method: 'GET' | 'POST', url: string, payload?: unknown) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminBookingsRoutes(i); }, { prefix: '/api/v1/admin/bookings' });
  await app.register(async (i) => { await adminRoutes(i); }, { prefix: '/api/v1/admin' });
  const res = await app.inject({
    method,
    url,
    headers: { authorization: 'Bearer demo-admin', 'content-type': 'application/json' },
    ...(payload ? { payload: JSON.stringify(payload) } : {}),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: { where: { email?: string } }) => (a.where.email === 'admin@demo.com' ? ADMIN : null));
  prismaMock.pujaBooking.findUnique.mockRejectedValue(p2023());
});

describe('refund approve/reject with a malformed booking id', () => {
  it('approve answers 404, not 500', async () => {
    const res = await inject('POST', '/api/v1/admin/bookings/refunds/not-a-uuid/approve', {});
    expect(res.statusCode).toBe(404);
  });

  it('reject answers 404, not 500', async () => {
    const res = await inject('POST', '/api/v1/admin/bookings/refunds/not-a-uuid/reject', { reason: 'not eligible' });
    expect(res.statusCode).toBe(404);
  });

  it('a genuine database failure is still a 500', async () => {
    prismaMock.pujaBooking.findUnique.mockRejectedValue(new Error('connection reset'));
    const res = await inject('POST', '/api/v1/admin/bookings/refunds/not-a-uuid/approve', {});
    expect(res.statusCode).toBe(500);
  });
});

describe('GET /admin/users?search with a NUL byte', () => {
  it('is a 400 and never reaches the database', async () => {
    const res = await inject('GET', '/api/v1/admin/users?search=%00');
    expect(res.statusCode).toBe(400);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });
});
