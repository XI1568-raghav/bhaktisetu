/**
 * AUTH-03 — a provider signing in by magic link landed as a devotee.
 *
 * POST /auth/magic-link/verify answers with `{ id, email, fullName, phone }`
 * and NO `role`. This page wrote that object straight into `poojly_user` and
 * then hardcoded `router.replace('/dashboard')`. AuthProvider's rehydrate runs
 * `fromApiRole(undefined)`, which resolves to `'devotee'` — so an approved
 * temple manager or pandit provisioned through the partnerships pipeline, whose
 * ONLY credential is that emailed link (there is no password column on User),
 * was stored as a devotee and bounced off their own portal by AuthGuard on
 * every load. That is the entire supply side of the marketplace, locked out.
 *
 * The role is authoritative on the server and already exposed: GET /auth/me
 * runs getPrimaryRoleForUser and returns it. Ask.
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
 * The magic-link endpoint as it actually answers today: no role field at all.
 * The page must not treat that silence as "devotee".
 */
function serveMagicLink(meRole: string | null) {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('/auth/magic-link/verify')) {
      return new Response(
        JSON.stringify({
          ok: true,
          session: SESSION,
          user: { id: 'provider-1', email: 'temple@example.com', fullName: 'Temple Manager', phone: 'email-1' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.includes('/auth/me')) {
      if (meRole === null) return new Response('{}', { status: 500 });
      return new Response(
        JSON.stringify({
          success: true,
          user: { id: 'provider-1', email: 'temple@example.com', fullName: 'Temple Manager', phone: 'email-1', role: meRole },
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
    const calls = serveMagicLink('temple_manager');

    render(<VerifyMagicLinkPage />);

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 3000 });
    expect(calls.some((u) => u.includes('/auth/me'))).toBe(true);
    expect(replace).toHaveBeenCalledWith('/temple-portal');
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

  it('still signs a devotee in when /auth/me cannot be reached', async () => {
    serveMagicLink(null);

    render(<VerifyMagicLinkPage />);

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 3000 });
    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText(/not valid/i)).toBeNull();
  });
});
