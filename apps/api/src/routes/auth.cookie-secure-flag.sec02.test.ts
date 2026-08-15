import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __testing } from './auth.js';

/**
 * SEC-02, prerequisite — the httpOnly cookie could never be exercised locally.
 *
 * The finding is that the access token lives in JS-readable localStorage
 * (`poojly_session`), so any XSS is a full account takeover. The stated fix is
 * to retire the Bearer-in-localStorage path now that the `darshya_session`
 * cookie exists and the API accepts it.
 *
 * That migration was blocked before it started. `setAuthCookies` sets
 * `secure: true` UNCONDITIONALLY, and a Secure cookie is never stored by a
 * browser over `http://localhost` — so on every developer machine the cookie
 * path silently does not exist. Cutting the localStorage write while the only
 * replacement cannot be tested locally is how you ship a 401 for every
 * authenticated screen; 83 files in apps/web hand-build
 * `Authorization: Bearer ${token}` and only 11 send `credentials: 'include'`.
 *
 * So: Secure in production, and only there. This changes nothing about
 * production behaviour — the assertion below pins that — and makes the cookie
 * path actually reachable in dev, which is the first step the rest of SEC-02
 * depends on.
 */

const { cookieSecurityOptions } = __testing;

const ORIG = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = ORIG;
});

describe('SEC-02 — the session cookie is Secure in production and settable in dev', () => {
  it('keeps Secure on in production — this must not weaken prod', () => {
    process.env.NODE_ENV = 'production';
    const opts = cookieSecurityOptions();
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });

  it('drops Secure outside production so http://localhost can hold the cookie', () => {
    process.env.NODE_ENV = 'development';
    expect(cookieSecurityOptions().secure).toBe(false);
    process.env.NODE_ENV = 'test';
    expect(cookieSecurityOptions().secure).toBe(false);
  });

  it('never drops httpOnly — that flag IS the finding', () => {
    for (const env of ['production', 'development', 'test', undefined]) {
      if (env === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = env;
      // A cookie readable from JavaScript is the localStorage problem wearing a
      // different hat, so this one is not environment-dependent.
      expect(cookieSecurityOptions().httpOnly).toBe(true);
    }
  });
});
