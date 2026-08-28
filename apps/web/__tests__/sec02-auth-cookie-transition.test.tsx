/**
 * SEC-02 — the httpOnly session cookie the migration depends on was never
 * actually being stored by the browser.
 *
 * The finding's premise is that `darshya_session` "already exists and is
 * accepted as auth", so the localStorage Bearer can be retired. The server half
 * of that is true: apps/api/src/routes/auth.ts calls setAuthCookies() on
 * POST /login, apps/api/src/middlewares/auth.ts accepts the cookie, and CORS is
 * registered with `credentials: true` against an explicit origin allowlist
 * (never `*`, see lib/cors-origins.ts).
 *
 * The browser half was not. The web is served from https://darshya.online and
 * the API from https://api.darshya.online — a CROSS-ORIGIN request. `fetch`
 * defaults to `credentials: 'same-origin'`, and for a cross-origin request in
 * that mode the Fetch spec has the browser DISCARD the response's `Set-Cookie`
 * headers outright. So every email/password sign-in threw away both auth
 * cookies the API had just issued, and the JS-readable localStorage token
 * stayed the only working credential — which is precisely why SEC-02 could not
 * be closed. /refresh and /logout already sent `credentials: 'include'`;
 * /login, the primary door, did not.
 *
 * These tests bind to the two halves that matter:
 *   1. the login call must opt into credentials mode, or no cookie is ever set;
 *   2. sign-in must leave a WORKING session behind — the reason the localStorage
 *      copy could not simply be dropped.
 *
 * REWRITTEN 2026-08-28, SEC-02 step 4. Clause 2 used to read "the localStorage
 * session must STILL be written", and the test below was named "...the Bearer
 * path must not break yet". That contract is superseded, deliberately: the
 * hand-built Bearer readers it protected have all been migrated
 * (app/org/{page,accept,members,settings}, components/AartiOptIn,
 * components/NotificationPrompt), persistAuthStorage no longer writes the token
 * to any JS-readable store, and lib/session-revive brings a token-free browser
 * back from the httpOnly cookies. The PROPERTY the old assertion was really
 * defending — "after sign-in the app holds a usable access token, so nobody is
 * logged out on deploy" — is kept and now asserted where the token actually
 * lives: React state, via useAuth(). What changed is only that the token is no
 * longer readable by an injected script, which is the whole finding.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';

type SignIn = (email: string, password: string) => Promise<{ success: boolean; message: string }>;

const API_USER = {
  id: 'user-77',
  phone: '+919876500000',
  fullName: 'Real Devotee',
  email: 'real-user@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  role: 'devotee',
};

const API_SESSION = {
  accessToken: 'server-access-token',
  refreshToken: 'server-refresh-token',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
};

const realFetch = globalThis.fetch;

/** Captures every fetch init keyed by the path that was requested. */
function installFetchSpy() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ session: API_SESSION, user: API_USER }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return calls;
}

let signIn: SignIn | null = null;
let signOutFn: (() => Promise<void>) | null = null;

function Probe() {
  const { signInWithCredentials, signOut, isLoading, session } = useAuth();
  useEffect(() => {
    signIn = signInWithCredentials;
    signOutFn = signOut;
  }, [signInWithCredentials, signOut]);
  return (
    <>
      <span data-testid="state">{isLoading ? 'loading' : 'ready'}</span>
      {/* SEC-02 step 4: the access token lives in React state now, not in any
          store a script can read, so this is where "is the user still signed
          in?" has to be observed. */}
      <span data-testid="access-token">{session?.accessToken ?? ''}</span>
    </>
  );
}

async function mountProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
}

beforeEach(() => {
  signIn = null;
  signOutFn = null;
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

describe('SEC-02 — sign-in lets the browser keep the httpOnly auth cookies', () => {
  it('POST /auth/login is sent in credentials mode', async () => {
    const calls = installFetchSpy();
    await mountProvider();

    // Deliberately NOT one of the dev-only DEMO_ACCOUNTS emails: those
    // short-circuit before any network call and would prove nothing.
    await act(async () => {
      await signIn!('real-user@example.com', 'a-real-password');
    });

    const login = calls.find((c) => c.url.endsWith('/auth/login'));
    expect(login, 'signInWithCredentials never reached POST /auth/login').toBeTruthy();
    expect(
      login!.init.credentials,
      "without credentials:'include' a cross-origin fetch discards Set-Cookie, so " +
        'darshya_session / darshya_refresh are never stored and the localStorage ' +
        'Bearer stays the only credential',
    ).toBe('include');
  });

  it('leaves a usable session in memory and NOTHING in localStorage', async () => {
    installFetchSpy();
    await mountProvider();

    await act(async () => {
      await signIn!('real-user@example.com', 'a-real-password');
    });

    // The property the superseded assertion was defending: sign-in must not
    // leave the app without a credential, or the deploy logs everyone out.
    expect(
      screen.getByTestId('access-token'),
      'sign-in produced no usable access token at all — that IS the log-everyone-out failure',
    ).toHaveTextContent(API_SESSION.accessToken);

    // ...and the part that changed: it is no longer readable by an injected
    // script. This is SEC-02 itself, not a detail of it.
    expect(localStorage.getItem('poojly_session')).toBeNull();
  });

  it('never puts a token back into a JS-readable cookie (A-007 must not regress)', async () => {
    installFetchSpy();
    await mountProvider();

    await act(async () => {
      await signIn!('real-user@example.com', 'a-real-password');
    });

    expect(document.cookie).not.toContain(API_SESSION.accessToken);
    expect(document.cookie).not.toContain(API_SESSION.refreshToken);
  });

  it('sign-out reaches /auth/logout in credentials mode so the API can clear the cookies', async () => {
    const calls = installFetchSpy();
    await mountProvider();

    await act(async () => {
      await signIn!('real-user@example.com', 'a-real-password');
    });
    await act(async () => {
      await signOutFn!();
    });

    const logout = calls.find((c) => c.url.endsWith('/auth/logout'));
    expect(logout, 'signOut never reached POST /auth/logout').toBeTruthy();
    expect(
      logout!.init.credentials,
      'clearAuthCookies() on the API is a no-op if the browser never sends the cookie',
    ).toBe('include');
    expect(localStorage.getItem('poojly_session')).toBeNull();
  });
});
