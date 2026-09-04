/**
 * SEC-02, prerequisite #1 — the cookie-issuing helper was module-private, so no
 * other route could issue the httpOnly session at all.
 *
 * The finding is that the access token lives in JS-readable localStorage
 * (`poojly_session`), making any XSS a full account takeover, and that the fix
 * is to retire the Bearer-in-localStorage path in favour of the httpOnly
 * `darshya_session` cookie the API already accepts as auth.
 *
 * The blocker the last wave identified: `POST /auth/magic-link/verify`
 * (apps/api/src/routes/magic-link.ts) mints a Supabase session and returns it
 * as JSON but NEVER sets the auth cookies, so a magic-link user — which is
 * every provider onboarded through the partnerships pipeline — has no
 * `darshya_session` at all and is structurally stuck on the localStorage token.
 * They cannot be migrated off it, so the localStorage write cannot be deleted,
 * so SEC-02 cannot close.
 *
 * `setAuthCookies` is the single writer for those cookies and it was declared
 * `function setAuthCookies(...)` with no `export`, so magic-link.ts could not
 * call it even in principle — the only options open to that lane were to
 * duplicate the cookie flags (which is how flags drift apart) or to widen this
 * module. Exporting it is the narrower of the two.
 *
 * These tests bind to the CONTRACT the caller depends on, not merely to the
 * existence of the symbol: both cookies, both httpOnly, the refresh cookie
 * scoped to the refresh endpoint, and a safe no-op when @fastify/cookie is
 * absent (the historical reason this helper swallows its own errors).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { setAuthCookies } from './auth.js';

type Recorded = { name: string; value: string; opts: Record<string, unknown> };

/** Minimal stand-in for a FastifyReply carrying @fastify/cookie's setCookie. */
function replyWithCookies() {
  const set: Recorded[] = [];
  const reply = {
    setCookie(name: string, value: string, opts: Record<string, unknown>) {
      set.push({ name, value, opts });
      return this;
    },
  };
  return { reply: reply as never, set };
}

const ORIG = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = ORIG;
});

describe('SEC-02 — setAuthCookies is reachable by the other session-minting routes', () => {
  it('is exported, so magic-link.ts can issue the same cookies as /auth/login', () => {
    expect(
      typeof setAuthCookies,
      'a module-private helper forces every other route to hand-roll the cookie ' +
        'flags, which is exactly how httpOnly/Secure/SameSite drift apart',
    ).toBe('function');
  });

  it('issues BOTH auth cookies, both httpOnly', () => {
    const { reply, set } = replyWithCookies();
    setAuthCookies(reply, 'access-abc', 'refresh-xyz');

    const session = set.find((c) => c.name === 'darshya_session');
    const refresh = set.find((c) => c.name === 'darshya_refresh');

    expect(session, 'no darshya_session issued — the user stays on the localStorage token').toBeTruthy();
    expect(refresh, 'no darshya_refresh issued — the session dies at the 1h access TTL').toBeTruthy();

    expect(session!.value).toBe('access-abc');
    expect(refresh!.value).toBe('refresh-xyz');

    // The flag that IS the finding: a JS-readable cookie is the localStorage
    // problem wearing a different hat.
    expect(session!.opts.httpOnly).toBe(true);
    expect(refresh!.opts.httpOnly).toBe(true);
  });

  it('scopes the refresh cookie to the refresh endpoint and the session cookie site-wide', () => {
    const { reply, set } = replyWithCookies();
    setAuthCookies(reply, 'a', 'r');

    expect(set.find((c) => c.name === 'darshya_session')!.opts.path).toBe('/');
    // Narrower path = the refresh token is not attached to every API call.
    expect(set.find((c) => c.name === 'darshya_refresh')!.opts.path).toBe('/api/v1/auth');
  });

  it('keeps Secure on in production', () => {
    process.env.NODE_ENV = 'production';
    const { reply, set } = replyWithCookies();
    setAuthCookies(reply, 'a', 'r');
    for (const c of set) expect(c.opts.secure, `${c.name} must be Secure in prod`).toBe(true);
  });

  it('no-ops safely when @fastify/cookie is not registered', () => {
    // The JSON Bearer response stays the contract of record on that path; a
    // throw here would take down the whole sign-in handler.
    const bare = {} as never;
    expect(() => setAuthCookies(bare, 'a', 'r')).not.toThrow();
  });
});
