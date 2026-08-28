/**
 * AUTH-06, second half — `loadErrorMessage` in lib/api-config.ts.
 *
 * `friendlyApiError` returns `{ message, reauth }` and six pages threw the
 * flag away. `loadErrorMessage` never had one to throw away: it answered a
 * 401 with "Your session has expired — sign in again to see your live
 * figures." and returned a bare string, so the ten surfaces that render it
 * (astrologer-portal, dashboard, gaushala-portal, payouts x2, priest,
 * profile x2, temple-portal, wellness-portal, MyProviderProfileCard) have no
 * way to tell a dead session from a 500 and no way to offer the sign-in link
 * the sentence instructs the user to use.
 *
 * The signature cannot change — those ten callers all store the result in a
 * `string | null` state — so the flag ships as a companion predicate over the
 * same input. The last test here is the one that matters: the predicate and
 * the message are derived from ONE classification, so they cannot drift into
 * saying "your session has expired" while reporting reauth: false.
 */

import { describe, it, expect } from 'vitest';
import { loadErrorMessage, loadErrorIsReauth } from '../lib/api-config';

const SESSION_SENTENCE = /session has expired/i;

describe('AUTH-06 — loadErrorIsReauth', () => {
  it('is true for 401 — the one status that means "sign in again"', () => {
    expect(loadErrorIsReauth({ status: 401 })).toBe(true);
  });

  /**
   * DELIBERATELY REWRITTEN 2026-08-28. This assertion used to read
   * `expect(loadErrorIsReauth({ status: 403 })).toBe(true)` under the heading
   * "the two statuses that mean 'sign in again'". That contract was wrong and
   * is superseded, not relaxed — the replacement below is a STRICTER claim.
   *
   * A 403 never means an expired session in this API. Every one of the ~40
   * `reply.code(403)` sites is an authorization outcome, and
   * apps/api/src/middlewares/auth.ts:80 says so in its own words: "403 (not
   * 401) signals 'we know who you are, you just can't be here' so the frontend
   * can show a 'account suspended' screen instead of bouncing back to login".
   * The populations are a suspended account (rejectIfBlocked, :88) and role or
   * ownership guards. Session failures are all 401.
   *
   * Harmless while `reauth` was a flag nobody read. AUTH-06 made <ReauthPrompt>
   * render INSTEAD of Retry, at which point the wrong answer here handed a
   * suspended provider exactly one control, sent her to a sign-in that
   * SUCCEEDED, redirected her back to the same refusal, and closed the loop —
   * the pathology AUTH-06 exists to remove, reproduced by AUTH-06.
   */
  it('is false for 403 — signing in again cannot lift a suspension', () => {
    expect(loadErrorIsReauth({ status: 403 })).toBe(false);
    expect(loadErrorIsReauth(new Response(null, { status: 403 }))).toBe(false);
    // ...and the sentence must not borrow the 401 copy either.
    expect(loadErrorMessage({ status: 403 })).not.toMatch(SESSION_SENTENCE);
  });

  it('is false for a server fault — re-entering a password fixes nothing', () => {
    expect(loadErrorIsReauth({ status: 500 })).toBe(false);
    expect(loadErrorIsReauth({ status: 503 })).toBe(false);
    expect(loadErrorIsReauth({ status: 404 })).toBe(false);
  });

  it('is false for a network failure or an aborted timeout', () => {
    expect(loadErrorIsReauth(new TypeError('Failed to fetch'))).toBe(false);
    expect(loadErrorIsReauth(new DOMException('aborted', 'AbortError'))).toBe(false);
    expect(loadErrorIsReauth(new Error('something else'))).toBe(false);
    expect(loadErrorIsReauth(null)).toBe(false);
    expect(loadErrorIsReauth(undefined)).toBe(false);
  });

  it('reads a real Response, which is what most callers pass', () => {
    // The callers pass the Response object itself (`loadErrorMessage(bRes)`),
    // not a hand-built `{ status }`.
    expect(loadErrorIsReauth(new Response(null, { status: 401 }))).toBe(true);
    expect(loadErrorIsReauth(new Response(null, { status: 502 }))).toBe(false);
  });

  it('never disagrees with the sentence loadErrorMessage returns', () => {
    const causes: unknown[] = [
      { status: 401 },
      { status: 403 },
      { status: 400 },
      { status: 404 },
      { status: 418 },
      { status: 500 },
      { status: 503 },
      new TypeError('Failed to fetch'),
      new DOMException('aborted', 'AbortError'),
      new Error('boom'),
      null,
      undefined,
      'not an error at all',
    ];
    for (const cause of causes) {
      expect({
        cause: String(cause && typeof cause === 'object' ? JSON.stringify(cause) : cause),
        reauth: loadErrorIsReauth(cause),
      }).toEqual({
        cause: String(cause && typeof cause === 'object' ? JSON.stringify(cause) : cause),
        reauth: SESSION_SENTENCE.test(loadErrorMessage(cause)),
      });
    }
  });
});
