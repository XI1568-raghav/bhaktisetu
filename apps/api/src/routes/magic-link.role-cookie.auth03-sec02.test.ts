/**
 * AUTH-03 + SEC-02 step 1 — what POST /auth/magic-link/verify hands back.
 *
 * AUTH-03. The response carried `{ id, email, fullName, phone }` and NO role.
 * Every provider onboarded through the partnerships pipeline signs in through
 * this door and has no password at all (there is no password column on User),
 * so this is their ONLY door — and the web client, reading no role, persisted
 * them as a devotee and bounced them out of their own portal on every sign-in.
 * The server already knows the answer: getPrimaryRoleForUser is what /login,
 * /verify-otp and /me all use. This route just never asked it.
 *
 * SEC-02 step 1. The same handler returned the session as JSON only and never
 * issued the httpOnly `darshya_session` cookie, so a magic-link user was
 * structurally stuck on the JS-readable localStorage token that SEC-02 is
 * about — they could not be migrated off it, so the localStorage write could
 * not be deleted, so SEC-02 could not close.
 *
 * TWO THINGS THIS ROUTE MUST NOT COPY FROM /auth/login:
 *   1. its 1-hour SESSION_TTL_SECONDS. There is no Supabase session behind a
 *      magic link — createEmailSession mints an `email_sessions` row that lives
 *      SEVEN DAYS. A 1-hour cookie over a 7-day session logs the user out six
 *      days early with no way back (see 2).
 *   2. the refresh cookie. `refreshToken` is '' on this path; POST /auth/refresh
 *      is a Supabase exchange and there is nothing behind an email-session token
 *      for it to exchange. An empty `darshya_refresh` is a cookie that can only
 *      ever fail.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const PROVIDER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const findFirst = vi.fn();
const findMany = vi.fn();

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      create: vi.fn(),
    },
    userRoleAssignment: {
      create: vi.fn(async () => ({})),
      findMany: (...args: unknown[]) => findMany(...args),
    },
    $executeRawUnsafe: vi.fn(async () => 1),
  },
}));

vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => ({ ok: false, skipped: true })),
  magicLinkEmail: (link: string) => ({ subject: 'Sign in', html: link, text: link }),
}));

import Fastify from 'fastify';
import { magicLinkRoutes, __testing } from './magic-link.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  // Mirrors server.ts: @fastify/cookie is registered app-wide, so the cookie
  // helper's setCookie is genuinely available on this route in production.
  await app.register((await import('@fastify/cookie')).default);
  await app.register((await import('@fastify/rate-limit')).default, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(
    async (instance) => {
      await magicLinkRoutes(instance);
    },
    { prefix: '/api/v1/auth/magic-link' },
  );
  return app;
}

/** All Set-Cookie headers as a flat string list. */
function setCookies(headers: Record<string, unknown>): string[] {
  const raw = headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as string[]) : [String(raw)];
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  // The module captured JWT_SECRET at import time; unsetting lets both sign and
  // verify fall back to the same 'darshya-dev-secret'.
  delete process.env.JWT_SECRET;
  delete process.env.ADMIN_EMAILS;
  findFirst.mockResolvedValue({
    id: PROVIDER_ID,
    email: 'mandir.trust@example.com',
    fullName: 'Mandir Trust',
    phone: '+919812345678',
  });
  findMany.mockResolvedValue([
    { userId: PROVIDER_ID, role: 'TEMPLE_MANAGER', isPrimary: true, createdAt: new Date(0) },
  ]);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

async function verifyAsProvider() {
  const app = await buildApp();
  const { token } = __testing.signToken('mandir.trust@example.com');
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/magic-link/verify',
    payload: { token },
  });
  await app.close();
  return res;
}

describe('AUTH-03 — magic-link /verify names the role it just signed in', () => {
  it('returns the primary role, not silence the client reads as devotee', async () => {
    const res = await verifyAsProvider();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(
      body.user.role,
      'no role on the wire — the web client defaults to devotee and a temple ' +
        'manager is bounced out of /temple-portal on every sign-in',
    ).toBe('temple_manager');
  });

  it('falls back to devotee when the account holds no role assignment', async () => {
    findMany.mockResolvedValue([]);
    const res = await verifyAsProvider();
    expect(res.json().user.role).toBe('devotee');
  });

  it('honours the ADMIN_EMAILS allow-list over the role table', async () => {
    process.env.ADMIN_EMAILS = 'mandir.trust@example.com';
    const res = await verifyAsProvider();
    expect(res.json().user.role).toBe('admin');
  });
});

describe('SEC-02 step 1 — magic-link /verify issues the httpOnly session cookie', () => {
  it('sets darshya_session httpOnly so the user is not stuck on localStorage', async () => {
    const res = await verifyAsProvider();
    const cookies = setCookies(res.headers as Record<string, unknown>);
    const session = cookies.find((c) => c.startsWith('darshya_session='));
    expect(
      session,
      'no darshya_session — a magic-link user has no cookie credential at all, ' +
        'so the localStorage Bearer can never be retired for them',
    ).toBeTruthy();
    expect(session!.toLowerCase()).toContain('httponly');
    expect(session!).toContain('Path=/');
    expect(session).toContain(res.json().session.accessToken);
  });

  it('gives the cookie the SEVEN-DAY life of the email_sessions row, not /login\'s 1 hour', async () => {
    const res = await verifyAsProvider();
    const session = setCookies(res.headers as Record<string, unknown>).find((c) =>
      c.startsWith('darshya_session='),
    )!;
    const maxAge = Number(/Max-Age=(\d+)/i.exec(session)?.[1] ?? 0);
    // The row lives 7 days (EMAIL_SESSION_TTL_MS). A 3600 cookie here would
    // sign the user out six days early — and there is no refresh path behind
    // an email-session token to bring them back.
    expect(maxAge).toBeGreaterThan(6 * 24 * 60 * 60);
    expect(maxAge).toBeLessThanOrEqual(7 * 24 * 60 * 60);
  });

  it('does NOT set an empty darshya_refresh — there is no refresh token on this path', async () => {
    const res = await verifyAsProvider();
    const cookies = setCookies(res.headers as Record<string, unknown>);
    expect(
      cookies.find((c) => c.startsWith('darshya_refresh=')),
      'POST /auth/refresh is a Supabase exchange; an email-session token has ' +
        'nothing behind it, so this cookie can only ever fail',
    ).toBeUndefined();
  });

  it('still returns the JSON session — the Bearer contract is unchanged', async () => {
    const res = await verifyAsProvider();
    const body = res.json();
    expect(body.session.accessToken).toMatch(/^email-/);
    expect(body.ok).toBe(true);
  });
});
