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
import { authRoutes } from './auth.js';

/**
 * AW-08 (prod sweep 2026-08-12, P1) — the login half the first pass left open.
 *
 * middlewares/auth.ts was fixed to FAIL CLOSED: a demo token whose mapped User
 * row is absent now gets 401 instead of a synthetic non-UUID identity. But
 * POST /auth/login was not touched, so the two halves of the same contract
 * disagreed:
 *
 *   POST /auth/login {astro@demo.com}  -> 200, user.id "demo-astro", a session
 *   GET  /astrologer-portal/dashboard  -> 401 "not seeded in this database"
 *
 * The devotee-facing consequence is worse than the 500 it replaced: the portal
 * accepts the credentials, stores a session, routes the user into the
 * astrologer dashboard, and then every single call inside it 401s. The user is
 * told they are signed in and nothing works.
 *
 * Login must answer with the SAME identity the middleware will resolve:
 *   • row present  -> 200 carrying that row's real UUID (never "demo-<handle>")
 *   • row absent   -> 401 with the same sentence the middleware uses
 */

const DEMO_PASSWORD = 'demo123';
const REAL_UUID = '9e15c3a2-0dc7-4677-ac45-f7dfaec619a6';

function makeApp() {
  const app = Fastify({ logger: false });
  void app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

function login(app: ReturnType<typeof makeApp>, email: string) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: DEMO_PASSWORD },
  });
}

const savedNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  // Supabase must never be the thing that answers here — these assertions are
  // about the demo branch, so a fall-through would show up as a failure.
  signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error('no supabase') });
});

afterEach(() => {
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
});

describe('AW-08 — demo login agrees with the demo middleware', () => {
  it('refuses a demo account that is not seeded, instead of minting a session that 401s everywhere', async () => {
    // astro@demo.com is NOT in the database (prisma/seed.ts seeds
    // astrologer@demo.com) — this is the exact state the sweep found.
    prismaMock.user.findUnique.mockResolvedValue(null);

    const app = makeApp();
    const res = await login(app, 'astro@demo.com');
    await app.close();

    expect(res.statusCode).toBe(401);
    // The sentence must name the account so the fix is obvious to whoever hits it.
    expect(String(res.json().message)).toContain('astro@demo.com');
    // And it must not hand out a session for an identity that cannot act.
    expect(res.json().session).toBeUndefined();
  });

  it('never returns a non-UUID user id for a demo account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const app = makeApp();
    const res = await login(app, 'astro@demo.com');
    await app.close();

    expect(res.body).not.toContain('demo-astro');
  });

  it('returns the REAL row id for a demo account that IS seeded', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: REAL_UUID,
      email: 'wellness@demo.com',
      phone: null,
      fullName: 'Demo Wellness',
      subscriptionTier: 'free',
      blocked: false,
      avatarUrl: null,
      preferredLanguage: 'en',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const app = makeApp();
    const res = await login(app, 'wellness@demo.com');
    await app.close();

    expect(res.statusCode).toBe(200);
    // The id the client stores must be the id every later request resolves to.
    expect(res.json().user.id).toBe(REAL_UUID);
    expect(res.json().session?.accessToken).toBeTruthy();
  });

  it('reports a DATABASE OUTAGE as an outage, not as a missing seed', async () => {
    // Observed for real on 2026-08-14: Postgres accepted TCP on 55432 but reset
    // the wire protocol, and a `.catch(() => null)` here turned every demo
    // login into "Demo account … is not seeded in this database" — sending the
    // reader to re-run a seed that was never the problem. A lookup that threw
    // is not a lookup that missed.
    prismaMock.user.findUnique.mockRejectedValue(
      Object.assign(new Error("Can't reach database server at `127.0.0.1:55432`"), {
        name: 'PrismaClientInitializationError',
      }),
    );

    const app = makeApp();
    const res = await login(app, 'wellness@demo.com');
    await app.close();

    expect(res.statusCode).toBe(503);
    expect(String(res.json().message)).not.toContain('seed');
    // And the driver's own text must not reach the caller (AW-08).
    expect(res.body).not.toContain('127.0.0.1:55432');
    expect(res.body).not.toContain('Prisma');
  });

  it('still rejects a wrong password before any of this', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'astro@demo.com', password: 'not-the-demo-password' },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(String(res.json().message)).not.toContain('not seeded');
  });
});
