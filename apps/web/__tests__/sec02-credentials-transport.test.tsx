/**
 * SEC-02 — the httpOnly cookie is issued, but almost nothing ever SENDS it.
 *
 * A previous pass got POST /auth/login to run in credentials mode, so a browser
 * that signs in with email + password now actually STORES `darshya_session`
 * (httpOnly, path=/) and `darshya_refresh`. The API has accepted that cookie as
 * a credential since #200 — `extractBearerToken` in
 * apps/api/src/middlewares/auth.ts falls back to it.
 *
 * The cookie was still dead weight, because the web never sent it back. The web
 * is served from https://darshya.online and the API from
 * https://api.darshya.online — every API call is CROSS-ORIGIN, and `fetch`
 * defaults to `credentials: 'same-origin'`, which omits cookies outright on a
 * cross-origin request. Four call sites in lib/auth-context.tsx opted in by
 * hand; the other ~96 that go through `fetchWithTimeout` did not. So the
 * localStorage access token stayed the ONLY credential that actually
 * authenticated anything, which is the whole of SEC-02.
 *
 * The transport default is the fix that scales: `fetchWithTimeout` is the one
 * chokepoint every timed fetch in apps/web already goes through (100 call
 * sites), each of them aimed at API_BASE_URL — verified: no call site passes a
 * third-party origin, so no request starts sending cookies to someone else.
 * CORS is registered with `credentials: true` against an explicit origin
 * allowlist and never `*` (apps/api/src/lib/cors-origins.ts), which is the
 * server-side precondition for credentials mode.
 *
 * This does NOT by itself retire the localStorage token — the Bearer header is
 * still attached and still works, deliberately, because dropping it before
 * every reader migrates would sign everyone out. What it does is make the
 * cookie a WORKING parallel credential for the first time, which is the step
 * every remaining piece of SEC-02 is blocked behind.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { fetchWithTimeout } from '../lib/api-config';
import { AuthProvider, useAuth } from '../lib/auth-context';

const realFetch = globalThis.fetch;

const API_USER = {
  id: 'user-91',
  phone: '+919812345678',
  fullName: 'Cookie Devotee',
  email: 'cookie@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  role: 'devotee',
};

const API_SESSION = {
  accessToken: 'access-token-91',
  refreshToken: 'refresh-token-91',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
};

/** Records the init every outgoing fetch was given. */
function installFetchSpy() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ session: API_SESSION, user: API_USER, message: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return calls;
}

type Auth = ReturnType<typeof useAuth>;
let auth: Auth | null = null;

function Probe() {
  const value = useAuth();
  useEffect(() => {
    auth = value;
  }, [value]);
  return <span data-testid="state">{value.isLoading ? 'loading' : 'ready'}</span>;
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
  auth = null;
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

describe('SEC-02 — the shared transport sends the httpOnly auth cookie', () => {
  it('fetchWithTimeout defaults to credentials mode', async () => {
    const calls = installFetchSpy();
    await fetchWithTimeout('https://api.darshya.online/api/v1/priest/bookings');

    expect(calls).toHaveLength(1);
    expect(
      calls[0]!.init.credentials,
      "a cross-origin fetch in the default 'same-origin' mode omits darshya_session entirely, " +
        'so the JS-readable localStorage Bearer stays the only credential that works',
    ).toBe('include');
  });

  it('does not override a call site that asked for a different credentials mode', async () => {
    const calls = installFetchSpy();
    await fetchWithTimeout('https://api.darshya.online/api/v1/public/thing', {
      credentials: 'omit',
    });
    expect(calls[0]!.init.credentials).toBe('omit');
  });

  it('still applies its abort signal — the RES-01 timeout must not be lost', async () => {
    const calls = installFetchSpy();
    await fetchWithTimeout('https://api.darshya.online/api/v1/anything');
    expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal);
  });

  it('mints a session in credentials mode on the OTP door', async () => {
    const calls = installFetchSpy();
    await mountProvider();
    await act(async () => {
      await auth!.verifyOtp('+919812345678', '123456');
    });

    const call = calls.find((c) => c.url.endsWith('/auth/verify-otp'));
    expect(call, 'verifyOtp never reached POST /auth/verify-otp').toBeTruthy();
    expect(
      call!.init.credentials,
      'phone sign-in is a session-minting door like /login; outside credentials mode the ' +
        'browser discards whatever Set-Cookie the API answers with',
    ).toBe('include');
  });

  it('mints a session in credentials mode on the sign-up door', async () => {
    const calls = installFetchSpy();
    await mountProvider();
    await act(async () => {
      await auth!.signUpWithCredentials({
        fullName: 'Cookie Devotee',
        email: 'cookie@example.com',
        phone: '+919812345678',
        password: 'a-real-password',
        role: 'devotee',
      });
    });

    const call = calls.find((c) => c.url.endsWith('/auth/register'));
    expect(call, 'signUpWithCredentials never reached POST /auth/register').toBeTruthy();
    expect(call!.init.credentials).toBe('include');
  });

  it('re-hydrates the profile in credentials mode so the cookie can authenticate it', async () => {
    const calls = installFetchSpy();
    await mountProvider();
    await act(async () => {
      await auth!.signInWithCredentials('cookie@example.com', 'a-real-password');
    });
    await act(async () => {
      await auth!.refreshUser();
    });

    const call = calls.find((c) => c.url.endsWith('/auth/me'));
    expect(call, 'refreshUser never reached GET /auth/me').toBeTruthy();
    expect(
      call!.init.credentials,
      'GET /auth/me is the one read that must survive the localStorage token going away',
    ).toBe('include');
  });

  it('does not put any token into a JS-readable cookie (A-007 must not regress)', async () => {
    installFetchSpy();
    await mountProvider();
    await act(async () => {
      await auth!.signInWithCredentials('cookie@example.com', 'a-real-password');
    });
    expect(document.cookie).not.toContain(API_SESSION.accessToken);
    expect(document.cookie).not.toContain(API_SESSION.refreshToken);
  });
});
