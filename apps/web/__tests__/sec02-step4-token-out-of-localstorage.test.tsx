/**
 * SEC-02 step 4 — the access token stops being written to localStorage.
 *
 * This is the finding itself, not a preparation for it. Steps 1-3 existed only
 * to make this line safe to delete:
 *
 *   step 1  the API accepts the httpOnly `darshya_session` cookie      (#200)
 *   step 2  a token-free browser can COME BACK — /auth/refresh for Supabase
 *           sessions, POST /auth/session/revive for magic-link/email ones
 *   step 3  no file outside lib/auth-context reads
 *           `localStorage['poojly_session'].accessToken` by hand any more
 *
 * With all three done, `persistAuthStorage` writing the token is pure exposure:
 * any XSS on darshya.online could read it and act as that user until it expired.
 *
 * THREE PROPERTIES ARE PINNED HERE, and each failed before the change.
 *
 * 1. THE WRITE IS GONE, and a token left over from an older build is actively
 *    REMOVED rather than left to rot. A browser that signed in last week must
 *    converge on cookie-only; leaving the stale copy behind would keep the
 *    exposure for the life of the entry.
 *
 * 2. A TRANSIENT API FAILURE MUST NOT SIGN ANYONE OUT. This is new risk created
 *    by the change and it is the reason it needs its own guard. Before step 4,
 *    only a browser with no local token took the revive branch; after it, EVERY
 *    signed-in browser does, on every cold load. The old branch cleared the
 *    `poojly_user` marker whenever revive returned null — and revive returns
 *    null both for "your cookies are dead" and for "the API did not answer".
 *    On Render's free tier a cold dyno routinely exceeds the 20s fetch budget,
 *    so keeping that behaviour would have logged real users out for the sole
 *    reason that the server was waking up. The marker is now cleared only when
 *    the API actually REFUSED — an HTTP response, not a transport failure.
 *
 * 3. DEMO SESSIONS ARE THE ONE CARVE-OUT, and it is compile-time dead in
 *    production. A `demo-*` token is minted locally by lib/auth-context itself,
 *    has no cookie behind it and therefore nothing to revive from, and is not a
 *    credential the API honours in production at all. Persisting it outside
 *    production keeps the demo walkthrough surviving a reload; the branch tests
 *    NODE_ENV first so Terser folds it away in the real bundle.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, persistAuthStorage, useAuth } from '../lib/auth-context';

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

const SESSION = {
  accessToken: 'real-access-token',
  refreshToken: 'real-refresh-token',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
};

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

describe('SEC-02 step 4 — persistAuthStorage no longer writes the token', () => {
  it('stores the profile and NOT the session', () => {
    persistAuthStorage(SESSION as never, PROFILE as never);

    expect(
      localStorage.getItem('poojly_session'),
      'the access token in localStorage is the finding: any XSS reads it and ' +
        'acts as this user until it expires',
    ).toBeNull();
    // The token cookie is not an acceptable substitute either — A-007 removed
    // it precisely because the browser then attached the token to every
    // same-origin navigation, RSC payload and static asset.
    expect(cookieValue('poojly_session')).toBeNull();

    // ...while the token-free profile marker still lands in BOTH stores:
    // middleware.ts gates the portals on the cookie, and lib/session-revive
    // reads either one to decide whether this browser is worth reviving.
    expect(JSON.parse(localStorage.getItem('poojly_user')!)).toEqual(PROFILE);
    expect(JSON.parse(cookieValue('poojly_user')!)).toEqual(PROFILE);
  });

  it('removes a token left behind by an older build', () => {
    localStorage.setItem('poojly_session', JSON.stringify({ accessToken: 'legacy-token' }));

    persistAuthStorage(SESSION as never, PROFILE as never);

    expect(
      localStorage.getItem('poojly_session'),
      'a browser that signed in before this shipped must converge on ' +
        'cookie-only rather than keep the old copy for its full lifetime',
    ).toBeNull();
  });

  it('still keeps demo sessions, which have no cookie to revive from', () => {
    // Dev/demo only — the branch reads NODE_ENV first so it folds away in the
    // production bundle. A `demo-*` token is minted locally, is refused by the
    // API in production, and is the one session with nothing behind it.
    persistAuthStorage(
      { ...SESSION, accessToken: 'demo-priest-token' } as never,
      PROFILE as never,
    );
    expect(JSON.parse(localStorage.getItem('poojly_session')!).accessToken).toBe(
      'demo-priest-token',
    );
  });

  it('clears both stores on sign-out, as before', () => {
    persistAuthStorage(SESSION as never, PROFILE as never);
    persistAuthStorage(null, null);
    expect(localStorage.getItem('poojly_user')).toBeNull();
    expect(cookieValue('poojly_user')).toBeNull();
    expect(localStorage.getItem('poojly_session')).toBeNull();
    expect(cookieValue('poojly_session')).toBeNull();
  });
});

describe('SEC-02 step 4 — an unreachable API must not sign anyone out', () => {
  it('keeps the profile marker when the revive request never gets an answer', async () => {
    // Every signed-in browser takes the revive branch now, so a cold Render
    // dyno that exceeds the fetch budget would otherwise log the whole user
    // base out. `fetch` rejecting is "we do not know", not "you are signed out".
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    document.cookie = `poojly_user=${encodeURIComponent(JSON.stringify(PROFILE))}; path=/`;
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
    expect(
      localStorage.getItem('poojly_user'),
      'the marker is this browser’s only record that it has a session ' +
        'worth reviving — dropping it on a network blip is a permanent sign-out',
    ).not.toBeNull();
    expect(cookieValue('poojly_user')).not.toBeNull();
  });

  it('keeps the marker when only ONE of the two revive doors answered', async () => {
    // /auth/refresh refusing is normal and expected for a magic-link browser —
    // it holds no `darshya_refresh` cookie at all. The verdict belongs to the
    // email-session door, and a transport failure there is not a verdict.
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/refresh')) {
        return new Response(JSON.stringify({ error: 'BadRequest' }), { status: 400 });
      }
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
    expect(localStorage.getItem('poojly_user')).not.toBeNull();
  });

  it('still clears the marker when both doors REFUSE', async () => {
    // The dead-cookie case is unchanged: middleware.ts gates every portal on
    // the mere presence of this marker, so a genuinely signed-out visitor must
    // stop carrying it or they keep getting the portal shell.
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    document.cookie = `poojly_user=${encodeURIComponent(JSON.stringify(PROFILE))}; path=/`;
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: 'BadRequest' }), { status: 400 }),
    ) as unknown as typeof fetch;

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
    expect(localStorage.getItem('poojly_user')).toBeNull();
    expect(cookieValue('poojly_user')).toBeNull();
  });
});
