import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessPortalRoutes } from './wellness-portal.js';
import { astrologerPortalRoutes } from './astrologer-portal.js';

// QA 2026-10-13 (mirrors gaushala S-08): creating a profile must not invent a display
// name ('Instructor' / 'Astrologer') that then shows on the public directory.

const WELLNESS = { id: '77777777-7777-4777-8777-777777777777', email: 'wellness@demo.com', phone: null, fullName: 'W', subscriptionTier: 'free', blocked: false };
const ASTRO = { id: '88888888-8888-4888-8888-888888888888', email: 'astro@demo.com', phone: null, fullName: 'A', subscriptionTier: 'free', blocked: false };

async function patch(plugin: any, prefix: string, url: string, token: string, payload: unknown, method: 'PATCH' | 'POST' = 'PATCH') {
  const app = Fastify({ logger: false });
  await app.register(plugin, { prefix });
  const res = await app.inject({ method, url: `${prefix}${url}`, headers: { authorization: `Bearer ${token}` }, payload: payload as never });
  await app.close();
  return res;
}

// The shared mock only stubs the read side of these two models; add the writes this suite drives.
for (const m of ['wellnessProfile', 'astrologerProfile'] as const) {
  const model = prismaMock[m] as unknown as Record<string, unknown>;
  for (const fn of ['create', 'update', 'findUnique']) if (!model[fn]) model[fn] = vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  prismaMock.user.findUnique.mockImplementation(async (a: any) =>
    a.where.email === 'wellness@demo.com' ? WELLNESS : a.where.email === 'astro@demo.com' ? ASTRO : null,
  );
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.wellnessProfile.findUnique.mockResolvedValue(null);
  prismaMock.astrologerProfile.findUnique.mockResolvedValue(null);
  (prismaMock.wellnessProfile as any).create.mockImplementation(async (a: any) => ({ id: 'wp', ...a.data }));
  (prismaMock.astrologerProfile as any).create.mockImplementation(async (a: any) => ({ id: 'ap', ...a.data }));
});

describe('wellness portal profile create', () => {
  const go = (payload: unknown) => patch(wellnessPortalRoutes, '/api/v1/wellness-portal', '/profile', 'demo-wellness', payload);

  it('refuses to create a profile with no name instead of inventing "Instructor"', async () => {
    const res = await go({ bio: 'Teaches yoga' });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('display_name_required');
    expect((prismaMock.wellnessProfile as any).create).not.toHaveBeenCalled();
  });

  it('refuses a whitespace-only name', async () => {
    const res = await go({ displayName: '   ' });
    expect(res.statusCode).toBe(400);
    expect((prismaMock.wellnessProfile as any).create).not.toHaveBeenCalled();
  });

  it('creates the profile with the real (trimmed) name', async () => {
    const res = await go({ displayName: '  Swami Test  ', bio: 'x' });
    expect(res.statusCode).toBe(200);
    expect((prismaMock.wellnessProfile as any).create.mock.calls[0]![0].data.displayName).toBe('Swami Test');
  });

  it('editing an existing profile without a name is untouched', async () => {
    prismaMock.wellnessProfile.findUnique.mockResolvedValue({ id: 'wp', userId: WELLNESS.id, displayName: 'Real Name' } as any);
    prismaMock.wellnessProfile.update.mockResolvedValue({ id: 'wp', displayName: 'Real Name', bio: 'new' } as any);
    const res = await go({ bio: 'new' });
    expect(res.statusCode).toBe(200);
    expect((prismaMock.wellnessProfile as any).create).not.toHaveBeenCalled();
  });
});

describe('astrologer portal profile create', () => {
  const go = (payload: unknown) => patch(astrologerPortalRoutes, '/api/v1/astrologer-portal', '/profile', 'demo-astro', payload);
  beforeEach(() => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  });

  it('refuses to create a profile with no name instead of inventing "Astrologer"', async () => {
    const res = await go({ bio: 'Vedic' });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('display_name_required');
    expect((prismaMock.astrologerProfile as any).create).not.toHaveBeenCalled();
  });

  it('creates it with the real name', async () => {
    const res = await go({ displayName: 'Acharya Test' });
    expect(res.statusCode).toBe(200);
    expect((prismaMock.astrologerProfile as any).create.mock.calls[0]![0].data.displayName).toBe('Acharya Test');
  });

  it('PATCH /availability no longer auto-creates a placeholder profile', async () => {
    const res = await patch(astrologerPortalRoutes, '/api/v1/astrologer-portal', '/availability', 'demo-astro', { availability: { mon: ['09:00-12:00'] } });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('display_name_required');
    expect((prismaMock.astrologerProfile as any).create).not.toHaveBeenCalled();
  });
});
