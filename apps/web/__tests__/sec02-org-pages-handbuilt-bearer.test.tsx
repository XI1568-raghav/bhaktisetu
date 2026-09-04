/**
 * SEC-02 step 3, second half — the three hand-built
 * `localStorage['poojly_session'].accessToken` readers that were left when
 * app/org/page.tsx, components/AartiOptIn and components/NotificationPrompt
 * were migrated:
 *
 *   app/org/accept/page.tsx, app/org/members/page.tsx, app/org/settings/page.tsx
 *
 * These three are the ONLY reason `persistAuthStorage` still wrote the access
 * token to localStorage. lib/auth-context.tsx said so in two comments, and the
 * grep agreed: nothing else outside that module reached for the key. Step 4 —
 * deleting the write — is unsafe while any of them remains, because each one
 * would log its own page out on the next load.
 *
 * Two properties per page, both of which failed before the change:
 *
 *  1. NO hand-built token read. `localStorage.getItem('poojly_session')` (and
 *     the older 'poojly_token') must never be called. The token, while one
 *     still exists at all, comes from `useAuth()`.
 *  2. The request carries the cookie. `credentials: 'include'` is what lets
 *     the httpOnly `darshya_session` authenticate a browser with no
 *     JS-readable token. `fetch` defaults to 'same-origin' and the API is a
 *     different origin, so without it the cookie is simply not sent.
 *
 * The browser modelled throughout is the cookie-revived one: `useAuth()`
 * reports authenticated, localStorage holds a STALE token from before the
 * migration, and nothing under test may reach for it. That browser exists
 * today — lib/auth-context's revive branch keeps the revived session in memory
 * only — and it is exactly the browser these three files treated as signed out.
 *
 * The localStorage spy is on the INSTANCE, not Storage.prototype: happy-dom's
 * localStorage carries its own `getItem`, so a prototype spy is never called
 * and every "never reads the token" assertion would pass vacuously against the
 * unmigrated code it is written to reject. Proven by running this file against
 * the pre-migration pages — see the RED evidence in the finding.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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

const searchParams = new URLSearchParams();
const pushSpy = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/org',
}));

import AcceptInvitePage from '../app/org/accept/page';
import OrgMembersPage from '../app/org/members/page';
import OrgSettingsPage from '../app/org/settings/page';

const TOKEN_KEYS = ['poojly_session', 'poojly_token'];

let getItemSpy: ReturnType<typeof vi.spyOn>;

function tokenKeysRead(): string[] {
  return getItemSpy.mock.calls.map((c) => String(c[0])).filter((k) => TOKEN_KEYS.includes(k));
}

const originalFetch = globalThis.fetch;

function jsonOk(body: unknown) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => body,
    } as unknown as Response),
  );
}

beforeEach(() => {
  authState.session = null;
  authState.isAuthenticated = true;
  authState.isLoading = false;
  pushSpy.mockClear();
  for (const k of Array.from(searchParams.keys())) searchParams.delete(k);
  window.localStorage.clear();
  // A browser that signed in BEFORE the migration still holds this. The point
  // of the change is that its presence stops mattering, so that deleting the
  // write in lib/auth-context is safe.
  window.localStorage.setItem(
    'poojly_session',
    JSON.stringify({ accessToken: 'stale-localstorage-token' }),
  );
  getItemSpy = vi.spyOn(window.localStorage, 'getItem');
  expect(window.localStorage).toBe(globalThis.localStorage);
});

afterEach(() => {
  getItemSpy.mockRestore();
  globalThis.fetch = originalFetch;
});

describe('SEC-02 — app/org/accept/page.tsx', () => {
  it('sends the session cookie and never reads the localStorage token', async () => {
    searchParams.set('token', 'invite-abc');
    const fetchMock = jsonOk({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AcceptInvitePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(tokenKeysRead()).toEqual([]);
    const headers = new Headers((init.headers ?? {}) as HeadersInit);
    expect(headers.get('authorization')).toBeNull();
  });

  it('still sends the Bearer while auth-context has one in memory', async () => {
    searchParams.set('token', 'invite-abc');
    authState.session = { accessToken: 'in-memory-token' };
    const fetchMock = jsonOk({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AcceptInvitePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const headers = new Headers(
      ((fetchMock.mock.calls[0][1] as RequestInit).headers ?? {}) as HeadersInit,
    );
    expect(headers.get('authorization')).toBe('Bearer in-memory-token');
    expect(tokenKeysRead()).toEqual([]);
  });
});

describe('SEC-02 — app/org/members/page.tsx', () => {
  it('sends the session cookie on the member list and reads no token', async () => {
    searchParams.set('org', 'org-1');
    const fetchMock = jsonOk({ members: [] });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<OrgMembersPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(tokenKeysRead()).toEqual([]);
  });

  it('sends the session cookie on the invite POST too', async () => {
    // The write paths matter more than the read: an invite that silently 401s
    // is a teammate who never arrives.
    searchParams.set('org', 'org-1');
    const fetchMock = jsonOk({ members: [] });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<OrgMembersPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('trustee@trust.org'), {
      target: { value: 'trustee@trust.org' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).includes('/invite')),
      ).toBe(true),
    );
    const inviteCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/invite'))!;
    const init = inviteCall[1] as RequestInit;
    expect(init.credentials).toBe('include');
    // Content-Type must survive the header merge — the API rejects a JSON body
    // announced as anything else.
    const headers = new Headers((init.headers ?? {}) as HeadersInit);
    expect(headers.get('content-type')).toBe('application/json');
    expect(tokenKeysRead()).toEqual([]);
  });
});

describe('SEC-02 — app/org/settings/page.tsx', () => {
  it('sends the session cookie on plan-status and reads no token', async () => {
    searchParams.set('org', 'org-1');
    const fetchMock = jsonOk({ plan: 'free', templeCount: 0, templeLimit: 1, atLimit: false });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<OrgSettingsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(tokenKeysRead()).toEqual([]);
    const headers = new Headers((init.headers ?? {}) as HeadersInit);
    expect(headers.get('authorization')).toBeNull();
  });
});
