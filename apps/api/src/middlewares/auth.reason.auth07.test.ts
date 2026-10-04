/**
 * AUTH-07 (F454, 2026-09-08) — every 401 this middleware sends now says WHY.
 *
 * THE FINDING. apps/web/lib/api-config.ts answered EVERY 401 with "Your session
 * has expired — sign in again to see your live figures.", because
 * `loadErrorIsReauth` was `loadErrorStatus(cause) === 401` — the number and
 * nothing else. This file answers 401 in thirteen places, and at least three of
 * them make that sentence false:
 *
 *   :110 — no token was ever sent. Verified against production 2026-09-08:
 *          GET https://api.darshya.online/api/v1/users/me/bookings with no
 *          Authorization header →
 *          {"error":"Unauthorized","message":"Missing or invalid Authorization
 *          header. Expected: Bearer <token>"} — no code, no discriminator.
 *   :341 — the credential verified; there is no `User` row behind it.
 *   :228 — the `email_sessions` lookup THREW. A database outage, answered with
 *          an authentication verdict.
 *
 * The API could not fix it alone: any discriminator in the BODY was dead on
 * arrival, because the ten web call sites hand a bare `Response` to a
 * synchronous classifier and never read the body of a failed load. Hence the
 * header. These tests pin BOTH carriers — `X-Auth-Reason` and the mirrored
 * `authReason` body field — because the web reads the header, apps/mobile reads
 * the body, and a fix that only lands in one of them is half a contract.
 *
 * THE ASSERTION THAT MATTERS MOST is at the bottom: 403 must not acquire a
 * reason. An earlier pass of AUTH-06 let 403 read as "sign in again" and handed
 * a suspended provider a single control that looped her through a successful
 * sign-in back to the same refusal. The reason field is exactly the mechanism
 * that could undo that, so `rejectIfBlocked` is checked to be untouched.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

const { supabaseAdmin, prismaMock } = vi.hoisted(() => ({
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  prismaMock: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    userRoleAssignment: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  } as Record<string, any>,
}));

vi.mock('../lib/supabase.js', () => ({ supabaseAdmin, isDemoMode: false }));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { authenticateUser } from './auth.js';
import { __authCacheClear } from '../lib/auth-cache.js';
import {
  AUTH_REASON_HEADER,
  AUTH_REASON_BODY_FIELD,
  AUTH_FAILURE_REASONS,
  isAuthFailureReason,
} from '../lib/auth-reason.js';

const SECRET = 'project-jwt-secret-under-test';

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

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

function makeRequest(token?: string) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cookies: {},
    url: '/api/v1/users/me/bookings',
    log: { warn: vi.fn(), error: vi.fn() },
    currentUser: undefined as unknown,
  } as any;
}

/** Records what the middleware actually put on the wire — headers included. */
function makeReply() {
  const reply: any = {
    statusCode: 0,
    payload: undefined as any,
    headers: {} as Record<string, string>,
    header(name: string, value: string) {
      reply.headers[name.toLowerCase()] = value;
      return reply;
    },
    getHeader(name: string) {
      return reply.headers[name.toLowerCase()];
    },
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

/** The one shape assertion, applied to every case. */
function expectDenial(reply: any, status: number, reason: string) {
  expect(reply.statusCode).toBe(status);
  expect(reply.getHeader(AUTH_REASON_HEADER)).toBe(reason);
  expect(reply.payload[AUTH_REASON_BODY_FIELD]).toBe(reason);
  // The header and the body come from one argument and must never disagree.
  expect(reply.payload[AUTH_REASON_BODY_FIELD]).toBe(reply.getHeader(AUTH_REASON_HEADER));
  expect(isAuthFailureReason(reason)).toBe(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  __authCacheClear();
  delete process.env.SUPABASE_JWT_SECRET;
  delete process.env.ALLOW_DEMO_TOKENS;
  process.env.NODE_ENV = 'test';
});

describe('AUTH-07 — the contract itself', () => {
  it('names the header the web reads, and nothing else', () => {
    expect(AUTH_REASON_HEADER.toLowerCase()).toBe('x-auth-reason');
    expect(AUTH_REASON_BODY_FIELD).toBe('authReason');
  });

  it('pins the vocabulary — apps/web/lib/api-config.ts mirrors this list', () => {
    expect([...AUTH_FAILURE_REASONS].sort()).toEqual([
      'invalid_credential',
      'no_credentials',
      'registration_incomplete',
      'session_expired',
      'session_revoked',
      'verify_unavailable',
    ]);
  });

  it('does not admit a reason it has not defined', () => {
    expect(isAuthFailureReason('forbidden')).toBe(false);
    expect(isAuthFailureReason('SESSION_EXPIRED')).toBe(false);
    expect(isAuthFailureReason(undefined)).toBe(false);
  });
});

describe('AUTH-07 — case 1: no token was ever sent (auth.ts:110)', () => {
  it('answers no_credentials, not an expiry', async () => {
    const reply = makeReply();
    await authenticateUser(makeRequest(), reply);
    expectDenial(reply, 401, 'no_credentials');
    // The developer-facing sentence is deliberately unchanged.
    expect(reply.payload.message).toBe(
      'Missing or invalid Authorization header. Expected: Bearer <token>',
    );
  });

  it('answers no_credentials for an empty Bearer with no cookie either', async () => {
    const reply = makeReply();
    const request = makeRequest();
    request.headers = { authorization: 'Bearer   ' };
    await authenticateUser(request, reply);
    expectDenial(reply, 401, 'no_credentials');
  });
});

describe('AUTH-07 — case 2: registration incomplete (auth.ts:341)', () => {
  it('answers registration_incomplete when the credential verified and no User row exists', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const reply = makeReply();
    await authenticateUser(makeRequest(signedToken()), reply);

    expectDenial(reply, 401, 'registration_incomplete');
    expect(reply.payload.message).toBe('User account not found. Please complete registration.');
    // Never the expiry reason — the token was checked and it is fine.
    expect(reply.getHeader(AUTH_REASON_HEADER)).not.toBe('session_expired');
  });
});

describe('AUTH-07 — case 3: we could not verify right now (auth.ts:228)', () => {
  it('answers verify_unavailable when the email_sessions lookup THROWS', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('connection terminated unexpectedly'));

    const reply = makeReply();
    const token = `email-${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}-${'a'.repeat(32)}`;
    await authenticateUser(makeRequest(token), reply);

    expectDenial(reply, 401, 'verify_unavailable');
    expect(reply.payload.message).toBe('Could not validate session.');
  });

  it('still FAILS CLOSED — A-005 is not relaxed by naming the reason', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('boom'));
    const reply = makeReply();
    const request = makeRequest(
      `email-${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}-${'a'.repeat(32)}`,
    );
    await authenticateUser(request, reply);
    expect(reply.statusCode).toBe(401);
    expect(request.currentUser).toBeUndefined();
  });
});

describe('AUTH-07 — the expiry signal, recovered', () => {
  /**
   * The signal was destroyed at two points, both deliberately:
   * lib/supabase-jwt.ts returned a bare `null` for an expired token, and this
   * middleware tested Supabase's error for truthiness and discarded its code.
   * With the secret set, the local verifier now proves expiry — signature and
   * audience already matched — so the 401 can say so.
   */
  it('answers session_expired for a token past exp that is genuinely ours', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: null,
      error: { message: 'invalid claim' },
    });

    const reply = makeReply();
    const expired = signedToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    await authenticateUser(makeRequest(expired), reply);

    expectDenial(reply, 401, 'session_expired');
  });

  it('does NOT claim expiry for a forgery — that would be asserting what we do not know', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: null, error: { message: 'bad_jwt' } });

    const reply = makeReply();
    const forged = signedToken({ exp: Math.floor(Date.now() / 1000) - 60 }, 'not-the-secret');
    await authenticateUser(makeRequest(forged), reply);

    expectDenial(reply, 401, 'invalid_credential');
  });

  it('reads GoTrue’s own code when offline verification is not configured', async () => {
    // SUPABASE_JWT_SECRET unset — the default (SCAL-05). The remote error is
    // then the only witness, and it used to be reduced to `if (error || …)`.
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: null,
      error: { code: 'session_expired', message: 'Session from session_id claim has expired' },
    });

    const reply = makeReply();
    await authenticateUser(makeRequest(signedToken()), reply);

    expectDenial(reply, 401, 'session_expired');
  });

  it('falls back to invalid_credential for an error it cannot read', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: null, error: { message: 'bad_jwt' } });
    const reply = makeReply();
    await authenticateUser(makeRequest(signedToken()), reply);
    expectDenial(reply, 401, 'invalid_credential');
  });
});

describe('AUTH-07 — the remaining denials all carry a reason', () => {
  it('demo token in production is a bad credential, not an expiry', async () => {
    process.env.NODE_ENV = 'production';
    const reply = makeReply();
    await authenticateUser(makeRequest('demo-devotee-token'), reply);
    expectDenial(reply, 401, 'invalid_credential');
    expect(reply.payload.message).toBe('Demo tokens not accepted in production.');
  });

  it('a malformed email session token is a bad credential', async () => {
    const reply = makeReply();
    await authenticateUser(makeRequest('email-not-a-uuid-shape'), reply);
    expectDenial(reply, 401, 'invalid_credential');
  });

  it('a revoked email session says revoked, not expired', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { revoked_at: new Date(), expires_at: new Date(Date.now() + 86_400_000) },
    ]);
    const reply = makeReply();
    await authenticateUser(
      makeRequest(`email-${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}-${'a'.repeat(32)}`),
      reply,
    );
    expectDenial(reply, 401, 'session_revoked');
  });

  it('an expired email session says expired', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { revoked_at: null, expires_at: new Date(Date.now() - 1000) },
    ]);
    const reply = makeReply();
    await authenticateUser(
      makeRequest(`email-${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}-${'a'.repeat(32)}`),
      reply,
    );
    expectDenial(reply, 401, 'session_expired');
  });

  it('every 401 this middleware sends carries a reason — no silent holdouts', async () => {
    // A structural check over the source rather than a per-site enumeration, so
    // a 14th `reply.code(401)` added later cannot slip through untagged.
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./auth.ts', import.meta.url), 'utf8'),
    );
    // Comments stripped first — this file documents `reply.code(401)` in prose
    // and a naive match counts the docblock as a call site.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const rawTo401 = code.match(/reply\s*\n?\s*\.?code\(401\)/g) ?? [];
    // The only `reply.code(401)` left in the file is the one inside
    // `denyUnauthenticated` itself.
    expect(rawTo401.length).toBe(1);
    // ...and it is reached from thirteen places.
    expect((code.match(/denyUnauthenticated\(/g) ?? []).length).toBeGreaterThanOrEqual(13);
  });
});

/**
 * THE REGRESSION GUARD — 403 IS NOT REAUTH, AND MUST NOT LEARN TO BE.
 *
 * apps/api/src/middlewares/auth.ts:80 — "403 (not 401) signals 'we know who you
 * are, you just can't be here'". An earlier pass of AUTH-06 broke that on the
 * web side; AUTH-07 introduces the field that could break it on the API side.
 * A 403 with an auth reason on it would let apps/web reclassify a suspension as
 * "sign in again", which loops a suspended provider through a SUCCESSFUL
 * sign-in straight back to the same refusal.
 */
describe('AUTH-07 — a suspended account is still a 403 with NO reason', () => {
  it('carries no header, no body field, and keeps the support sentence', async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'devotee@demo.com',
      blocked: true,
      blockedReason: null,
    });

    const reply = makeReply();
    await authenticateUser(makeRequest(signedToken()), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload.error).toBe('Forbidden');
    expect(reply.payload.message).toBe('Account suspended. Contact support@darshya.online.');
    expect(reply.getHeader(AUTH_REASON_HEADER)).toBeUndefined();
    expect(reply.payload[AUTH_REASON_BODY_FIELD]).toBeUndefined();
  });

  it('the 403 sites do not route through the 401 helper at all', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./auth.ts', import.meta.url), 'utf8'),
    );
    // `denyUnauthenticated` hard-codes 401, so no 403 site can borrow it.
    const helper = src.slice(src.indexOf('function denyUnauthenticated'));
    expect(helper).toContain('reply.code(401)');
    expect(helper.slice(0, helper.indexOf('}'))).not.toContain('403');
    // And every 403 still says Forbidden, never Unauthorized.
    for (const block of src.split('reply.code(403).send(').slice(1)) {
      expect(block.slice(0, 120)).toContain("'Forbidden'");
    }
  });
});
