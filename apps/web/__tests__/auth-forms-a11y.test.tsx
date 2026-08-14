/**
 * A11Y-06 / A11Y-07 — the credential forms.
 *
 * Measured on the live app (prod sweep 2026-08-12, /auth/login):
 *   {"sel":"input#email","type":"email","name":"Email Address",
 *    "from":"label[for]","autocomplete":null}
 *   {"sel":"input#password","type":"password","autocomplete":null}
 *   {"issue":"no-accessible-name","tag":"button","role":null,
 *    "html":"<button type=\"button\" class=\"text-surface-400 …\"><svg …"}
 *
 * A11Y-06 (WCAG 2.1 AA 1.3.5 Identify Input Purpose): no autocomplete and no
 * name attribute, so password managers and browser autofill cannot identify
 * the fields — every returning user retypes their credentials by hand.
 * A11Y-07 (WCAG 2.1 A 4.1.2 Name, Role, Value): the reveal toggle sits between
 * the password field and Sign In and is announced only as "button".
 *
 * /auth/signup carries the same two defects (it was outside the 7 pages the
 * sweep crawled) so it is asserted here too.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>(
    '../lib/auth-context',
  );
  return {
    ...actual,
    useAuth: () => ({
      signInWithCredentials: vi.fn(),
      signUpWithCredentials: vi.fn(),
      signInWithGoogle: vi.fn(),
      isAuthenticated: false,
      user: null,
      isLoading: false,
    }),
  };
});

vi.mock('../lib/supabase', () => ({
  getSupabaseBrowserClient: () => null,
}));

import LoginPage from '../app/auth/login/page';
import SignupPage from '../app/auth/signup/page';

beforeEach(() => {
  window.localStorage.clear();
});

/** Advance the signup wizard from role selection (step 0) to the form (step 1). */
function renderSignupForm() {
  render(<SignupPage />);
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

describe('A11Y-06 — credential inputs declare their input purpose', () => {
  it('login email input carries autocomplete="email" and a name', () => {
    render(<LoginPage />);
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(email.getAttribute('autocomplete')).toBe('email');
    expect(email.getAttribute('name')).toBe('email');
  });

  it('login password input carries autocomplete="current-password" and a name', () => {
    render(<LoginPage />);
    const password = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(password.getAttribute('autocomplete')).toBe('current-password');
    expect(password.getAttribute('name')).toBe('password');
  });

  it('signup email input carries autocomplete="email" and a name', () => {
    renderSignupForm();
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(email.getAttribute('autocomplete')).toBe('email');
    expect(email.getAttribute('name')).toBe('email');
  });

  it('signup password input asks for a NEW password, not the current one', () => {
    renderSignupForm();
    const password = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(password.getAttribute('autocomplete')).toBe('new-password');
    expect(password.getAttribute('name')).toBe('password');
  });

  it('signup name and phone inputs declare their purpose too', () => {
    renderSignupForm();
    expect(
      (screen.getByLabelText(/full name/i) as HTMLInputElement).getAttribute('autocomplete'),
    ).toBe('name');
    expect(
      (screen.getByLabelText(/mobile number/i) as HTMLInputElement).getAttribute('autocomplete'),
    ).toBe('tel');
  });
});

describe('A11Y-07 — the password-reveal toggle has a name, role and value', () => {
  it('login toggle is announced as "Show password" and flips to "Hide password"', () => {
    render(<LoginPage />);

    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: /hide password/i })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /hide password/i }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('login form exposes no unnamed button at all', () => {
    render(<LoginPage />);
    const unnamed = Array.from(document.querySelectorAll('button')).filter(
      (b) =>
        !b.getAttribute('aria-label') &&
        !b.getAttribute('aria-labelledby') &&
        !(b.textContent ?? '').trim(),
    );
    expect(
      unnamed.map((b) => b.outerHTML.slice(0, 120)),
      'every button must have an accessible name',
    ).toEqual([]);
  });

  it('signup toggle is announced as "Show password" and flips to "Hide password"', () => {
    renderSignupForm();

    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);

    expect(
      screen.getByRole('button', { name: /hide password/i }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
});
