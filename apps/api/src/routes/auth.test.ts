import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { signInWithPassword, signUp } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signInWithPassword, signUp } }),
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import { authRoutes, getPrimaryRoleForUser, isAdminEmail } from './auth.js';

// Audit fixes covered here:
//   A-014 / A-015 — login role resolution must honour ADMIN_EMAILS (and that
//                   allow-list is the first-admin bootstrap).
//   A-010         — resolver backstop when more than one row is primary.
//   A-008         — /signup must not echo raw internal error text in prod.
//   A-009         — the refresh-token JTI ledger is seeded at ISSUANCE.

const ENV_KEYS = ['ADMIN_EMAILS', 'NODE_ENV', 'SUPABASE_URL'] as const;
const savedEnv: Record<string, string | undefined> = {};

function makeApp() {
  const app = Fastify();
  void app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  delete process.env.ADMIN_EMAILS;
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('isAdminEmail — A-014/A-015 allow-list parsing', () => {
  it('is false when ADMIN_EMAILS is unset', () => {
    expect(isAdminEmail('owner@darshya.online')).toBe(false);
  });

  it('matches case-insensitively and ignores surrounding whitespace', () => {
    process.env.ADMIN_EMAILS = ' Owner@Darshya.Online , ops@darshya.online ';
    expect(isAdminEmail('owner@darshya.online')).toBe(true);
    expect(isAdminEmail('OPS@DARSHYA.ONLINE')).toBe(true);
  });

  it('is false for an email not on the list', () => {
    process.env.ADMIN_EMAILS = 'owner@darshya.online';
    expect(isAdminEmail('attacker@evil.com')).toBe(false);
  });

  it('is false for a null/empty email even when the list has empty entries', () => {
    process.env.ADMIN_EMAILS = 'owner@darshya.online,,';
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });
});

describe('getPrimaryRoleForUser — A-014 admin resolution', () => {
  it('resolves an ADMIN_EMAILS-only owner as admin (the #211 lockout)', async () => {
    process.env.ADMIN_EMAILS = 'owner@darshya.online';
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: 'DEVOTEE', isPrimary: true, createdAt: new Date('2026-01-01') },
    ]);

    const role = await getPrimaryRoleForUser('user-1', 'owner@darshya.online');

    expect(role).toBe('admin');
  });

  it('does not need the role table at all for an allow-listed email', async () => {
    process.env.ADMIN_EMAILS = 'owner@darshya.online';

    const role = await getPrimaryRoleForUser('user-1', 'OWNER@darshya.online');

    expect(role).toBe('admin');
    expect(prismaMock.userRoleAssignment.findMany).not.toHaveBeenCalled();
  });

  it('still resolves an admin when the role table is down', async () => {
    process.env.ADMIN_EMAILS = 'owner@darshya.online';
    prismaMock.userRoleAssignment.findMany.mockRejectedValue(new Error('db down'));

    expect(await getPrimaryRoleForUser('user-1', 'owner@darshya.online')).toBe('admin');
    expect(await getPrimaryRoleForUser('user-2', 'someone@else.com')).toBe('devotee');
  });

  it('does not grant admin to a non-listed email', async () => {
    process.env.ADMIN_EMAILS = 'owner@darshya.online';
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: 'DEVOTEE', isPrimary: true, createdAt: new Date('2026-01-01') },
    ]);

    expect(await getPrimaryRoleForUser('user-9', 'attacker@evil.com')).toBe('devotee');
  });
});

describe('getPrimaryRoleForUser — role-table resolution', () => {
  it('falls back to devotee when the user has no assignments', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    expect(await getPrimaryRoleForUser('user-1', 'a@b.com')).toBe('devotee');
  });

  it('returns the lowercase primary role', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: 'STORE_OWNER', isPrimary: true, createdAt: new Date('2026-02-01') },
      { role: 'DEVOTEE', isPrimary: false, createdAt: new Date('2026-01-01') },
    ]);
    expect(await getPrimaryRoleForUser('user-1', 'a@b.com')).toBe('store_owner');
  });

  it('A-010 backstop: prefers the provider role when two rows are primary', async () => {
    // Query order is `isPrimary desc, createdAt asc`, so a half-applied demote
    // would put the older DEVOTEE row first and re-lock the provider out.
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: 'DEVOTEE', isPrimary: true, createdAt: new Date('2026-01-01') },
      { role: 'PANDIT', isPrimary: true, createdAt: new Date('2026-03-01') },
    ]);
    expect(await getPrimaryRoleForUser('user-1', 'a@b.com')).toBe('pandit');
  });

  it('still returns devotee for a devotee-only account', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: 'DEVOTEE', isPrimary: true, createdAt: new Date('2026-01-01') },
    ]);
    expect(await getPrimaryRoleForUser('user-1', 'a@b.com')).toBe('devotee');
  });
});

describe('POST /login — A-014 end to end + A-009 JTI seeding', () => {
  const SUPA_ID = '11111111-2222-3333-4444-555555555555';

  function mockGoodLogin(email: string) {
    prismaMock.user.findUnique.mockResolvedValue({
      id: SUPA_ID,
      email,
      fullName: 'Owner',
      avatarUrl: null,
      preferredLanguage: 'en',
      subscriptionTier: 'free',
      createdAt: new Date('2026-01-01'),
      subscription: [],
    });
    signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-abc',
          refresh_token: 'refresh-abc',
          expires_at: 1893456000,
          user: { id: SUPA_ID },
        },
      },
      error: null,
    });
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  }

  it('returns role "admin" for an ADMIN_EMAILS owner with only a devotee row', async () => {
    const email = 'a014-owner@darshya.online';
    process.env.ADMIN_EMAILS = email;
    mockGoodLogin(email);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: 'DEVOTEE', isPrimary: true, createdAt: new Date('2026-01-01') },
    ]);

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'hunter2pass' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('admin');
    await app.close();
  });

  it('A-009: seeds the issued refresh token into refresh_token_jtis', async () => {
    const email = 'a009-devotee@example.com';
    mockGoodLogin(email);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'hunter2pass' },
    });

    expect(res.statusCode).toBe(200);
    const seedCall = prismaMock.$executeRawUnsafe.mock.calls.find((c) =>
      String(c[0]).includes('INSERT INTO refresh_token_jtis'),
    );
    expect(seedCall).toBeDefined();
    // args: (sql, jti, userId, expiresAt) — jti is a sha256 hex of the token,
    // never the plaintext refresh token itself.
    expect(seedCall![1]).toMatch(/^[0-9a-f]{64}$/);
    expect(seedCall![1]).not.toBe('refresh-abc');
    expect(seedCall![2]).toBe(SUPA_ID);
    await app.close();
  });

  it('A-009: a ledger write failure must not break login', async () => {
    const email = 'a009-resilient@example.com';
    mockGoodLogin(email);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('relation does not exist'));

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'hunter2pass' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().session.accessToken).toBe('access-abc');
    await app.close();
  });
});

describe('POST /signup — A-008 internal error disclosure', () => {
  const LEAKY = 'Invalid `prisma.user.upsert()` invocation: relation "users" column "phone" ...';

  function mockSignupBlowup(email: string) {
    signUp.mockResolvedValue({
      data: { user: { id: '99999999-2222-3333-4444-555555555555' }, session: null },
      error: null,
    });
    prismaMock.$transaction.mockRejectedValueOnce(new Error(LEAKY));
    process.env.SUPABASE_URL = 'https://real-project.supabase.co';
    return email;
  }

  it('returns a generic message in production (no internal text)', async () => {
    process.env.NODE_ENV = 'production';
    const email = mockSignupBlowup('a008-prod@example.com');

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'hunter2pass', fullName: 'Test User' },
    });

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.message).toBe('Could not create account. Please try again.');
    expect(body.message).not.toContain('prisma');
    expect(JSON.stringify(body)).not.toContain('relation');
    await app.close();
  });

  it('keeps the detailed message outside production for local triage', async () => {
    process.env.NODE_ENV = 'test';
    const email = mockSignupBlowup('a008-dev@example.com');

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'hunter2pass', fullName: 'Test User' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe(LEAKY);
    await app.close();
  });
});

// A-015 — the ONLY first-admin bootstrap is the server-side ADMIN_EMAILS
// allow-list. The signup role enum has no 'admin' member, so a client cannot
// ask for it; and the signup response must agree with /login and /me or the
// web stores 'devotee' and strands the new admin on /dashboard.
describe('POST /signup — A-015 first-admin bootstrap', () => {
  const NEW_ID = '77777777-2222-3333-4444-555555555555';

  function mockSignupOk(email: string, withSession: boolean) {
    signUp.mockResolvedValue({
      data: {
        user: { id: NEW_ID },
        session: withSession
          ? { access_token: 'a', refresh_token: 'r', expires_at: 1893456000, user: { id: NEW_ID } }
          : null,
      },
      error: null,
    });
    prismaMock.$transaction.mockResolvedValueOnce({ id: NEW_ID, email, fullName: 'Owner' });
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  }

  it('returns role "admin" + status "active" for an ADMIN_EMAILS address', async () => {
    const email = 'a015-owner@darshya.online';
    process.env.ADMIN_EMAILS = `other@x.com, ${email.toUpperCase()}`;
    mockSignupOk(email, true);

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'hunter2pass', fullName: 'Owner' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().user.role).toBe('admin');
    expect(res.json().user.status).toBe('active');
    await app.close();
  });

  it('does not let a client self-grant admin — the role enum rejects it', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'nope@example.com', password: 'hunter2pass', fullName: 'Nope', role: 'admin' },
    });

    expect(res.statusCode).toBe(400);
    expect(signUp).not.toHaveBeenCalled();
    await app.close();
  });

  it('leaves a non-listed signup on its requested role', async () => {
    const email = 'a015-pandit@example.com';
    process.env.ADMIN_EMAILS = 'owner@darshya.online';
    mockSignupOk(email, true);

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'hunter2pass', fullName: 'Pandit A', role: 'pandit' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().user.role).toBe('pandit');
    // REQUIRE_PROVIDER_APPROVAL is unset: no approval step, so no pending state.
    expect(res.json().user.status).toBe('active');
    expect(res.json().message).not.toMatch(/pending approval/i);
    await app.close();
  });

  it('REQUIRE_PROVIDER_APPROVAL=true restores the pending_approval signup state', async () => {
    const email = 'a015-pandit-gated@example.com';
    process.env.ADMIN_EMAILS = 'owner@darshya.online';
    process.env.REQUIRE_PROVIDER_APPROVAL = 'true';
    try {
      mockSignupOk(email, true);
      const app = makeApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'hunter2pass', fullName: 'Pandit A', role: 'pandit' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().user.status).toBe('pending_approval');
      await app.close();
    } finally {
      delete process.env.REQUIRE_PROVIDER_APPROVAL;
    }
  });
});
