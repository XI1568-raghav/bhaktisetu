import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'pandit-1', roles: ['PANDIT'] };
  },
  requireRole: () => async () => {},
}));
const inspect = vi.fn();
vi.mock('../lib/upload-inspect.js', async (orig) => ({
  ...(await orig<typeof import('../lib/upload-inspect.js')>()),
  inspectOwnPhoto: (u: string) => inspect(u),
}));
const updateProfile = vi.fn();
vi.mock('../services/priest.service.js', async (orig) => {
  const m = await orig<typeof import('../services/priest.service.js')>();
  (m.priestService as any).updateProfile = (...a: unknown[]) => updateProfile(...a);
  return m;
});

import Fastify from 'fastify';
import { priestRoutes } from './priest.js';

async function patch(payload: Record<string, unknown>) {
  const app = Fastify({ logger: false });
  await app.register(priestRoutes);
  const res = await app.inject({ method: 'PATCH', url: '/profile', payload });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.priest.findUnique.mockResolvedValue({ id: 'priest-1' } as never);
  updateProfile.mockResolvedValue({ id: 'priest-1' });
  inspect.mockResolvedValue({ ok: true });
});

describe('PATCH /priest/profile avatar is content-checked', () => {
  it('rejects an empty upload with a friendly 400 and saves nothing', async () => {
    inspect.mockResolvedValue({ ok: false, reason: 'empty' });
    const res = await patch({ avatarUrl: 'https://cdn.example.test/a.png' });
    expect(res.statusCode).toBe(400);
    expect(updateProfile).not.toHaveBeenCalled();
  });
  it('saves a valid avatar', async () => {
    const res = await patch({ avatarUrl: 'https://cdn.example.test/a.png' });
    expect(res.statusCode).toBe(200);
    expect(updateProfile).toHaveBeenCalled();
  });
});
