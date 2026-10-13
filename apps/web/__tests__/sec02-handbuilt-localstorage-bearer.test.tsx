/**
 * SEC-02 step 3 — the hand-built `localStorage['poojly_session'].accessToken`
 * readers.
 *
 * The access token cannot leave localStorage while files outside
 * lib/auth-context read it by hand: deleting the write logs those surfaces out
 * on the next page load. lib/auth-context.tsx names the blockers in a comment
 * (persistAuthStorage, and again in the revive branch) — app/org/{page,accept,
 * members,settings}, components/AartiOptIn, components/NotificationPrompt.
 *
 * This file pins the three that were migrated. Two properties, both of which
 * failed before the change:
 *
 *  1. NO hand-built token read. The component must never call
 *     `localStorage.getItem('poojly_session')` (or the older 'poojly_token').
 *     The token, while one still exists, comes from `useAuth()` — one owner,
 *     so step 4 changes one file instead of seven.
 *
 *  2. The request carries the cookie. `credentials: 'include'` is what lets
 *     the httpOnly `darshya_session` authenticate a browser that has no
 *     JS-readable token at all, which is the end state SEC-02 is aiming at.
 *     `fetch` defaults to 'same-origin' and the API is a different origin, so
 *     without it the cookie is simply not sent.
 *
 * A cookie-revived browser is modelled throughout: a signed-in user whose
 * session was reconstructed from the httpOnly cookie, so `useAuth()` reports
 * authenticated while localStorage holds no token. That browser exists today —
 * lib/auth-context's revive branch puts the revived session in memory only —
 * and it is exactly the browser these three files used to treat as signed out.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const authState = {
  session: null as { accessToken: string } | null,
  user: { id: 'u1', role: 'devotee' } as unknown,
  isAuthenticated: true,
  isLoading: false,
};

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>('../lib/auth-context');
  return { ...actual, useAuth: () => authState };
});

import OrgHubPage from '../app/org/page';
import AartiOptIn from '../components/AartiOptIn';
import { NotificationPrompt } from '../components/NotificationPrompt';

const TOKEN_KEYS = ['poojly_session', 'poojly_token'];

let getItemSpy: ReturnType<typeof vi.spyOn>;

function tokenKeysRead(): string[] {
  return getItemSpy.mock.calls.map((c) => String(c[0])).filter((k) => TOKEN_KEYS.includes(k));
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  authState.session = null;
  authState.isAuthenticated = true;
  authState.isLoading = false;
  window.localStorage.clear();
  // A browser that signed in BEFORE the migration still has this. Nothing
  // under test may reach for it — the point is that its presence stops
  // mattering, so that deleting the write is safe.
  window.localStorage.setItem(
    'poojly_session',
    JSON.stringify({ accessToken: 'stale-localstorage-token' }),
  );
  // Spy on the INSTANCE, not Storage.prototype. happy-dom's localStorage
  // carries its own `getItem`, so a prototype spy is never called — the first
  // version of this file did that and every "never reads the token" assertion
  // passed vacuously against the unmigrated code it was written to reject.
  // Proven by re-running against HEAD after the change: the same assertions go
  // red.
  getItemSpy = vi.spyOn(window.localStorage, 'getItem');
  expect(window.localStorage).toBe(globalThis.localStorage);
});

afterEach(() => {
  getItemSpy.mockRestore();
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

describe('SEC-02 — app/org/page.tsx', () => {
  it('sends the session cookie and never reads the localStorage token', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ orgs: [] }),
      } as unknown as Response),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<OrgHubPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(tokenKeysRead()).toEqual([]);
    // ...and with no in-memory token there is no Authorization header at all,
    // so the API's cookie fallback is what answers.
    const headers = new Headers((init.headers ?? {}) as HeadersInit);
    expect(headers.get('authorization')).toBeNull();
  });

  it('still sends the Bearer while auth-context has one in memory', async () => {
    // Mobile-shaped and transitional sessions must keep working: the migration
    // moves WHERE the token comes from, it does not drop it.
    authState.session = { accessToken: 'in-memory-token' };
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ orgs: [] }),
      } as unknown as Response),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<OrgHubPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const headers = new Headers(
      ((fetchMock.mock.calls[0][1] as RequestInit).headers ?? {}) as HeadersInit,
    );
    expect(headers.get('authorization')).toBe('Bearer in-memory-token');
    expect(tokenKeysRead()).toEqual([]);
  });
});

describe('SEC-02 — components/AartiOptIn.tsx', () => {
  it('never reads the localStorage token when enabling reminders', async () => {
    render(<AartiOptIn />);
    fireEvent.click(await screen.findByRole('button', { name: /enable reminders/i }));
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
    expect(tokenKeysRead()).toEqual([]);
  });

  it('still refuses, with the sign-in message, when nobody is signed in', async () => {
    authState.isAuthenticated = false;
    render(<AartiOptIn />);
    fireEvent.click(await screen.findByRole('button', { name: /enable reminders/i }));
    expect(await screen.findByText(/sign in to enable aarti reminders/i)).toBeTruthy();
    expect(tokenKeysRead()).toEqual([]);
  });
});

describe('SEC-02 — components/NotificationPrompt.tsx', () => {
  const stubPushEnv = () => {
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { register: vi.fn(), ready: Promise.resolve({}) },
    });
    (window as unknown as { PushManager: unknown }).PushManager = function PushManager() {};
    const N = Object.assign(function Notification() {}, {
      permission: 'default',
      requestPermission: vi.fn(),
    });
    (window as unknown as { Notification: unknown }).Notification = N;
    (globalThis as unknown as { Notification: unknown }).Notification = N;
  };

  it('prompts a cookie-revived user, who has no JS-readable token at all', async () => {
    // The gate used to be `if (!getAccessToken()) return;` — a localStorage
    // probe standing in for "is anyone signed in". A user revived from the
    // httpOnly cookie fails that probe and was never prompted, even though the
    // app knows perfectly well who they are.
    window.localStorage.removeItem('poojly_session');
    // The prompt now waits for a cookie-consent choice so it never stacks on the banner.
    window.localStorage.setItem(
      'darshya_cookie_consent_v1',
      JSON.stringify({ version: 1, acceptedAt: new Date().toISOString() }),
    );
    stubPushEnv();
    vi.useFakeTimers();
    render(<NotificationPrompt />);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(/darshan & festival reminders/i)).toBeTruthy();
    expect(tokenKeysRead()).toEqual([]);
  });

  it('does not prompt an anonymous visitor', async () => {
    authState.isAuthenticated = false;
    stubPushEnv();
    vi.useFakeTimers();
    render(<NotificationPrompt />);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText(/darshan & festival reminders/i)).toBeNull();
  });
});
