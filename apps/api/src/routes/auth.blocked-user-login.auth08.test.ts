import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { signInWithPassword, getUser } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signInWithPassword, getUser } }),
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import { authRoutes } from './auth.js';

/**
 * The shared prisma mock has no `user.upsert` — /google/sync is the only route
 * that calls it and nothing had tested that path. ADDED here rather than
 * reassigned: nothing else has ever captured this property, and vitest isolates
 * the module registry per test file, so this cannot reach another suite. It
 * belongs in apps/api/src/lib/__mocks__/prisma.ts, which is outside this lane.
 */
const userUpsert = vi.fn();
(prismaMock.user as unknown as Record<string, unknown>).upsert = userUpsert;

/**
 * AUTH-08 — a suspended account could still sign in.
 *
 * `middlewares/auth.ts` gates every AUTHENTICATED request on `User.blocked` and
 * answers 403 "Account suspended". Neither `POST /login` (real DB path) nor
 * `POST /auth/google/sync` checked it. The demo branch of /login did — so the
 * gate existed three lines away from the hole.
 *
 * The result is not a cosmetic one. A blocked user signs in successfully, the
 * web app stores a session and routes them into a portal, and then EVERY call
 * inside that portal 403s. `friendlyApiError` maps 403 to "Your session has
 * expired. Please sign in again", which sends them back to a login that works
 * — and round they go, with nothing anywhere telling them the account was
 * suspended. Blocking is an authorization decision; it has to be made at the
 * door.
 */

const SUSPENDED_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'suspended@example.com',
  fullName: 'Suspended Person',
  phone: '+919000000000',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  createdAt: new Date('2026-01-01'),
  blocked: true,
  blockedReason: 'Chargeback fraud',
  subscription: [],
};

const ACTIVE_USER = { ...SUSPENDED_USER, blocked: false, blockedReason: null };

function makeApp() {
  const app = Fastify();
  void app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ['ADMIN_EMAILS', 'NODE_ENV'] as const;

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  delete process.env.ADMIN_EMAILS;
  process.env.NODE_ENV = 'test';
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([
    { role: 'DEVOTEE', isPrimary: true, createdAt: new Date('2026-01-01') },
  ]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('AUTH-08 — POST /login refuses a suspended account', () => {
  it('answers 403, not a working session', async () => {
    prismaMock.user.findUnique.mockResolvedValue(SUSPENDED_USER);
    signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'jwt-access',
          refresh_token: 'jwt-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: SUSPENDED_USER.id },
        },
      },
      error: null,
    });

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'suspended@example.com', password: 'correct-password' },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.message).toMatch(/suspend/i);
    // No session may be handed out — one that exists is one that gets stored
    // and routed on.
    expect(body.session).toBeUndefined();
    await app.close();
  });

  it('names the reason when the admin recorded one', async () => {
    prismaMock.user.findUnique.mockResolvedValue(SUSPENDED_USER);
    signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'jwt-access',
          refresh_token: 'jwt-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: SUSPENDED_USER.id },
        },
      },
      error: null,
    });

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'suspended@example.com', password: 'correct-password' },
    });

    expect(res.json().message).toContain('Chargeback fraud');
    await app.close();
  });

  it('still signs an ACTIVE account in', async () => {
    prismaMock.user.findUnique.mockResolvedValue(ACTIVE_USER);
    signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'jwt-access',
          refresh_token: 'jwt-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: ACTIVE_USER.id },
        },
      },
      error: null,
    });

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'suspended@example.com', password: 'correct-password' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().session.accessToken).toBe('jwt-access');
    await app.close();
  });
});

describe('AUTH-08 — POST /google/sync refuses a suspended account', () => {
  it('answers 403 rather than minting a session for a blocked user', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: SUSPENDED_USER.id,
          email: 'suspended@example.com',
          user_metadata: { full_name: 'Suspended Person' },
        },
      },
      error: null,
    });
    userUpsert.mockResolvedValue(SUSPENDED_USER);

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google/sync',
      payload: { accessToken: 'google-access', refreshToken: 'google-refresh' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/suspend/i);
    expect(res.json().session).toBeUndefined();
    await app.close();
  });

  it('still syncs an ACTIVE Google account', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: ACTIVE_USER.id,
          email: 'suspended@example.com',
          user_metadata: { full_name: 'Suspended Person' },
        },
      },
      error: null,
    });
    userUpsert.mockResolvedValue(ACTIVE_USER);

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google/sync',
      payload: { accessToken: 'google-access', refreshToken: 'google-refresh' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.id).toBe(ACTIVE_USER.id);
    await app.close();
  });
});
