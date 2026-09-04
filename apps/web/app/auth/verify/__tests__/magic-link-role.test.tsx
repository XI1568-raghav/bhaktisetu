/**
 * AUTH-03 — a provider signing in by magic link landed as a devotee.
 *
 * THE DEFECT. POST /auth/magic-link/verify answered `{ id, email, fullName,
 * phone }` with NO `role`. This page wrote that object straight into
 * `poojly_user` and hardcoded `router.replace('/dashboard')`; AuthProvider's
 * `fromApiRole(undefined)` resolves to `'devotee'`. So an approved temple
 * manager or pandit provisioned through the partnerships pipeline — whose ONLY
 * credential is that emailed link, since there is no password column on User —
 * was stored as a devotee and bounced off their own portal by AuthGuard on
 * every load. That is the entire supply side of the marketplace, locked out.
 *
 * WHY THIS FILE CHANGED (2026-08-23). The first pass could only fix the web
 * half, so it added a client-side stopgap: after /verify returned, the page made
 * a SECOND, blocking cross-origin call to GET /auth/me purely to ask what role
 * the account holds. This file's fixture hardcoded the silence
 * ("the magic-link endpoint as it actually answers today: no role field at
 * all") and one assertion required the /auth/me call to happen.
 *
 * That premise is now FALSE, deliberately. apps/api/src/routes/magic-link.ts
 * runs `getPrimaryRoleForUser` on the /verify reply itself — the same resolver
 * /login, /verify-otp, /me and Google sync already use — so the role arrives
 * with the session. Keeping a test that REQUIRES the round-trip would pin a
 * workaround in place and charge every magic-link sign-in, on the slowest door
 * in the product, for a question the response has already answered.
 *
 * So the fixture now serves what the API actually sends, and the `/auth/me`
 * assertion is INVERTED rather than dropped: the round-trip must be gone. Every
 * other assertion in this file is unchanged and still describes user-visible
 * behaviour — temple manager reaches /temple-portal, `pandit` becomes the web
 * `priest`, the role is persisted, the `poojly_user` COOKIE middleware.ts gates
 * on is written, and a response with no role still signs the user in rather
 * than erroring. The API half is pinned by
 * apps/api/src/routes/magic-link.role-cookie.auth03-sec02.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const replace = vi.fn();
// A STABLE router object. Next's useRouter returns one; a fresh object per
// render would change the page effect's dependency array every render and make
// it re-run, which is a defect in the test, not in the page.
const routerMock = { replace, push: vi.fn(), refresh: vi.fn() };
let searchParams = new URLSearchParams('token=a-valid-token');

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParams,
}));

import VerifyMagicLinkPage from '../page';

const realFetch = globalThis.fetch;

const SESSION = {
  accessToken: 'email-provider-1-deadbeef',
  refreshToken: '',
  expiresIn: 604800,
  expiresAt: Math.floor(Date.now() / 1000) + 604800,
};

/**
 * The magic-link endpoint as it answers now: the role travels with the session.
 *
 * `verifyRole: undefined` reproduces an older API build that still omits it —
 * the page must sign that user in as a devotee, not show an error.
 *
 * Anything other than /verify answers 404 ON PURPOSE. If the page ever
 * reintroduces the GET /auth/me stopgap, no stub will quietly rescue it.
 */
function serveMagicLink(verifyRole: string | undefined) {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('/auth/magic-link/verify')) {
      return new Response(
        JSON.stringify({
          ok: true,
          session: SESSION,
          user: {
            id: 'provider-1',
            email: 'temple@example.com',
            fullName: 'Temple Manager',
            phone: 'email-1',
            ...(verifyRole === undefined ? {} : { role: verifyRole }),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
  return calls;
}

beforeEach(() => {
  replace.mockReset();
  searchParams = new URLSearchParams('token=a-valid-token');
  localStorage.clear();
  document.cookie = 'poojly_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('AUTH-03 — the magic link resolves the real role', () => {
  it('sends a temple manager to their portal, not the devotee dashboard', async () => {
    serveMagicLink('temple_manager');

    render(<VerifyMagicLinkPage />);

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 3000 });
    expect(replace).toHaveBeenCalledWith('/temple-portal');
  });

  it('takes the role from the sign-in response, with no second round-trip', async () => {
    // Was: `expect(calls.some(u => u.includes('/auth/me'))).toBe(true)`. The
    // API now answers the question in /verify, so requiring the extra call
    // would pin a workaround — and it sat in front of every magic-link
    // sign-in, blocking, cross-origin.
    const calls = serveMagicLink('temple_manager');

    render(<VerifyMagicLinkPage />);

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 3000 });
    expect(
      calls.filter((u) => /\/auth\/me(\?|$)/.test(u)),
      'the page asked GET /auth/me for a role the verify response already carried',
    ).toHaveLength(0);
  });

  it('translates the API `pandit` role to the web `priest` route', async () => {
    serveMagicLink('pandit');

    render(<VerifyMagicLinkPage />);

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 3000 });
    expect(replace).toHaveBeenCalledWith('/priest');
  });

  it('stores the resolved role so AuthGuard does not bounce them on reload', async () => {
    serveMagicLink('pandit');

    render(<VerifyMagicLinkPage />);

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 3000 });
    const stored = JSON.parse(localStorage.getItem('poojly_user') ?? '{}');
    expect(stored.role).toBe('priest');
    // middleware.ts gates every portal path on the COOKIE, and this door used
    // to write localStorage only.
    expect(document.cookie).toContain('poojly_user=');
  });

  it('still signs a devotee in when the response carries no role', async () => {
    // An API build older than the role field must not turn a valid link into
    // an error page.
    serveMagicLink(undefined);

    render(<VerifyMagicLinkPage />);

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 3000 });
    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText(/not valid/i)).toBeNull();
  });
});
