/**
 * AUTH-07 (F454, 2026-09-08) — a 401 is not one thing, and the copy said it was.
 *
 * `loadErrorMessage` answered EVERY 401 with "Your session has expired — sign
 * in again to see your live figures." and `loadErrorIsReauth` was
 * `loadErrorStatus(cause) === 401`, reading the numeric status and nothing
 * else. The API answers 401 in at least three cases where that sentence is
 * false, all verified in the source and two of them against production on
 * 2026-09-08:
 *
 *   1. NO TOKEN WAS EVER SENT — apps/api/src/middlewares/auth.ts:110.
 *      GET https://api.darshya.online/api/v1/users/me/bookings with no
 *      Authorization header answers
 *      {"error":"Unauthorized","message":"Missing or invalid Authorization
 *      header. Expected: Bearer <token>"}. Nothing expired; the user was never
 *      signed in on this device.
 *
 *   2. REGISTRATION INCOMPLETE — apps/api/src/middlewares/auth.ts:341.
 *      Supabase vouched for the token and there is no `User` row behind it.
 *      Signing in again reproduces it exactly — the sign-in SUCCEEDS and the
 *      next request 401s the same way, which is the AUTH-06 suspended-provider
 *      loop wearing a different status.
 *
 *   3. WE COULD NOT VERIFY — apps/api/src/middlewares/auth.ts:228 (the
 *      email_sessions lookup threw) and apps/api/src/routes/auth.ts:1136 (the
 *      login handler's catch: "DB/Supabase unavailable"). Telling a user their
 *      session expired during a database outage sends them to re-authenticate
 *      against the thing that is down. They try, they fail, and they conclude
 *      their account is broken.
 *
 * THE CONTRACT WAS THE OBSTACLE. Any discriminator added to the 401 BODY was
 * dead on arrival: all ten callers pass a bare `Response` to a SYNCHRONOUS
 * helper and never read the body (app/dashboard/page.tsx:116,
 * app/payouts/page.tsx:103, and eight more). Bodies are async; HEADERS ARE NOT.
 * So the discriminator travels as `X-Auth-Reason` — readable off the same
 * `Response` those ten call sites already hold, with no call-site change — and
 * is mirrored into the body as `authReason` for the clients that do read bodies
 * (apps/mobile). Cross-origin visibility is not free: the 2026-09-08 probe
 * showed NO `access-control-expose-headers` on any api.darshya.online response,
 * so the API stamps that too — see apps/api/src/plugins/error-localization.ts.
 *
 * THE LOAD-BEARING RULE THIS MUST NOT BREAK: a 403 is NOT reauth. Every
 * `reply.code(403)` in the API is an authorization outcome
 * (apps/api/src/middlewares/auth.ts:80). An earlier pass of AUTH-06 made
 * `loadErrorIsReauth` true for 401 OR 403 and answered both with the expiry
 * line, which turned the fix into the bug it was fixing. The reason header is
 * consulted for 401 ONLY, so no reason value can ever promote a 403.
 */

import { describe, it, expect } from 'vitest';
import {
  loadErrorMessage,
  loadErrorIsReauth,
  loadErrorIsForbidden,
  loadErrorAuthReason,
  AUTH_REASON_HEADER,
} from '../lib/api-config';

const EXPIRY_SENTENCE = /session has expired/i;

/**
 * The wire shapes the API produces, transcribed from the assertions in
 * apps/api/src/middlewares/auth.reason.auth07.test.ts. Building a real
 * `Response` (rather than a `{ status }` literal) is the point: it is the exact
 * object `fetchWithTimeout` hands the ten call sites, headers and all.
 */
function apiResponse(
  status: number,
  reason: string | null,
  body: Record<string, unknown> = {},
): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (reason) headers.set(AUTH_REASON_HEADER, reason);
  return new Response(JSON.stringify({ error: 'Unauthorized', ...body }), { status, headers });
}

describe('AUTH-07 — the reason header reaches the web helpers', () => {
  it('exposes the header name the API stamps', () => {
    // Lowercase because `Headers.get` is case-insensitive but the constant is
    // also used to READ, and a mismatch here is silent.
    expect(AUTH_REASON_HEADER.toLowerCase()).toBe('x-auth-reason');
  });

  it('reads the reason off a real Response, synchronously, without touching the body', () => {
    const res = apiResponse(401, 'verify_unavailable', { authReason: 'verify_unavailable' });
    expect(loadErrorAuthReason(res)).toBe('verify_unavailable');
    // The body must still be readable by the caller afterwards — the helper is
    // not allowed to consume it.
    expect(res.bodyUsed).toBe(false);
  });

  it('also accepts a parsed body object, for callers that already read it', () => {
    expect(loadErrorAuthReason({ status: 401, authReason: 'no_credentials' })).toBe(
      'no_credentials',
    );
  });

  it('ignores a reason it does not recognise rather than inventing copy for it', () => {
    const res = apiResponse(401, 'something_new_from_a_newer_api');
    expect(loadErrorAuthReason(res)).toBeNull();
    // ...and falls back to today's answer, so a newer API cannot break an
    // older web build.
    expect(loadErrorMessage(res)).toMatch(EXPIRY_SENTENCE);
    expect(loadErrorIsReauth(res)).toBe(true);
  });
});

describe('AUTH-07 — case 1: no token was ever sent (middlewares/auth.ts:110)', () => {
  const res = apiResponse(401, 'no_credentials', {
    message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    authReason: 'no_credentials',
  });

  it('does not claim a session expired — there was never a session', () => {
    expect(loadErrorMessage(res)).not.toMatch(EXPIRY_SENTENCE);
  });

  it('says what happened and what to do next', () => {
    const msg = loadErrorMessage(res);
    expect(msg).toMatch(/not signed in/i);
    expect(msg).toMatch(/sign in/i);
  });

  it('still offers the sign-in affordance — signing in IS the remedy here', () => {
    expect(loadErrorIsReauth(res)).toBe(true);
  });
});

describe('AUTH-07 — case 2: registration incomplete (middlewares/auth.ts:341)', () => {
  const res = apiResponse(401, 'registration_incomplete', {
    message: 'User account not found. Please complete registration.',
    authReason: 'registration_incomplete',
  });

  it('does not claim a session expired — the token verified fine', () => {
    expect(loadErrorMessage(res)).not.toMatch(EXPIRY_SENTENCE);
  });

  it('names the actual gap and an exit that is not the sign-in page', () => {
    const msg = loadErrorMessage(res);
    expect(msg).toMatch(/no Darshya account/i);
    expect(msg).toMatch(/support@darshya\.online/);
  });

  /**
   * The AUTH-06 loop, exactly. <ReauthPrompt> renders INSTEAD of Retry, and a
   * sign-in here SUCCEEDS — the Supabase credential was never the problem —
   * then lands the user back on the same 401. One control, and it closes a
   * circle. Retry is not useful either, but it is not a loop, and the sentence
   * above carries the real exit.
   */
  it('does NOT send the user to sign in again — that loop is the AUTH-06 pathology', () => {
    expect(loadErrorIsReauth(res)).toBe(false);
  });
});

describe('AUTH-07 — case 3: we could not verify right now (auth.ts:228 / routes/auth.ts:1136)', () => {
  const res = apiResponse(401, 'verify_unavailable', {
    message: 'Could not validate session.',
    authReason: 'verify_unavailable',
  });

  it('does not claim a session expired during an outage', () => {
    expect(loadErrorMessage(res)).not.toMatch(EXPIRY_SENTENCE);
  });

  it('says whose problem it is and that re-authenticating will not help', () => {
    const msg = loadErrorMessage(res);
    expect(msg).toMatch(/on our side/i);
    expect(msg).toMatch(/not with your account/i);
    expect(msg).toMatch(/retry/i);
  });

  it('keeps the RES-02 placeholder warning — the zeros on screen are still fabricated', () => {
    expect(loadErrorMessage(res)).toMatch(/placeholders, not your real numbers/i);
  });

  /**
   * The whole finding in one assertion. `reauth: true` makes LoadErrorBanner
   * render <ReauthPrompt> INSTEAD of Retry, so during a database outage the
   * only control on screen would be a link to re-authenticate against the
   * thing that is down. Retry is the correct control here and it must survive.
   */
  it('does NOT send the user to sign in again during an outage', () => {
    expect(loadErrorIsReauth(res)).toBe(false);
  });
});

describe('AUTH-07 — the remaining reasons', () => {
  it('session_expired keeps the sentence that was always correct for it', () => {
    const res = apiResponse(401, 'session_expired', { authReason: 'session_expired' });
    expect(loadErrorMessage(res)).toMatch(EXPIRY_SENTENCE);
    expect(loadErrorIsReauth(res)).toBe(true);
  });

  it('session_revoked says signed out, not expired', () => {
    const res = apiResponse(401, 'session_revoked', { authReason: 'session_revoked' });
    expect(loadErrorMessage(res)).not.toMatch(EXPIRY_SENTENCE);
    expect(loadErrorMessage(res)).toMatch(/signed out/i);
    expect(loadErrorIsReauth(res)).toBe(true);
  });

  it('invalid_credential does not assert an expiry it cannot know about', () => {
    const res = apiResponse(401, 'invalid_credential', { authReason: 'invalid_credential' });
    expect(loadErrorMessage(res)).not.toMatch(EXPIRY_SENTENCE);
    expect(loadErrorMessage(res)).toMatch(/could not verify your sign-in/i);
    expect(loadErrorIsReauth(res)).toBe(true);
  });
});

describe('AUTH-07 — nothing that already worked may change', () => {
  it('a 401 with no reason still answers exactly as it did before', () => {
    // Back-compat with an API that has not shipped the header yet, and with
    // every 401 outside the auth middleware.
    expect(loadErrorMessage({ status: 401 })).toBe(
      'Your session has expired — sign in again to see your live figures.',
    );
    expect(loadErrorIsReauth({ status: 401 })).toBe(true);
    expect(loadErrorAuthReason({ status: 401 })).toBeNull();
  });

  it('a 401 whose reason header did not survive CORS still answers as before', () => {
    // `Headers.get` returns null for a header the browser did not expose, which
    // is exactly the un-widened case. It must degrade, not break.
    expect(loadErrorMessage(apiResponse(401, null))).toMatch(EXPIRY_SENTENCE);
    expect(loadErrorIsReauth(apiResponse(401, null))).toBe(true);
  });
});

/**
 * THE REGRESSION GUARD. Restated here rather than left to
 * auth06-load-error-reauth.test.ts because AUTH-07 introduces the one mechanism
 * that could undo it: a body/header field that says "this is an auth problem".
 * A 403 IS an auth problem — an authorization one — and promoting it to reauth
 * hands a suspended provider a single control that takes her to a sign-in which
 * succeeds and returns her to the same refusal. The reason is consulted for 401
 * only, and these assertions are what pins that.
 */
describe('AUTH-07 — a 403 is still NOT reauth, whatever the body says', () => {
  it('is not reauth, and does not borrow the expiry sentence', () => {
    expect(loadErrorIsReauth({ status: 403 })).toBe(false);
    expect(loadErrorIsReauth(new Response(null, { status: 403 }))).toBe(false);
    expect(loadErrorMessage({ status: 403 })).not.toMatch(EXPIRY_SENTENCE);
    expect(loadErrorIsForbidden({ status: 403 })).toBe(true);
  });

  it('is not reauth even when a reason header rides along on it', () => {
    for (const reason of ['session_expired', 'no_credentials', 'invalid_credential']) {
      const res = apiResponse(403, reason, { authReason: reason });
      expect(loadErrorIsReauth(res)).toBe(false);
      expect(loadErrorAuthReason(res)).toBeNull();
      expect(loadErrorMessage(res)).not.toMatch(EXPIRY_SENTENCE);
      // The suspension sentence is the only useful exit and must survive.
      expect(loadErrorMessage(res)).toMatch(/contact support@darshya\.online/i);
    }
  });

  it('does not promote any other status either', () => {
    for (const status of [400, 404, 429, 500, 503]) {
      const res = apiResponse(status, 'session_expired', { authReason: 'session_expired' });
      expect(loadErrorIsReauth(res)).toBe(false);
      expect(loadErrorAuthReason(res)).toBeNull();
      expect(loadErrorMessage(res)).not.toMatch(EXPIRY_SENTENCE);
    }
  });

  it('a network failure carries no reason and is not reauth', () => {
    expect(loadErrorAuthReason(new TypeError('Failed to fetch'))).toBeNull();
    expect(loadErrorIsReauth(new TypeError('Failed to fetch'))).toBe(false);
    expect(loadErrorAuthReason(null)).toBeNull();
    expect(loadErrorAuthReason(undefined)).toBeNull();
  });
});
