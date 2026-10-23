import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sb = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  refreshSession: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: sb }),
  supabaseAdmin: { auth: { getUser: vi.fn(), admin: { signOut: vi.fn() } } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from './auth.js';

/**
 * Local-stack QA, slice D (sign-up / login / refresh / OTP doors). Each case is a
 * defect measured against a faithful GoTrue stand-in, then pinned here.
 */

const USER = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'qa@example.com',
  fullName: 'QA',
  phone: '+919876543210',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  createdAt: new Date('2026-01-01'),
  blocked: false,
  blockedReason: null,
  subscription: [],
};

const SESSION = {
  access_token: 'acc',
  refresh_token: 'ref-new',
  expires_in: 3600,
  expires_at: 1893456000,
  token_type: 'bearer',
  user: { id: USER.id },
};

// The shared prisma mock has no `user.upsert` (see auth.blocked-user-login.auth08.test.ts).
const userUpsert = vi.fn();
(prismaMock.user as unknown as Record<string, unknown>).upsert = userUpsert;

async function makeApp() {
  const app = Fastify();
  await app.register(cookie);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

const setCookies = (res: { headers: Record<string, unknown> }): string[] => {
  const h = res.headers['set-cookie'];
  return Array.isArray(h) ? (h as string[]) : h ? [String(h)] : [];
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe('POST /refresh — a used token inside the reuse window is a race, not a theft', () => {
  const ledger = (usedAgeMs: number | null) => [
    { user_id: USER.id, used_at: usedAgeMs === null ? null : new Date(), expires_at: new Date(Date.now() + 1e9), used_age_ms: usedAgeMs },
  ];

  it('lets a second tab presenting the just-rotated token through to GoTrue', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce(ledger(1500));
    sb.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: 'ref-old' } });
    expect(res.statusCode).toBe(200);
    expect(sb.refreshSession).toHaveBeenCalled();
    // and it must NOT have revoked the family
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c: unknown[]) => /used_at = now\(\) - interval/.test(String(c[0])))).toBe(false);
    await app.close();
  });

  it('still revokes the whole family when the reuse is outside the window', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce(ledger(120_000));
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: 'ref-old' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Token Reuse Detected');
    expect(sb.refreshSession).not.toHaveBeenCalled();
    // backdated, so the revoke stamp is not itself mistaken for a race
    expect(
      prismaMock.$executeRawUnsafe.mock.calls.some((c: unknown[]) => /used_at = now\(\) - interval '1 hour'/.test(String(c[0]))),
    ).toBe(true);
    await app.close();
  });
});

describe('POST /refresh — suspended accounts', () => {
  it('refuses to mint a new session for a blocked user and clears the cookies', async () => {
    sb.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    prismaMock.user.findUnique.mockResolvedValue({ blocked: true, blockedReason: 'fraud' } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: 'ref-old' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().session).toBeUndefined();
    expect(setCookies(res).every((c) => /Max-Age=0|Expires=/i.test(c))).toBe(true);
    await app.close();
  });
});

describe('POST /login — unconfirmed email', () => {
  it('names the real problem instead of "Invalid email or password"', async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER as never);
    sb.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', status: 400, code: 'email_not_confirmed', message: 'Email not confirmed' },
    });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: USER.email, password: 'Passw0rd1' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('EmailNotConfirmed');
    await app.close();
  });

  it('keeps a wrong password indistinguishable from an unknown account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER as never);
    sb.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: USER.email, password: 'nope' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe('POST /signup', () => {
  const body = { email: 'new@example.com', password: 'Passw0rd1', fullName: 'New Person' };

  it('answers 409 when GoTrue reports the user already exists (was a 400 SignupFailed)', async () => {
    sb.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', status: 422, code: 'user_already_exists', message: 'User already registered' },
    });
    // a wrong password: no ownership proof, so no repair (see auth.signup-repair.qa-m.test.ts)
    sb.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload: body });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it.each([
    ['a 100k-character name', { ...body, fullName: 'x'.repeat(100_000) }],
    ['a 300-character email', { ...body, email: `${'a'.repeat(300)}@example.com` }],
    ['a password over bcrypt’s 72 bytes', { ...body, password: `a1${'x'.repeat(200)}` }],
    ['a 500-character phone', { ...body, phone: '9'.repeat(500) }],
  ])('rejects %s before it reaches Supabase or the database', async (_n, payload) => {
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(400);
    expect(sb.signUp).not.toHaveBeenCalled();
    await app.close();
  });

  it('issues the httpOnly session cookies when Supabase returns a session', async () => {
    sb.signUp.mockResolvedValue({ data: { user: { id: USER.id }, session: SESSION }, error: null });
    prismaMock.$transaction.mockResolvedValue({ id: USER.id, email: body.email, fullName: body.fullName } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload: body });
    expect(res.statusCode).toBe(201);
    const cookies = setCookies(res);
    expect(cookies.some((c) => c.startsWith('darshya_session=') && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('darshya_refresh=') && /HttpOnly/i.test(c))).toBe(true);
    await app.close();
  });

  it('sets no cookies when email confirmation means there is no session yet', async () => {
    sb.signUp.mockResolvedValue({ data: { user: { id: USER.id }, session: null }, error: null });
    prismaMock.$transaction.mockResolvedValue({ id: USER.id, email: body.email, fullName: body.fullName } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload: body });
    expect(res.statusCode).toBe(201);
    expect(res.json().session).toBeNull();
    expect(setCookies(res)).toHaveLength(0);
    await app.close();
  });
});

describe('phone OTP', () => {
  const phone = '+919811112222';

  it('verify-otp issues the session cookies (the web keeps no JS-readable token)', async () => {
    sb.verifyOtp.mockResolvedValue({ data: { session: SESSION, user: { id: USER.id } }, error: null });
    userUpsert.mockResolvedValue({ ...USER, phone } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone, token: '123456' } });
    expect(res.statusCode).toBe(200);
    expect(setCookies(res).some((c) => c.startsWith('darshya_session='))).toBe(true);
    await app.close();
  });

  it('verify-otp refuses a suspended account (the OTP door had no AUTH-08 gate)', async () => {
    sb.verifyOtp.mockResolvedValue({ data: { session: SESSION, user: { id: USER.id } }, error: null });
    userUpsert.mockResolvedValue({ ...USER, phone, blocked: true, blockedReason: 'fraud' } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone, token: '123456' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().session).toBeUndefined();
    await app.close();
  });

  it('locks a number after five wrong codes, even if the sixth is right', async () => {
    const locked = '+919833334444';
    sb.verifyOtp.mockResolvedValue({ data: { session: null }, error: { status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' } });
    const app = await makeApp();
    for (let i = 0; i < 5; i++) {
      const r = await app.inject({ method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone: locked, token: `10000${i}` } });
      expect(r.statusCode).toBe(400);
    }
    sb.verifyOtp.mockClear();
    const sixth = await app.inject({ method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone: locked, token: '999999' } });
    expect(sixth.statusCode).toBe(429);
    expect(sb.verifyOtp).not.toHaveBeenCalled();
    await app.close();
  });

  it('maps GoTrue’s own send-rate limit to 429 instead of a 400 "OTP Error"', async () => {
    sb.signInWithOtp.mockResolvedValue({
      error: { name: 'AuthApiError', status: 429, code: 'over_sms_send_rate_limit', message: 'For security purposes, you can only request this after 60 seconds.' },
    });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/send-otp', payload: { phone: '+919844445555' } });
    expect(res.statusCode).toBe(429);
    await app.close();
  });
});

describe('POST /refresh — no credential at all is a clean 401, never a 400', () => {
  it.each([
    ['no body', undefined],
    ['empty object', {}],
    ['blank token', { refreshToken: '' }],
    ['null token', { refreshToken: null }],
  ])('%s -> 401 Unauthorized and Supabase is not called', async (_label, payload) => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
    expect(sb.refreshSession).not.toHaveBeenCalled();
    await app.close();
  });
});
