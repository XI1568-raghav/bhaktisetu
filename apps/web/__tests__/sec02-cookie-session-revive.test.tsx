/**
 * SEC-02 — a session must be able to survive a reload with NO token in
 * localStorage.
 *
 * The finding: the access token is persisted in `poojly_session`, so any XSS is
 * full account takeover. The httpOnly `darshya_session` cookie already exists
 * and the API already accepts it (apps/api/src/middlewares/auth.ts:54-58), so
 * the destination is clear — but nothing could move until the browser could
 * REHYDRATE without the JS-readable copy. Until now it could not: AuthProvider
 * read `poojly_session` from localStorage and, finding nothing, declared the
 * visitor signed out. Deleting the localStorage write therefore signed everyone
 * out on their next reload, which is exactly the outcome the finding forbids.
 *
 * The blocker that kept this shut is now GONE, and this is the evidence:
 * `refreshSchema` in apps/api/src/routes/auth.ts:54-55 marks `refreshToken`
 * `.optional()`, and `resolveRefreshToken` (same file, :78-82) falls back to the
 * httpOnly `darshya_refresh` cookie. POST /auth/refresh answers a request whose
 * only credential is that cookie, and re-issues both cookies on the way out
 * (setAuthCookies, :620). The comments in lib/auth-context.tsx and
 * lib/api-config.ts still described the OLD state ("its Zod schema currently
 * REQUIRES refreshToken in the body") and that stale note is part of why this
 * has stalled for three passes.
 *
 * What these tests pin:
 *   1. the revive call is shaped so the cookie is the credential — credentials
 *      mode on, and NO refresh token in the body;
 *   2. a browser holding only the token-free `poojly_user` profile marker comes
 *      back signed in;
 *   3. a browser holding NOTHING makes no network call at all — the anonymous
 *      homepage must not pay a round-trip, and must not depend on the API being
 *      reachable to render;
 *   4. a failed revive clears the stale marker, so middleware.ts stops waving a
 *      dead session into the portal shell.
 *
 * This does NOT by itself retire the localStorage token — seven files outside
 * this lane still read `poojly_session` directly. It removes the reason they
 * could not be changed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { reviveSessionFromCookie, hasStoredProfile, __resetReviveCache } from '../lib/session-revive';

const realFetch = globalThis.fetch;

const PROFILE = {
  id: 'user-42',
  phone: '+919800000042',
  fullName: 'Cookie-Only Devotee',
  email: 'cookie-only@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  role: 'priest',
};

const COOKIE_SESSION = {
  accessToken: 'cookie-minted-access-token',
  refreshToken: 'cookie-minted-refresh-token',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
};

type Call = { url: string; init: RequestInit };

function installFetch(handler: (url: string) => Response): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url);
  }) as unknown as typeof fetch;
  return calls;
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

function Probe() {
  const { user, isLoading } = useAuth();
  return <span data-testid="role">{isLoading ? 'loading' : (user?.role ?? 'none')}</span>;
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  __resetReviveCache();
  localStorage.clear();
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('SEC-02 — the revive call makes the httpOnly cookie the credential', () => {
  it('POSTs /auth/refresh in credentials mode with no token in the body', async () => {
    const calls = installFetch(() => ok({ success: true, session: COOKIE_SESSION }));

    const revived = await reviveSessionFromCookie();

    expect(revived?.accessToken).toBe(COOKIE_SESSION.accessToken);
    const call = calls.find((c) => c.url.endsWith('/auth/refresh'));
    expect(call, 'revive never reached POST /auth/refresh').toBeTruthy();
    expect(call!.init.method).toBe('POST');
    expect(
      call!.init.credentials,
      "outside credentials mode a cross-origin fetch omits darshya_refresh entirely, " +
        'so the cookie can never be the credential',
    ).toBe('include');
    expect(
      String(call!.init.body ?? ''),
      'sending a refreshToken here would just be the localStorage copy again',
    ).not.toContain('refreshToken');
  });

  it('returns null when the API refuses (no cookie, expired, replayed)', async () => {
    installFetch(
      () =>
        new Response(JSON.stringify({ error: 'BadRequest' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    await expect(reviveSessionFromCookie()).resolves.toBeNull();
  });

  it('returns null rather than throwing when the API is unreachable', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(reviveSessionFromCookie()).resolves.toBeNull();
  });

  it('reads the profile marker from either store', () => {
    expect(hasStoredProfile()).toBe(false);
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    expect(hasStoredProfile()).toBe(true);
    localStorage.clear();
    document.cookie = `poojly_user=${encodeURIComponent(JSON.stringify(PROFILE))}; path=/`;
    expect(hasStoredProfile()).toBe(true);
  });
});

describe('SEC-02 — AuthProvider rehydrates from the cookie alone', () => {
  it('signs a token-free browser back in', async () => {
    // Exactly the state a browser is left in once `poojly_session` is no longer
    // written: the token-free profile marker, and nothing else.
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    const calls = installFetch(() => ok({ success: true, session: COOKIE_SESSION }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('priest'));
    expect(calls.some((c) => c.url.endsWith('/auth/refresh'))).toBe(true);
  });

  it('makes no network call at all when nothing is stored', async () => {
    const calls = installFetch(() => ok({ success: true, session: COOKIE_SESSION }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
    expect(
      calls,
      'an anonymous visitor must not pay a round-trip, and the homepage must not ' +
        'need the API to be up in order to render',
    ).toHaveLength(0);
  });

  it('clears the stale marker when the cookie is dead, so the portal gate stops passing it', async () => {
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    document.cookie = `poojly_user=${encodeURIComponent(JSON.stringify(PROFILE))}; path=/`;
    installFetch(
      () =>
        new Response(JSON.stringify({ error: 'BadRequest' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
    // middleware.ts gates every portal on the mere presence of this cookie.
    // Leaving it behind means a signed-out visitor keeps getting the portal
    // shell instead of a clean 307 to /auth/login.
    expect(cookieValue('poojly_user')).toBeNull();
    expect(localStorage.getItem('poojly_user')).toBeNull();
  });

  it('prefers an existing localStorage session and does not revive over it', async () => {
    // The transition case: a user who signed in BEFORE this shipped still has
    // the old token. They must not be disturbed, and must not eat an extra
    // refresh round-trip on every page load.
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    localStorage.setItem(
      'poojly_session',
      JSON.stringify({ ...COOKIE_SESSION, accessToken: 'legacy-localstorage-token' }),
    );
    const calls = installFetch(() => ok({ success: true, session: COOKIE_SESSION }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('priest'));
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(0);
  });
});
