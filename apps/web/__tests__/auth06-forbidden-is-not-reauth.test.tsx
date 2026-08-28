/**
 * AUTH-06, the defect its own remedy introduced.
 *
 * AUTH-06 wired `friendlyApiError().reauth` and `loadErrorIsReauth()` up to
 * <ReauthPrompt>, which renders INSTEAD of Retry. That is right for a 401. It
 * is wrong for a 403, and both classifiers said 403 meant "sign in again":
 *
 *   lib/friendly-error.ts   isAuthError matched /401|403|…|forbidden/ and
 *                           friendlyApiError answered
 *                           { message: 'Your session has expired…',
 *                             reauth: true }
 *   lib/api-config.ts       loadErrorIsReauth returned true for 401 OR 403,
 *                           and loadErrorMessage answered
 *                           'Your session has expired — sign in again to see
 *                            your live figures.'
 *
 * A 403 in this API never means an expired session. Every one of the ~40
 * `reply.code(403)` sites is an AUTHORIZATION outcome, and the middleware says
 * so in its own words at apps/api/src/middlewares/auth.ts:80 — "403 (not 401)
 * signals 'we know who you are, you just can't be here' so the frontend can
 * show a 'account suspended' screen instead of bouncing back to login". The
 * populations are a SUSPENDED account (rejectIfBlocked, :88, body "Account
 * suspended: <reason>") and role/ownership guards ("ASTROLOGER role required",
 * "Not authorized for this consultation.", "NotOrgMember",
 * "insufficient_scope"). Every session failure is a 401.
 *
 * So a suspended devotee was told her session had expired, handed a "Sign in
 * again" button in place of Retry, signed in successfully — the block is
 * enforced per request, not at the door — was redirected by
 * `reauthLoginHref(pathname)` straight back to the page that refused her, and
 * got the same sentence again. A loop whose only exit is a control that cannot
 * work: precisely the pathology AUTH-06 was filed to remove, reintroduced by
 * AUTH-06's own fix and made load-bearing by it, because ReauthPrompt REPLACES
 * the Retry button rather than sitting beside it.
 *
 * The real reason ("Account suspended — contact support") was discarded on the
 * way, so the one sentence that could have ended it never reached her.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { friendlyApiError, isAuthError, isForbiddenError } from '../lib/friendly-error';
import { loadErrorMessage, loadErrorIsReauth } from '../lib/api-config';

const SESSION_SENTENCE = /session has expired/i;

describe('AUTH-06 — a 403 is not a reason to sign in again', () => {
  it('friendlyApiError never asks a forbidden caller to re-authenticate', () => {
    for (const raw of [
      'HTTP 403',
      'API 403',
      '403 Forbidden',
      'Forbidden',
      'Account suspended: chargeback fraud',
      'ASTROLOGER role required',
      'Not authorized for this consultation.',
      'NotOrgMember',
      'insufficient_scope',
    ]) {
      const { message, reauth } = friendlyApiError(new Error(raw));
      expect({ raw, reauth }).toEqual({ raw, reauth: false });
      // ...and it must not claim the session expired either. Saying it while
      // withholding the button was the *original* AUTH-06 complaint.
      expect({ raw, saysExpired: SESSION_SENTENCE.test(message) }).toEqual({
        raw,
        saysExpired: false,
      });
    }
  });

  it('still tells a forbidden caller what to do instead of the generic shrug', () => {
    // "We could not load this right now. Please try again." is advice that can
    // never succeed against a suspension. Naming support is the only exit.
    const { message } = friendlyApiError(new Error('HTTP 403'));
    expect(message).toMatch(/do not have access/i);
    expect(message).toMatch(/support@darshya\.online/);
  });

  it('a 401 is untouched — that IS a reason to sign in again', () => {
    for (const raw of ['HTTP 401', '401 Unauthorized', 'Unauthorized', 'session expired']) {
      const { message, reauth } = friendlyApiError(new Error(raw));
      expect({ raw, reauth }).toEqual({ raw, reauth: true });
      expect(SESSION_SENTENCE.test(message)).toBe(true);
    }
  });

  it('the two predicates are disjoint, so neither can be read as the other', () => {
    expect(isForbiddenError('403 Forbidden')).toBe(true);
    expect(isAuthError('403 Forbidden')).toBe(false);
    expect(isAuthError('401 Unauthorized')).toBe(true);
    expect(isForbiddenError('401 Unauthorized')).toBe(false);
  });

  it('loadErrorIsReauth answers for 401 only', () => {
    expect(loadErrorIsReauth({ status: 401 })).toBe(true);
    expect(loadErrorIsReauth({ status: 403 })).toBe(false);
    expect(loadErrorIsReauth(new Response(null, { status: 403 }))).toBe(false);
  });

  it('loadErrorMessage stops telling a forbidden viewer their session expired', () => {
    const msg = loadErrorMessage({ status: 403 });
    expect(SESSION_SENTENCE.test(msg)).toBe(false);
    expect(msg).toMatch(/do not have access/i);
    expect(msg).toMatch(/support@darshya\.online/);
    // The 401 sentence is unchanged.
    expect(loadErrorMessage({ status: 401 })).toMatch(SESSION_SENTENCE);
  });
});

/**
 * The end-to-end half. A unit test on the classifier would still pass if a page
 * rendered <ReauthPrompt> on any error at all, so one page in the same lane is
 * driven through a real 403 to prove the affordance itself is gone.
 */
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/leads' }));
vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>('../lib/auth-context');
  return {
    ...actual,
    useAuth: () => ({ session: { accessToken: 'valid-but-suspended' }, user: null, isLoading: false }),
  };
});

import AdminLeadsPage from '../app/admin/leads/page';

const originalFetch = globalThis.fetch;
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('AUTH-06 — /admin/leads on a 403', () => {
  it('offers no "Sign in again", because signing in cannot lift a suspension', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Forbidden', message: 'Account suspended.' }),
      } as unknown as Response),
    ) as unknown as typeof fetch;

    render(<AdminLeadsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy();
    });
    expect(await screen.findByText(/do not have access/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /sign in again/i })).toBeNull();
    expect(screen.queryByText(SESSION_SENTENCE)).toBeNull();
    // ...and the raw status line still never reaches the admin (P1 #208).
    expect(document.body.textContent).not.toContain('403 Forbidden');
  });
});
