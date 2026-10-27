/**
 * The signup confirmation screen follows the API's `user.status`:
 * 'pending_approval' (REQUIRE_PROVIDER_APPROVAL on) may mention a team review;
 * 'active' (the default, approval off) must never promise one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return { ...actual, useRouter: () => ({ replace, push: replace, prefetch: vi.fn(), back: vi.fn() }), usePathname: () => '/auth/signup' };
});

import { AuthProvider } from '../lib/auth-context';
import SignupPage from '../app/auth/signup/page';

const realFetch = globalThis.fetch;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockRegister(status: 'active' | 'pending_approval') {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/auth/register')) {
      return json(201, {
        session: null,
        user: { id: 'u-1', email: 'p@example.com', fullName: 'Pandit Test', role: 'pandit', status },
        message: status === 'active' ? 'Account created. Your portal is ready; complete your profile to go live.' : 'Account created. Your profile is pending approval.',
      });
    }
    return json(404, {});
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  replace.mockClear();
  localStorage.clear();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

async function submitPanditSignup() {
  render(
    <AuthProvider>
      <SignupPage />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText('Pandit')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Pandit'));
  fireEvent.click(screen.getByRole('button', { name: /Continue as/ }));
  const set = (sel: string, value: string) => fireEvent.change(document.querySelector(sel) as HTMLInputElement, { target: { value } });
  await waitFor(() => expect(document.querySelector('input[name="name"]')).toBeTruthy());
  set('input[name="name"]', 'Pandit Test');
  set('input[name="email"]', 'p@example.com');
  set('input[name="password"]', 'Passw0rd!x1');
  set('input[placeholder="e.g. 10"]', '10');
  fireEvent.click(screen.getByRole('button', { name: 'Satyanarayan Puja' }));
  const boxes = document.querySelectorAll('input[type="checkbox"]');
  fireEvent.click(boxes[boxes.length - 1]!);
  fireEvent.click(screen.getByRole('button', { name: /Create Account/ }));
  await waitFor(() => expect(screen.getByText('Verify your email')).toBeInTheDocument());
}

describe('signup confirmation follows user.status', () => {
  it('approval off (status active): no review wording', async () => {
    mockRegister('active');
    await submitPanditSignup();
    expect(document.body.textContent).not.toMatch(/reviewed by our team|under review|pending approval/i);
  });

  it('approval on (status pending_approval): says the profile is reviewed before going live', async () => {
    mockRegister('pending_approval');
    await submitPanditSignup();
    expect(document.body.textContent).toMatch(/reviewed by our team before it goes live/);
  });
});
