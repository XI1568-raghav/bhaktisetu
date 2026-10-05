import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * CT-UI-1 (customer test 2026-09-08).
 *
 * /temple-portal joined city and state with a literal comma, so an account
 * with no temple profile yet read ", · Temple management dashboard" — the
 * separators survived with nothing between them. Same class as the soft-404
 * `<title>Temple — , ` in CT-SEO-1.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/temple-portal',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Temple Manager', email: 'temple@demo.com' },
    isAuthenticated: true,
    isLoading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));

import TempleDashboard from '../app/temple-portal/page';

const realFetch = globalThis.fetch;

function dashboardFetch(profile: unknown) {
  const fn = vi.fn(
    async () =>
      new Response(JSON.stringify({ stats: null, recentBookings: [], profile }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

function subheading() {
  return screen.getByText(/Temple management dashboard/).textContent ?? '';
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('CT-UI-1 — /temple-portal subheading never renders bare separators', () => {
  it('shows only the label when the account has no temple profile', async () => {
    const fn = dashboardFetch(null);
    render(<TempleDashboard />);
    await waitFor(() => expect(fn).toHaveBeenCalled());

    expect(subheading().trim()).toBe('Temple management dashboard');
  });

  it('shows the one part it has, without a dangling comma', async () => {
    dashboardFetch({ templeName: 'Shri Ram Mandir', city: 'Ayodhya', state: null });
    render(<TempleDashboard />);

    await screen.findByText('Shri Ram Mandir');
    expect(subheading()).toBe('Ayodhya · Temple management dashboard');
  });

  it('still joins city and state when both are present', async () => {
    dashboardFetch({ templeName: 'Shri Ram Mandir', city: 'Ayodhya', state: 'Uttar Pradesh' });
    render(<TempleDashboard />);

    await screen.findByText('Shri Ram Mandir');
    expect(subheading()).toBe('Ayodhya, Uttar Pradesh · Temple management dashboard');
  });
});
