import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * SCAL-05 — every authenticated request made a live call to Supabase Auth.
 *
 * `authenticateUser` runs `supabaseAdmin.auth.getUser(token)` per request — an
 * outbound HTTPS round trip to GoTrue in ap-northeast-1 — then 1–3 Prisma user
 * lookups and a `userRoleAssignment.findMany`. Nothing was cached, so a page
 * load paid ~100–300 ms of third-party latency that no query tuning removes,
 * and the API's throughput ceiling was Supabase's rate limit rather than its
 * own. A bad minute at Supabase logs out every signed-in user simultaneously.
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
import {
  __authCacheClear,
  __authCacheSize,
  invalidateAuthUser,
  tokenExpiryMs,
} from '../lib/auth-cache.js';

/** A real-shaped Supabase access token: header.payload.signature, exp in 1h. */
function jwt(expSeconds: number, sub = 'sb-1'): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, exp: expSeconds })}.sig`;
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

beforeEach(() => {
  vi.clearAllMocks();
  __authCacheClear();
  delete process.env.AUTH_CACHE_TTL_MS;
  process.env.NODE_ENV = 'test';
  supabaseAdmin.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'devotee@demo.com', phone: null } },
    error: null,
  });
  prismaMock.user.findUnique.mockResolvedValue(DB_USER);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ role: 'DEVOTEE' }]);
});

afterEach(() => {
  __authCacheClear();
});

describe('SCAL-05 — repeat requests on one token', () => {
  it('calls Supabase once, then serves the same identity from memory', async () => {
    const token = jwt(Math.floor(Date.now() / 1000) + 3600);

    const first = makeRequest(token);
    await authenticateUser(first, makeReply());
    const second = makeRequest(token);
    await authenticateUser(second, makeReply());
    const third = makeRequest(token);
    await authenticateUser(third, makeReply());

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(1);
    // …and the Prisma lookups behind it are gone too.
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.userRoleAssignment.findMany).toHaveBeenCalledTimes(1);
    expect(third.currentUser).toEqual(first.currentUser);
    expect(third.currentUser.roles).toEqual(['DEVOTEE']);
  });

  it('keys on the whole token, so a different token is verified afresh', async () => {
    const now = Math.floor(Date.now() / 1000);
    await authenticateUser(makeRequest(jwt(now + 3600, 'sb-1')), makeReply());
    await authenticateUser(makeRequest(jwt(now + 3600, 'sb-2')), makeReply());

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(2);
  });

  it('never serves a cached identity past the token’s own exp', async () => {
    vi.useFakeTimers();
    try {
      const now = Math.floor(Date.now() / 1000);
      // Token expires in 10s — well inside the 60s cache TTL.
      const token = jwt(now + 10);
      await authenticateUser(makeRequest(token), makeReply());
      vi.advanceTimersByTime(11_000);
      await authenticateUser(makeRequest(token), makeReply());

      // Re-verified rather than trusted: Supabase gets to reject it.
      expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-verifies once the TTL lapses even on a long-lived token', async () => {
    vi.useFakeTimers();
    try {
      const token = jwt(Math.floor(Date.now() / 1000) + 86_400);
      await authenticateUser(makeRequest(token), makeReply());
      vi.advanceTimersByTime(61_000);
      await authenticateUser(makeRequest(token), makeReply());

      expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never caches a blocked account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...DB_USER,
      blocked: true,
      blockedReason: 'fraud',
    });
    const reply = makeReply();

    await authenticateUser(makeRequest(jwt(Math.floor(Date.now() / 1000) + 3600)), reply);

    expect(reply.statusCode).toBe(403);
    expect(__authCacheSize()).toBe(0);
  });

  it('lets an admin ban take effect on the very next request', async () => {
    const token = jwt(Math.floor(Date.now() / 1000) + 3600);
    await authenticateUser(makeRequest(token), makeReply());
    expect(__authCacheSize()).toBe(1);

    // What admin.service.updateUser does when it writes User.blocked.
    invalidateAuthUser('user-1');
    prismaMock.user.findUnique.mockResolvedValue({ ...DB_USER, blocked: true });

    const reply = makeReply();
    await authenticateUser(makeRequest(token), reply);

    expect(reply.statusCode).toBe(403);
  });

  it('can be switched off entirely', async () => {
    process.env.AUTH_CACHE_TTL_MS = '0';
    const token = jwt(Math.floor(Date.now() / 1000) + 3600);

    await authenticateUser(makeRequest(token), makeReply());
    await authenticateUser(makeRequest(token), makeReply());

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledTimes(2);
  });

  it('reads exp only from a real three-part JWT', () => {
    expect(tokenExpiryMs('not-a-jwt')).toBeNull();
    expect(tokenExpiryMs(jwt(1_800_000_000))).toBe(1_800_000_000_000);
  });
});
