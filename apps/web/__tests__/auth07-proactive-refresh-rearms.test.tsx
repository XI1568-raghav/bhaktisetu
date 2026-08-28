/**
 * AUTH-07 — a failed proactive token refresh was silent AND terminal.
 *
 * The effect that refreshes the access token five minutes before expiry had
 * `if (res.ok) { … }` with no `else`, and an empty `catch`. So a refresh that
 * failed set no state at all — and because the effect re-arms only when its
 * dependencies change, and nothing changed, the timer was never scheduled
 * again. One failed refresh (a dyno cold start, a dropped Wi-Fi, a 502) meant
 * the session was never renewed, the token silently expired minutes later, and
 * the next action the user took 401'd with no explanation.
 *
 * Two things have to be true: a transient failure must be RETRIED, and a
 * refresh credential that is definitively dead must sign the user out visibly
 * instead of leaving a token in place that 401s everything they touch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';

const realFetch = globalThis.fetch;

const USER = {
  id: 'user-77',
  phone: '+919876500000',
  fullName: 'Real Devotee',
  email: 'real-user@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  role: 'devotee',
};

/**
 * A session that is still valid (so mount does not refresh immediately) but
 * whose proactive refresh point has already passed, so the timer clamps to its
 * 10s floor and the test can drive it.
 */
function seedSession(msUntilExpiry: number) {
  localStorage.setItem(
    'poojly_session',
    JSON.stringify({
      accessToken: 'server-access-token',
      refreshToken: 'server-refresh-token',
      expiresIn: 3600,
      expiresAt: Date.now() + msUntilExpiry,
    }),
  );
  localStorage.setItem('poojly_user', JSON.stringify(USER));
}

// SEC-02 step 4: the access token is no longer written to localStorage, so
// "did the retried refresh actually replace the token?" has to be read where
// the token now lives — React state.
let authState: { isAuthenticated: boolean; accessToken: string | null } = {
  isAuthenticated: false,
  accessToken: null,
};

function Probe() {
  const auth = useAuth();
  useEffect(() => {
    authState = {
      isAuthenticated: auth.isAuthenticated,
      accessToken: auth.session?.accessToken ?? null,
    };
  }, [auth.isAuthenticated, auth.session?.accessToken]);
  return <span data-testid="state">{auth.isLoading ? 'loading' : 'ready'}</span>;
}

async function mountAndSettle() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}

beforeEach(() => {
  localStorage.clear();
  authState = { isAuthenticated: false, accessToken: null };
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('AUTH-07 — the refresh timer re-arms after a failure', () => {
  it('retries after a network failure instead of giving up forever', async () => {
    seedSession(4 * 60_000); // valid now, refresh point already passed
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    await mountAndSettle();

    // First proactive attempt (10s floor).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });
    expect(calls.filter((u) => u.includes('/auth/refresh')).length).toBe(1);

    // Pre-fix this was the end of it: no state changed, so the effect never
    // re-armed and the session quietly died at expiry.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(calls.filter((u) => u.includes('/auth/refresh')).length).toBeGreaterThan(1);
  });

  it('retries a 502 and then succeeds, keeping the user signed in', async () => {
    seedSession(4 * 60_000);
    let attempt = 0;
    globalThis.fetch = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) return new Response('<html>502</html>', { status: 502 });
      return new Response(
        JSON.stringify({
          success: true,
          session: {
            accessToken: 'fresh-token',
            refreshToken: 'fresh-refresh',
            expiresIn: 3600,
            expiresAt: Date.now() + 3600_000,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    await mountAndSettle();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });

    expect(attempt).toBeGreaterThan(1);
    expect(authState.isAuthenticated).toBe(true);
    // REWRITTEN 2026-08-28 (SEC-02 step 4). This used to read the refreshed
    // token back out of `localStorage['poojly_session']`; that write is gone,
    // deliberately, because a JS-readable copy of the access token is the whole
    // finding. The property being guarded is unchanged and is asserted at full
    // strength: the retry did not merely stop erroring, it installed the NEW
    // token, so the next request goes out with a live credential.
    expect(authState.accessToken).toBe('fresh-token');
  });

  it('signs the user out visibly when the refresh credential is rejected', async () => {
    seedSession(4 * 60_000);
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Refresh token replay detected.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    await mountAndSettle();
    expect(authState.isAuthenticated).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });

    // A 401 on refresh is definitive. Leaving the dead token in place made
    // every subsequent action 401 with no explanation; sign out instead.
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.accessToken).toBeNull();
    expect(localStorage.getItem('poojly_session')).toBeNull();
    // The profile marker must go too, or middleware.ts keeps waving this
    // signed-out browser into the portal shell.
    expect(localStorage.getItem('poojly_user')).toBeNull();
  });

  it('does not retry forever — it stops once the token itself has expired', async () => {
    seedSession(70_000); // ~70s of life left
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    await mountAndSettle();
    // Advanced in separate act() blocks so React commits the state change that
    // re-arms the timer between rounds, the way a real tab does.
    for (let i = 0; i < 8; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
    }

    const attempts = calls.filter((u) => u.includes('/auth/refresh')).length;
    expect(attempts).toBeGreaterThan(0);
    expect(attempts).toBeLessThan(20);
    // Once the access token is past its own expiry and refresh still fails,
    // the honest state is signed out — not a session object holding a token
    // the API will reject.
    expect(authState.isAuthenticated).toBe(false);
  });
});
