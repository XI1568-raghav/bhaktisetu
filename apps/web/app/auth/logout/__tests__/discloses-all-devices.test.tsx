/**
 * AUTH-09 — signing out on one device signs the user out of every device, and
 * nothing in the product said so.
 *
 * POST /auth/logout is global: `supabase.auth.signOut()` defaults to global
 * scope and the handler burns every `refresh_token_jtis` row the user holds.
 * That is a defensible default — it is the right behaviour on a shared or lost
 * device — but a user who signs out of a library computer and finds their phone
 * logged out has been surprised by their own security tool. The API now names
 * the scope it applied; this screen has to say it in words before the user acts
 * on the result.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const signOut = vi.fn(async () => undefined);
const replace = vi.fn();

vi.mock('../../../../lib/auth-context', () => ({
  useAuth: () => ({ signOut }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

import LogoutPage from '../page';

describe('AUTH-09 — the sign-out screen says it is signing you out everywhere', () => {
  it('names the multi-device effect rather than implying one device', () => {
    render(<LogoutPage />);
    const copy = document.body.textContent ?? '';
    expect(copy).toMatch(/all your devices|every device|all devices/i);
  });

  it('still runs the sign-out', () => {
    render(<LogoutPage />);
    expect(signOut).toHaveBeenCalled();
  });

  it('does not claim something narrower than what happens', () => {
    render(<LogoutPage />);
    const copy = document.body.textContent ?? '';
    expect(copy).not.toMatch(/only this device|this device only/i);
    expect(screen.getByText(/signing you out/i)).toBeTruthy();
  });
});
