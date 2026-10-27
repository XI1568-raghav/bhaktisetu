import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: {} }),
  supabaseAdmin: { auth: { getUser: vi.fn(), admin: { signOut: vi.fn() } } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from './auth.js';

/**
 * GET /auth/me read the profile and then, separately, the role rows. They are
 * keyed on the same id, so they now go out together. The role resolution must
 * match getPrimaryRoleForUser case for case.
 */

const ID = '33333333-3333-3333-3333-333333333333';
const ROW = {
  id: ID,
  email: 'me@example.com',
  phone: null,
  fullName: 'Me',
  avatarUrl: null,
  preferredLanguage: 'en',
  subscriptionTier: 'free',
  blocked: false,
  blockedReason: null,
  locationCity: null,
  locationState: null,
  isNri: false,
  nriCountry: null,
  gotra: null,
  nakshatra: null,
  rashi: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  addresses: [],
  subscription: [],
};

const state = { inFlight: 0, max: 0 };
const slow = async <T,>(v: T): Promise<T> => {
  state.inFlight++;
  state.max = Math.max(state.max, state.inFlight);
  await new Promise((r) => setTimeout(r, 5));
  state.inFlight--;
  return v;
};

function wire(row: typeof ROW | null, roles: Array<{ role: string; isPrimary: boolean }> | Error) {
  prismaMock.user.findUnique.mockImplementation((async (args: { where: { id?: string; email?: string } }) => {
    if (args.where.email === 'devotee@demo.com') return { ...ROW, email: 'devotee@demo.com' };
    return slow(row);
  }) as never);
  prismaMock.userRoleAssignment.findMany.mockImplementation((async () => {
    if (roles instanceof Error) throw roles;
    return slow(roles);
  }) as never);
}

async function me() {
  const app = Fastify({ logger: false });
  await app.register(cookie);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { authorization: 'Bearer demo-devotee' } });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.inFlight = 0;
  state.max = 0;
  process.env.NODE_ENV = 'test';
  delete process.env.ADMIN_EMAILS;
});
afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe('GET /auth/me — profile and role read together, same answer', () => {
  it('issues both reads concurrently', async () => {
    wire({ ...ROW, id: ID }, [{ role: 'DEVOTEE', isPrimary: true }]);
    await me();
    expect(state.max).toBeGreaterThanOrEqual(2);
  });

  it('no role rows -> devotee; response shape is unchanged', async () => {
    wire({ ...ROW, id: ID }, []);
    const res = await me();
    expect(res.statusCode).toBe(200);
    const u = res.json().user;
    expect(u.role).toBe('devotee');
    expect(u.activeSubscription).toBeNull();
    expect(Object.keys(u).sort()).toEqual(
      ['activeSubscription', 'addresses', 'avatarUrl', 'createdAt', 'email', 'fullName', 'gotra', 'id', 'isNri', 'locationCity', 'locationState', 'nakshatra', 'nriCountry', 'phone', 'preferredLanguage', 'rashi', 'role', 'subscriptionTier', 'updatedAt'],
    );
  });

  it('picks the non-DEVOTEE row among equally primary rows (A-010)', async () => {
    wire({ ...ROW, id: ID }, [
      { role: 'DEVOTEE', isPrimary: true },
      { role: 'PANDIT', isPrimary: true },
    ]);
    expect((await me()).json().user.role).toBe('pandit');
  });

  it('prefers primary rows over a non-primary provider row', async () => {
    wire({ ...ROW, id: ID }, [
      { role: 'DEVOTEE', isPrimary: true },
      { role: 'STORE_OWNER', isPrimary: false },
    ]);
    expect((await me()).json().user.role).toBe('devotee');
  });

  it('the ADMIN_EMAILS allow-list outranks the role rows', async () => {
    process.env.ADMIN_EMAILS = 'me@example.com';
    wire({ ...ROW, id: ID }, [{ role: 'PANDIT', isPrimary: true }]);
    expect((await me()).json().user.role).toBe('admin');
  });

  it('a failed role read answers devotee, or admin for an allow-listed email', async () => {
    wire({ ...ROW, id: ID }, new Error('roles table down'));
    expect((await me()).json().user.role).toBe('devotee');
    process.env.ADMIN_EMAILS = 'me@example.com';
    expect((await me()).json().user.role).toBe('admin');
  });

  it('404s when the profile row is missing', async () => {
    wire(null, [{ role: 'DEVOTEE', isPrimary: true }]);
    const res = await me();
    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe('User profile not found.');
  });
});
