/**
 * An admin PATCHing their OWN user with blocked:true (or roles without ADMIN)
 * locked themselves out of the panel: found on the local stack when the demo
 * admin blocked itself and every /admin route answered "Account suspended".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

const SELF = '80744ebd-f175-4b08-aa7a-30ea57ead7b7';
const OTHER = '8b7ebbf2-923d-4186-b270-65118924af4c';

async function patch(id: string, payload: Record<string, unknown>) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminRoutes(i); }, { prefix: '/api/v1/admin' });
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/users/${id}`,
    headers: { authorization: 'Bearer demo-admin' },
    payload,
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation((async (args: { where?: { email?: string; id?: string } }) => {
    if (args?.where?.email === 'admin@demo.com') {
      return { id: SELF, email: 'admin@demo.com', phone: null, fullName: 'A', subscriptionTier: 'free', blocked: false };
    }
    return null;
  }) as never);
});

describe('admin cannot lock themselves out', () => {
  it('refuses blocking self', async () => {
    const r = await patch(SELF, { blocked: true });
    expect(r.statusCode).toBe(400);
  });
  it('refuses dropping own ADMIN role', async () => {
    const r = await patch(SELF, { roles: ['DEVOTEE'] });
    expect(r.statusCode).toBe(400);
  });
  it('does not touch the check for another user', async () => {
    const r = await patch(OTHER, { blocked: true });
    expect(r.statusCode).toBe(404); // reached the service (mock has no such user)
  });
});
