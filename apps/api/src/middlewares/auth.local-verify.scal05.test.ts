import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';

/**
 * SCAL-05, second half — STOP CALLING SUPABASE ON EVERY REQUEST.
 *
 * The in-process cache added in the first pass removes the round trip for
 * REPEAT requests on a token. The first request on every token still paid it,
 * and so did every request once the cache entry aged out — an outbound HTTPS
 * call to GoTrue in ap-northeast-1 before any of this API's own work.
 *
 * Supabase signs access tokens HS256 with the project JWT secret, so that first
 * request does not need the network either. These tests pin the two halves of
 * the contract:
 *   - with the secret set, a genuine token authenticates with ZERO calls to
 *     `supabaseAdmin.auth.getUser`;
 *   - with the secret absent, or the token not verifiable against it, the
 *     remote call still happens exactly as before. That fallback is what makes
 *     enabling the secret safe: a wrong value degrades, it does not lock out.
 */

const { supabaseAdmin, prismaMock } = vi.hoisted(() => ({
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  prismaMock: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    userRoleAssignment: { findMany: vi.fn() },
  } as Record<string, any>,
}));

vi.mock('../lib/supabase.js', () => ({ supabaseAdmin, isDemoMode: false }));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { authenticateUser } from './auth.js';
import { __authCacheClear } from '../lib/auth-cache.js';

const SECRET = 'project-jwt-secret-under-test';

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/** A genuine Supabase-shaped access token, signed HS256 like GoTrue signs. */
function signedToken(over: Record<string, unknown> = {}, secret = SECRET): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: 'sb-user-1',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'devotee@demo.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...over,
    }),
  );
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${b64url(sig)}`;
}

function makeRequest(token: string) {
  return {
    headers: { authorization: `Bearer ${token}` },
    cookies: {},
    url: '/api/v1/users/me',
    log: { warn: vi.fn(), error: vi.fn() },
    currentUser: undefined as unknown,
  } as any;
}

function makeReply() {
  const reply: any = {
    statusCode: 0,
    payload: undefined,
    code(c: number) {
      reply.statusCode = c;
      return reply;
    },
    send(p: unknown) {
      reply.payload = p;
      return reply;
    },
  };
  return reply;
}

const DB_USER = {
  id: 'user-1',
  phone: null,
  email: 'devotee@demo.com',
  fullName: 'Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const ORIG_SECRET = process.env.SUPABASE_JWT_SECRET;
const ORIG_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  vi.clearAllMocks();
  __authCacheClear();
  process.env.NODE_ENV = 'production'; // keep the demo-token branch out of the way
  prismaMock.user.findUnique.mockResolvedValue(DB_USER);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ role: 'DEVOTEE' }]);
  supabaseAdmin.auth.getUser.mockResolvedValue({
    data: { user: { id: 'sb-user-1', email: 'devotee@demo.com', phone: null } },
    error: null,
  });
});

afterEach(() => {
  if (ORIG_SECRET === undefined) delete process.env.SUPABASE_JWT_SECRET;
  else process.env.SUPABASE_JWT_SECRET = ORIG_SECRET;
  process.env.NODE_ENV = ORIG_NODE_ENV;
});

describe('SCAL-05 — the first request on a token no longer calls Supabase', () => {
  it('authenticates a genuine token with zero outbound Supabase calls', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const req = makeRequest(signedToken());
    const reply = makeReply();

    await authenticateUser(req, reply);

    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(0);
    expect(req.currentUser).toMatchObject({ id: 'user-1', supabaseId: 'sb-user-1' });
  });

  it('still applies the blocked gate to a locally verified token', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    prismaMock.user.findUnique.mockResolvedValue({
      ...DB_USER,
      blocked: true,
      blockedReason: 'chargeback fraud',
    });
    const req = makeRequest(signedToken());
    const reply = makeReply();

    await authenticateUser(req, reply);

    // Skipping the network must not skip authorisation.
    expect(reply.statusCode).toBe(403);
    expect(req.currentUser).toBeUndefined();
  });

  it('falls back to the remote check when no secret is configured', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const req = makeRequest(signedToken());
    const reply = makeReply();

    await authenticateUser(req, reply);

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(1);
    expect(req.currentUser).toMatchObject({ id: 'user-1' });
  });

  it('falls back to the remote check when the token does not verify locally', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const req = makeRequest(signedToken({}, 'a-different-secret'));
    const reply = makeReply();

    await authenticateUser(req, reply);

    // A rotated or mistyped secret must degrade to the old behaviour, never
    // 401 a user whose token is genuinely fine.
    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(1);
    expect(reply.statusCode).toBe(0);
    expect(req.currentUser).toMatchObject({ id: 'user-1' });
  });

  it('does not accept an expired token locally, and lets the remote decide', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } });
    const req = makeRequest(signedToken({ exp: Math.floor(Date.now() / 1000) - 5 }));
    const reply = makeReply();

    await authenticateUser(req, reply);

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(1);
    expect(reply.statusCode).toBe(401);
  });
});
