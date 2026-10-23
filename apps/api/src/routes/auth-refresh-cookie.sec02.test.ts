import { describe, it, expect } from 'vitest';
import { __testing } from './auth.js';

const { refreshSchema, logoutSchema, resolveRefreshToken, resolveAccessToken } = __testing;

/**
 * SEC-02, STEP 1 — the blocker that made every later step impossible.
 *
 * The finding: the access token is persisted in JS-readable localStorage, so
 * any XSS is a full account takeover. The fix is to retire the Bearer-in-
 * localStorage path now that `darshya_session` exists and
 * middlewares/auth.ts accepts it.
 *
 * That could not be done, and the reason was here. `refreshSchema` REQUIRED
 * `refreshToken` in the request BODY:
 *
 *   const refreshSchema = z.object({ refreshToken: z.string().min(1) });
 *   ... refreshSchema.safeParse(request.body)  ->  400 'Refresh token is required'
 *
 * The httpOnly `darshya_refresh` cookie is issued at login (auth.ts, path
 * /api/v1/auth) and was NEVER READ by this handler. So a cookie-only client
 * could authenticate but could never refresh — its session would simply die at
 * the one-hour access-token TTL. That is precisely why the localStorage copy
 * could not be dropped, and why the transition test in apps/web asserts the
 * vulnerability still exists.
 *
 * The body still wins when present (mobile and every current web build send
 * it), so this is additive: nothing that works today stops working.
 *
 * These assertions FAIL against the pre-fix code — a body-less parse was a 400,
 * and there was no cookie fallback to resolve.
 */

describe('SEC-02 — POST /auth/refresh accepts the httpOnly cookie', () => {
  it('no longer rejects a request whose body omits refreshToken', () => {
    // Pre-fix: `success: false`, message 'Refresh token is required'.
    expect(refreshSchema.safeParse({}).success).toBe(true);
    // A body-less POST arrives as `undefined`; the handler parses
    // `request.body ?? {}`, which is the shape asserted above. The bare schema
    // still rejects `undefined`, and that is correct — a zod object is not a
    // zod optional, and the defaulting belongs at the one call site that knows
    // a missing body is legal.
    expect(refreshSchema.safeParse(undefined).success).toBe(false);
  });

  it('resolves the token from the darshya_refresh cookie when the body has none', () => {
    const token = resolveRefreshToken({}, { darshya_refresh: 'cookie-refresh-abc' });
    expect(token).toBe('cookie-refresh-abc');
  });

  it('prefers the body token so today’s Bearer clients are unaffected', () => {
    const token = resolveRefreshToken(
      { refreshToken: 'body-refresh-xyz' },
      { darshya_refresh: 'cookie-refresh-abc' },
    );
    expect(token).toBe('body-refresh-xyz');
  });

  it('returns null only when BOTH are absent — that is the one 401 left (the handler answers it)', () => {
    expect(resolveRefreshToken({}, {})).toBeNull();
    expect(resolveRefreshToken(undefined, undefined)).toBeNull();
    // An empty-string cookie is not a credential.
    expect(resolveRefreshToken({}, { darshya_refresh: '' })).toBeNull();
    expect(resolveRefreshToken({}, { darshya_refresh: '   ' })).toBeNull();
  });

  it('ignores a non-string body value rather than trusting it', () => {
    // request.body is attacker-shaped; zod already rejects non-strings, but the
    // resolver must not hand a number/object on to createHash either.
    expect(resolveRefreshToken({ refreshToken: 12345 as never }, {})).toBeNull();
    expect(resolveRefreshToken({ refreshToken: { a: 1 } as never }, {})).toBeNull();
  });
});

describe('SEC-02 — POST /auth/logout accepts the httpOnly cookie', () => {
  it('no longer requires accessToken in the body', () => {
    expect(logoutSchema.safeParse({}).success).toBe(true);
  });

  it('falls back to the darshya_session cookie', () => {
    expect(resolveAccessToken({}, { darshya_session: 'cookie-access-abc' })).toBe(
      'cookie-access-abc',
    );
    expect(
      resolveAccessToken({ accessToken: 'body-access' }, { darshya_session: 'cookie-access' }),
    ).toBe('body-access');
    expect(resolveAccessToken({}, {})).toBeNull();
  });
});
