import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Temple manager test (2026-10-05).
 *
 * The dashboard called the devotee's gross payment "Revenue" and read
 * `templeCity`/`templeState` from a profile that carries `city`/`state`, so the
 * place line was always empty. The API now sends the temple's own share as the
 * revenue figures; the labels must say so, and an account that is not linked to
 * a temple yet must be told why instead of seeing a wall of zeros.
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
afterEach(() => {
  globalThis.fetch = realFetch;
});

function respondWith(body: unknown) {
  globalThis.fetch = vi.fn(
    async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ) as unknown as typeof fetch;
}

describe('temple portal dashboard', () => {
  it('labels the money as the temple share and shows the temple place', async () => {
    respondWith({
      profile: { templeName: 'QA Sheetla Mata Mandir', city: 'Gurugram', state: 'Haryana' },
      stats: { totalBookings: 1, monthBookings: 1, totalRevenueInr: 100, monthRevenueInr: 100, totalStreams: 0 },
      recentBookings: [],
    });
    render(<TempleDashboard />);
    await waitFor(() => expect(screen.getByText('Released temple share')).toBeTruthy());
    expect(screen.getByText('Upcoming temple share')).toBeTruthy();
    expect(screen.queryByText('Total Revenue')).toBeNull();
    expect(screen.getByText(/Gurugram, Haryana/)).toBeTruthy();
  });

  it('shows released and upcoming share separately and never calls unreleased share earned', async () => {
    respondWith({
      profile: { templeName: 'QA Sheetla Mata Mandir', city: 'Gurugram', state: 'Haryana' },
      stats: {
        totalBookings: 3, monthBookings: 3,
        totalRevenueInr: 60, monthRevenueInr: 50,
        releasedInr: 60, monthReleasedInr: 50, upcomingInr: 1234, monthUpcomingInr: 30,
        totalStreams: 0,
      },
      recentBookings: [],
    });
    render(<TempleDashboard />);
    // The tiles render a placeholder first; wait for the loaded value so a slow runner cannot
    // read them mid-load.
    await waitFor(() => expect(screen.getByTestId('temple-share-released').textContent).toMatch(/60/), { timeout: 5000 });
    const released = screen.getByTestId('temple-share-released');
    const upcoming = screen.getByTestId('temple-share-upcoming');
    expect(released.textContent).not.toMatch(/1,234/);
    expect(upcoming.textContent).toMatch(/1,234/);
    expect(upcoming.textContent).toMatch(/after the puja is performed and proved/i);
  });

  it('says why a temple is not linked instead of showing silent zeros', async () => {
    respondWith({
      profile: { templeName: 'Somnath Temple', city: null, state: null },
      stats: { totalBookings: 0, monthBookings: 0, totalRevenueInr: 0, monthRevenueInr: 0, totalStreams: 0 },
      recentBookings: [],
      templeLinked: false,
      reason: 'not_approved',
    });
    render(<TempleDashboard />);
    await waitFor(() => expect(screen.getByText(/awaiting approval/i)).toBeTruthy());
  });
});
