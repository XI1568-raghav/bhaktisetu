/**
 * AUTH-11 — "You've been signed out everywhere" was not true.
 *
 * After a successful password change the page called `supabase.auth.signOut()`
 * and `persistAuthStorage(null, null)`. Neither touches the API. The API issues
 * two httpOnly cookies at sign-in — `darshya_session` (the access token, 1h)
 * and `darshya_refresh` — and `apps/api/src/middlewares/auth.ts` accepts
 * `darshya_session` as a credential on its own. Nothing in this flow cleared
 * them, so the browser kept a working API credential for up to an hour after
 * the user was told every session had ended. POST /auth/logout is what clears
 * those cookies and revokes the server-side session; it was never called.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const signOut = vi.fn(async () => ({ error: null }));
const updateUser = vi.fn(async () => ({ error: null }));
const getSession = vi.fn(async () => ({ data: { session: { access_token: 'recovery-token' } } }));
const onAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock('../../../../lib/supabase', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { signOut, updateUser, getSession, onAuthStateChange },
  }),
}));

import ResetPasswordPage from '../page';

const realFetch = globalThis.fetch;

function installFetchSpy() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return calls;
}

async function arriveWithRecoveryLink() {
  window.history.replaceState({}, '', '/auth/reset-password#type=recovery&access_token=abc');
  render(<ResetPasswordPage />);
  await waitFor(() => expect(screen.getByText(/choose a new password/i)).toBeTruthy());
}

async function submitNewPassword() {
  fireEvent.change(screen.getByLabelText(/new password/i), {
    target: { value: 'newpassword1' },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: 'newpassword1' },
  });
  fireEvent.click(screen.getByRole('button', { name: /update password/i }));
}

beforeEach(() => {
  signOut.mockClear();
  updateUser.mockClear();
  localStorage.clear();
  installFetchSpy();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('AUTH-11 — the password reset actually ends the API session', () => {
  it('calls POST /auth/logout so the httpOnly cookies are cleared', async () => {
    const calls = installFetchSpy();
    await arriveWithRecoveryLink();
    await submitNewPassword();

    await waitFor(() => expect(screen.getByText(/password updated/i)).toBeTruthy());

    const logout = calls.find((c) => c.url.includes('/auth/logout'));
    expect(logout).toBeTruthy();
    // Cross-origin: without credentials mode the browser never SENDS
    // darshya_session, so the API cannot identify the session to clear, and it
    // never STORES the expiring Set-Cookie headers that come back either.
    expect(logout!.init.credentials).toBe('include');
    expect(logout!.init.method).toBe('POST');
  });

  it('sends the session token with scope=global so a cookie-less browser still signs out other devices', async () => {
    const calls = installFetchSpy();
    await arriveWithRecoveryLink();
    await submitNewPassword();

    await waitFor(() => expect(screen.getByText(/password updated/i)).toBeTruthy());
    const logout = calls.find((c) => c.url.includes('/auth/logout'));
    expect(JSON.parse(String(logout!.init.body))).toEqual({
      accessToken: 'recovery-token',
      scope: 'global',
    });
  });

  it('still clears the local stores and the Supabase session', async () => {
    localStorage.setItem('poojly_session', JSON.stringify({ accessToken: 'x' }));
    localStorage.setItem('poojly_user', JSON.stringify({ id: 'u1' }));
    await arriveWithRecoveryLink();
    await submitNewPassword();

    await waitFor(() => expect(screen.getByText(/password updated/i)).toBeTruthy());
    expect(signOut).toHaveBeenCalled();
    expect(localStorage.getItem('poojly_session')).toBeNull();
    expect(localStorage.getItem('poojly_user')).toBeNull();
  });

  it('still reports success when the logout call itself fails', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    await arriveWithRecoveryLink();
    await submitNewPassword();

    // The password DID change. A best-effort logout that could not reach the
    // API must not present as a failed reset.
    await waitFor(() => expect(screen.getByText(/password updated/i)).toBeTruthy());
    expect(localStorage.getItem('poojly_session')).toBeNull();
  });
});
