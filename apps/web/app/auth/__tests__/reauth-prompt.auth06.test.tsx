/**
 * AUTH-06 — every 401 handler computed a `reauth` flag that nothing rendered.
 *
 * `friendlyApiError` has returned `{ message, reauth }` since #208, and six
 * pages call it (app/admin/leads, app/admin/ratings, app/bookings,
 * app/bookings/view, app/store/checkout, app/store/orders). Not one of them
 * destructures `reauth`. They render the message — "Your session has expired.
 * Please sign in again to continue." — beside a Retry button, and Retry re-fires
 * the same request with the same dead session. The user is told to sign in
 * again and given a control that cannot do it; a Retry there is worse than no
 * control at all, because it looks like the way out.
 *
 * This is the missing affordance: one component, one href builder, so a caller
 * can render "sign in again" as something the user can actually press, landing
 * back where they were.
 *
 * The href is deliberately built here rather than at each call site: it must be
 * root-relative (app/auth/login's own `safeRedirect` drops anything else and
 * silently sends the user to their dashboard instead) and it must never point
 * back into /auth, which would bounce a signed-out user in a circle.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { reauthLoginHref, friendlyApiError } from '../../../lib/friendly-error';

vi.mock('next/navigation', () => ({
  usePathname: () => '/bookings/view?id=BS-20260805-T9CHE',
}));

import ReauthPrompt from '../../../components/ReauthPrompt';

describe('AUTH-06 — reauthLoginHref', () => {
  it('sends the user back to where they were after signing in', () => {
    expect(reauthLoginHref('/bookings')).toBe(
      `/auth/login?redirect=${encodeURIComponent('/bookings')}`,
    );
  });

  it('encodes a path with a query string so the redirect survives', () => {
    const href = reauthLoginHref('/bookings/view?id=BS-20260805-T9CHE');
    expect(href).toBe(
      `/auth/login?redirect=${encodeURIComponent('/bookings/view?id=BS-20260805-T9CHE')}`,
    );
    // The `?` of the inner path must not read as a second query parameter.
    expect(href.split('?').length).toBe(2);
  });

  it('refuses an off-origin target rather than handing it to the login page', () => {
    // app/auth/login's safeRedirect would drop these anyway; not emitting them
    // means the malicious URL never appears in a link at all.
    expect(reauthLoginHref('https://evil.example.com/steal')).toBe('/auth/login');
    expect(reauthLoginHref('//evil.example.com')).toBe('/auth/login');
  });

  it('never points back into /auth — a signed-out user would loop', () => {
    expect(reauthLoginHref('/auth/login')).toBe('/auth/login');
    expect(reauthLoginHref('/auth/logout')).toBe('/auth/login');
  });

  it('handles a missing pathname', () => {
    expect(reauthLoginHref(null)).toBe('/auth/login');
    expect(reauthLoginHref(undefined)).toBe('/auth/login');
    expect(reauthLoginHref('')).toBe('/auth/login');
  });
});

describe('AUTH-06 — ReauthPrompt renders the way out, not just the diagnosis', () => {
  it('renders a link to sign in again', () => {
    render(<ReauthPrompt />);
    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link.getAttribute('href')).toBe(
      `/auth/login?redirect=${encodeURIComponent('/bookings/view?id=BS-20260805-T9CHE')}`,
    );
  });

  it('shows the expiry message the 401 handler produced', () => {
    const { message } = friendlyApiError(new Error('HTTP 401'));
    render(<ReauthPrompt message={message} />);
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('falls back to its own copy when the caller passes no message', () => {
    render(<ReauthPrompt />);
    expect(document.body.textContent ?? '').toMatch(/sign in/i);
  });

  it('renders no paragraph when the caller passes an empty message', () => {
    // /bookings already prints the sentence in its own alert row and only wants
    // the control. `message=""` therefore means "I said it" — distinct from
    // omitting the prop, which means "say it for me". Without this the prompt
    // emitted an empty <p> into the middle of that row.
    const { container } = render(<ReauthPrompt message="" />);
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('a[href^="/auth/login"]')).not.toBeNull();
  });

  it('offers no Retry — retrying a 401 re-fires the same dead session', () => {
    render(<ReauthPrompt />);
    expect(screen.queryByRole('button', { name: /retry|try again/i })).toBeNull();
  });
});
