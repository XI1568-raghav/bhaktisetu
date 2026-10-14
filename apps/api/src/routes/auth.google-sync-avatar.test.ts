import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const { signInWithPassword, getUser } = vi.hoisted(() => ({ signInWithPassword: vi.fn(), getUser: vi.fn() }));
vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signInWithPassword, getUser } }),
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import { authRoutes } from './auth.js';

const upsert = vi.fn();
(prismaMock.user as unknown as Record<string, unknown>).upsert = upsert;

async function sync(meta: Record<string, unknown>) {
  getUser.mockResolvedValue({ data: { user: { id: '11111111-1111-1111-1111-111111111111', email: 'a@example.com', user_metadata: meta } }, error: null });
  upsert.mockResolvedValue({ id: 'u', email: 'a@example.com', fullName: 'A', avatarUrl: null, blocked: false, subscription: [], createdAt: new Date() });
  const app = Fastify();
  void app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.inject({ method: 'POST', url: '/api/v1/auth/google/sync', payload: { accessToken: 't', refreshToken: 'r' } });
  await app.close();
  return upsert.mock.calls[0]![0] as { update: Record<string, unknown>; create: Record<string, unknown> };
}

beforeEach(() => vi.clearAllMocks());

describe('/auth/google/sync avatar', () => {
  it('does not null out the stored avatar when the provider sends none', async () => {
    const arg = await sync({ full_name: 'A' });
    expect('avatarUrl' in arg.update).toBe(false);
  });
  it('refreshes it when the provider supplies one', async () => {
    const arg = await sync({ full_name: 'A', picture: 'https://lh3.example/p.jpg' });
    expect(arg.update.avatarUrl).toBe('https://lh3.example/p.jpg');
  });
});
