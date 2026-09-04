/**
 * AUTH-04 — nothing in the product could request a sign-in link.
 *
 * `POST /auth/magic-link/request` exists and works. Nothing in apps/web ever
 * called it. The only recovery surface, /auth/forgot-password, called Supabase
 * `resetPasswordForEmail` — which does nothing for an account that has no
 * password to reset.
 *
 * That is the entire partnerships pipeline. A pandit or temple manager approved
 * through admin-leads is provisioned with NO password (there is no password
 * column on User) and mailed a 72-hour magic link. When that link lapses — and
 * it is sent to somebody who applied days earlier and is not sitting at their
 * laptop — the product offers them a password reset for a password they never
 * had, promises "we've sent a link", and sends nothing. Locked out permanently,
 * with the page telling them help is on the way.
 *
 * These tests bind the door being open at all.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

function type(el: HTMLElement, value: string) {
  fireEvent.change(el, { target: { value } });
}

const resetPasswordForEmail = vi.fn(async () => ({ error: null }));

vi.mock('../../../../lib/supabase', () => ({
  getSupabaseBrowserClient: () => ({ auth: { resetPasswordForEmail } }),
}));

import ForgotPasswordPage from '../page';

const realFetch = globalThis.fetch;

function installFetchSpy(status = 200, body: unknown = { ok: true }) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return calls;
}

beforeEach(() => {
  resetPasswordForEmail.mockClear();
  installFetchSpy();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('AUTH-04 — a sign-in link can be requested from the product', () => {
  it('offers a sign-in-link option to accounts that have no password', async () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('button', { name: /sign-in link/i })).toBeTruthy();
  });

  it('calls POST /auth/magic-link/request with the typed email', async () => {
    const calls = installFetchSpy();
    render(<ForgotPasswordPage />);

    type(screen.getByLabelText(/email/i), 'temple-manager@example.com');
    fireEvent.click(screen.getByRole('button', { name: /sign-in link/i }));

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]!.url).toContain('/auth/magic-link/request');
    expect(calls[0]!.init.method).toBe('POST');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      email: 'temple-manager@example.com',
    });
    // The magic-link path must not also fire a password reset for an account
    // that has no password — two emails, one of which can never arrive.
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('confirms without leaking whether the address is registered', async () => {
    installFetchSpy(200, { ok: true });
    render(<ForgotPasswordPage />);

    type(screen.getByLabelText(/email/i), 'nobody@example.com');
    fireEvent.click(screen.getByRole('button', { name: /sign-in link/i }));

    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeTruthy());
    expect(screen.getByText(/if an account exists/i)).toBeTruthy();
  });

  it('does not turn a server failure into an enumeration oracle', async () => {
    installFetchSpy(500, { error: 'Could not send email' });
    render(<ForgotPasswordPage />);

    type(screen.getByLabelText(/email/i), 'someone@example.com');
    fireEvent.click(screen.getByRole('button', { name: /sign-in link/i }));

    // Same confirmation copy either way — a 500 from Resend and an unknown
    // address must be indistinguishable from outside.
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeTruthy());
  });

  it('rejects a malformed address before calling anything', async () => {
    const calls = installFetchSpy();
    render(<ForgotPasswordPage />);

    type(screen.getByLabelText(/email/i), 'not-an-email');
    fireEvent.click(screen.getByRole('button', { name: /sign-in link/i }));

    await waitFor(() => expect(screen.getByText(/valid email/i)).toBeTruthy());
    expect(calls.length).toBe(0);
  });

  it('still sends a password reset through the original button', async () => {
    render(<ForgotPasswordPage />);

    type(screen.getByLabelText(/email/i), 'devotee@example.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalled());
    expect(resetPasswordForEmail.mock.calls[0]![0]).toBe('devotee@example.com');
  });
});
