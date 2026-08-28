import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * SEC-02 step 3 — an EMPTY Authorization header suppressed the cookie.
 *
 * `extractBearerToken` returned `authHeader.substring(7)` for anything that
 * starts with "Bearer ", and returned it BEFORE looking at the cookies. So
 * `Authorization: Bearer ` (the header a page produces when it interpolates an
 * absent token into a template literal) resolved to the empty string, the
 * `if (!token)` below answered 401, and the perfectly good httpOnly
 * `darshya_session` cookie in the same request was never read.
 *
 * That is the concrete thing blocking the localStorage token from leaving
 * apps/web. There are ~161 hand-built `Authorization: Bearer ${...}` sites in
 * the web app and many are unconditional, so "stop putting the token in
 * localStorage" turns those into empty Bearers — and every one of them 401s
 * against a browser that is, by the API's own cookie rules, signed in.
 *
 * An empty credential is not a credential. Treating it as absent is what the
 * header already means, and it costs nothing: a request with a real token is
 * unaffected, and a request with neither still 401s.
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

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub = 'sb-1') =>
  `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

function makeRequest(headers: Record<string, string>, cookies: Record<string, string> = {}) {
  return {
    headers,
    cookies,
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

describe('SEC-02 — an empty Bearer must not suppress the session cookie', () => {
  it('authenticates from the cookie when the header is "Bearer " with nothing after it', async () => {
    const cookieToken = jwt('sb-cookie');
    const request = makeRequest(
      { authorization: 'Bearer ' },
      { darshya_session: cookieToken },
    );
    const reply = makeReply();

    await authenticateUser(request, reply);

    expect(reply.statusCode).toBe(0);
    expect(request.currentUser).toBeTruthy();
    expect(request.currentUser.id).toBe('user-1');
    // The COOKIE's token is the one that was verified, not the empty string.
    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith(cookieToken);
  });

  it('does the same for a whitespace-only Bearer', async () => {
    const cookieToken = jwt('sb-cookie');
    const request = makeRequest(
      { authorization: 'Bearer \t  ' },
      { darshya_session: cookieToken },
    );
    const reply = makeReply();

    await authenticateUser(request, reply);

    expect(reply.statusCode).toBe(0);
    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith(cookieToken);
  });

  it('still 401s when the Bearer is empty and there is no cookie either', async () => {
    // The change must not turn "no credential" into "authenticated".
    const request = makeRequest({ authorization: 'Bearer ' }, {});
    const reply = makeReply();

    await authenticateUser(request, reply);

    expect(reply.statusCode).toBe(401);
    expect(request.currentUser).toBeUndefined();
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  it('leaves the existing precedence alone: a real Bearer still beats the cookie', async () => {
    // Mobile sends a header and no cookie; a transitional web client can send
    // both. The header must keep winning — flipping that would silently swap
    // which identity a dual-credential request runs as.
    const headerToken = jwt('sb-header');
    const request = makeRequest(
      { authorization: `Bearer ${headerToken}` },
      { darshya_session: jwt('sb-cookie') },
    );

    await authenticateUser(request, makeReply());

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith(headerToken);
  });

  it('does not trim a token that merely has padding around it', async () => {
    // "Bearer  abc " is malformed, but the token is real. Trimming the
    // extracted value is the honest reading and keeps the caller working.
    const token = jwt('sb-padded');
    const request = makeRequest({ authorization: `Bearer  ${token} ` }, {});

    await authenticateUser(request, makeReply());

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith(token);
  });
});
