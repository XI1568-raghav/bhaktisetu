import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any, reply: any) => {
    if (request.headers.authorization !== 'Bearer ok') {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.currentUser = { id: 'u1', roles: ['DEVOTEE'] };
  },
}));

import Fastify from 'fastify';
import { contentRoutes } from './content.js';

const ID = '00000000-0000-4000-8000-000000000001';

async function app() {
  const s = Fastify();
  await s.register(contentRoutes, { prefix: '/c' });
  await s.ready();
  return s;
}

describe('POST /content/:id/like', () => {
  beforeEach(() => vi.clearAllMocks());

  it('needs a signed-in user (it used to be anonymous)', async () => {
    const s = await app();
    const r = await s.inject({ method: 'POST', url: `/c/${ID}/like` });
    expect(r.statusCode).toBe(401);
    expect((prismaMock as any).contentItem.update).not.toHaveBeenCalled();
  });

  it('answers 404, not 500, for a malformed id', async () => {
    const s = await app();
    const r = await s.inject({ method: 'POST', url: '/c/not-a-uuid/like', headers: { authorization: 'Bearer ok' } });
    expect(r.statusCode).toBe(404);
  });

  it('answers 404 when the row is gone (P2025)', async () => {
    (prismaMock as any).contentItem.update.mockRejectedValue(Object.assign(new Error('x'), { code: 'P2025' }));
    const s = await app();
    const r = await s.inject({ method: 'POST', url: `/c/${ID}/like`, headers: { authorization: 'Bearer ok' } });
    expect(r.statusCode).toBe(404);
  });
});
