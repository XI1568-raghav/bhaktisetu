/**
 * AUTH-09 — `useAuth().signOut()` could not express a scope, so no caller could
 * ever offer "just this device".
 *
 * The API half landed already: apps/api/src/routes/auth.ts `logoutSchema`
 * accepts `scope: 'local' | 'global'` and the handler only burns every
 * `refresh_token_jtis` row when the scope is global. The web half did not — the
 * context exposed `signOut: () => Promise<void>` and hardcoded a body of
 * `{ accessToken }`, so every sign-out anywhere in the product was global with
 * no way for a screen to choose otherwise.
 *
 * GLOBAL STAYS THE DEFAULT. Omitting the field is what an older client does and
 * the API reads that as global; flipping the web default to `local` would be a
 * silent security regression for a shared or lost device. What changes here is
 * that scope becomes SAYABLE: the argument is optional, so no existing caller
 * needs to change, and a screen that wants to offer the choice now can.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../../lib/auth-context';

type SignIn = (email: string, password: string) => Promise<{ success: boolean; message: string }>;
type SignOut = (options?: { scope?: 'local' | 'global' }) => Promise<void>;

const API_USER = {
  id: 'user-91',
  phone: '+919876500091',
  fullName: 'Scoped Devotee',
  email: 'scoped-user@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  role: 'devotee',
};

const API_SESSION = {
  accessToken: 'scoped-access-token',
  refreshToken: 'scoped-refresh-token',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
};

const realFetch = globalThis.fetch;

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
let signOutFn: SignOut | null = null;

function Probe() {
  const { signInWithCredentials, signOut, isLoading } = useAuth();
  useEffect(() => {
    signIn = signInWithCredentials;
    signOutFn = signOut as SignOut;
  }, [signInWithCredentials, signOut]);
  return <span data-testid="state">{isLoading ? 'loading' : 'ready'}</span>;
}

async function mountProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
}

/** Signs in for real (not a DEMO_ACCOUNTS email, which short-circuits offline). */
async function signedIn() {
  await mountProvider();
  await act(async () => {
    await signIn!('scoped-user@example.com', 'a-real-password');
  });
}

function logoutBody(calls: Array<{ url: string; init: RequestInit }>): Record<string, unknown> {
  const logout = calls.find((c) => c.url.endsWith('/auth/logout'));
  expect(logout, 'signOut never reached POST /auth/logout').toBeTruthy();
  return JSON.parse(String(logout!.init.body ?? '{}'));
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

describe('AUTH-09 — signOut can state its scope', () => {
  it("forwards scope:'local' so a caller can end only this device's session", async () => {
    const calls = installFetchSpy();
    await signedIn();

    await act(async () => {
      await signOutFn!({ scope: 'local' });
    });

    expect(
      logoutBody(calls).scope,
      "signOut() dropped the caller's scope, so the API applied its global default and " +
        'signed the user out of every device anyway',
    ).toBe('local');
  });

  it("forwards scope:'global' when the caller asks for it explicitly", async () => {
    const calls = installFetchSpy();
    await signedIn();

    await act(async () => {
      await signOutFn!({ scope: 'global' });
    });

    expect(logoutBody(calls).scope).toBe('global');
  });

  it('sends NO scope when called with no argument — global stays the default', async () => {
    // Backward compatibility is the security-relevant half here. Every existing
    // caller (NavAuthButton, the account menu, /auth/logout) invokes signOut()
    // bare; if that started meaning "local", a sign-out on a lost device would
    // quietly stop revoking the other sessions.
    const calls = installFetchSpy();
    await signedIn();

    await act(async () => {
      await signOutFn!();
    });

    const body = logoutBody(calls);
    expect(body.scope).toBeUndefined();
    expect(body.accessToken).toBe(API_SESSION.accessToken);
  });

  it('ignores a React MouseEvent — eight portals wire onClick={signOut} directly', async () => {
    // app/{admin,astrologer-portal,gaushala-portal,priest,store-admin,
    // temple-portal,wellness-portal}/layout.tsx and app/dashboard/page.tsx all
    // pass signOut straight to onClick, so the first argument is routinely a
    // DOM event and not an options bag. Reading `.scope` off it naively would
    // be harmless today only by luck; this pins that an event is IGNORED, so
    // those buttons keep their pre-existing global sign-out.
    const calls = installFetchSpy();
    await signedIn();

    const fakeEvent = { type: 'click', currentTarget: {}, preventDefault() {} };
    await act(async () => {
      await (signOutFn as unknown as (e: unknown) => Promise<void>)(fakeEvent);
    });

    expect(logoutBody(calls).scope).toBeUndefined();
  });

  it('refuses a scope value it does not recognise rather than forwarding it', async () => {
    // A typo must not become a wire value the API rejects (400 → the user is
    // left signed in on a device they meant to sign out of).
    const calls = installFetchSpy();
    await signedIn();

    await act(async () => {
      await (signOutFn as unknown as (o: unknown) => Promise<void>)({ scope: 'globl' });
    });

    expect(logoutBody(calls).scope).toBeUndefined();
  });

  it('clears the local session whichever scope was used', async () => {
    installFetchSpy();
    await signedIn();
    expect(localStorage.getItem('poojly_session')).toBeTruthy();

    await act(async () => {
      await signOutFn!({ scope: 'local' });
    });

    expect(localStorage.getItem('poojly_session')).toBeNull();
    expect(localStorage.getItem('poojly_user')).toBeNull();
  });

  it('still sends credentials so the API can clear the httpOnly cookies', async () => {
    const calls = installFetchSpy();
    await signedIn();

    await act(async () => {
      await signOutFn!({ scope: 'local' });
    });

    const logout = calls.find((c) => c.url.endsWith('/auth/logout'));
    expect(logout!.init.credentials).toBe('include');
  });
});
