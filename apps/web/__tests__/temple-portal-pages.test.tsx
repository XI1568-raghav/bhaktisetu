import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' } }),
}));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));

import TempleDashboard from '../app/temple-portal/page';
import TempleDonationsPage from '../app/temple-portal/donations/page';
import TemplePayoutsPage from '../app/temple-portal/payouts/page';
import TempleBookingsPage from '../app/temple-portal/bookings/page';
import { templeBookingStatus } from '../lib/temple-booking-status';

type Reply = { status: number; body: unknown };
function stubFetch(routes: Record<string, Reply>) {
  const fn = vi.fn(async (url: string): Promise<Response> => {
    const key = Object.keys(routes).find((k) => String(url).includes(k));
    const r = key ? routes[key]! : { status: 404, body: {} };
    return { ok: r.status < 400, status: r.status, json: async () => r.body, text: async () => JSON.stringify(r.body) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const stats = { totalBookings: 0, monthBookings: 0, totalRevenueInr: 0, monthRevenueInr: 0, releasedInr: 0, monthReleasedInr: 0, upcomingInr: 0, monthUpcomingInr: 0, totalStreams: 0 };

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('temple dashboard', () => {
  const booking = { id: 'b1', bookingNumber: 'BS-1', devotee: 'Asha', pujaName: 'Rudrabhishek', scheduledDate: '2026-11-01T00:00:00.000Z', scheduledTimeSlot: '06:00', priceInr: 501, status: 'priest_assigned' };

  it('"View All" on recent bookings goes to the bookings page, and statuses read as words', async () => {
    stubFetch({
      '/temple-portal/dashboard': { status: 200, body: { profile: { templeName: 'Test Mandir' }, templeLinked: true, stats, recentBookings: [booking, { ...booking, id: 'b2', status: 'pending_payment' }], publicListing: { verified: true, status: 'active', slug: 't' } } },
      '/temple-portal/donations': { status: 200, body: { donations: [] } },
    });
    render(<TempleDashboard />);
    await waitFor(() => expect(screen.getAllByText('Rudrabhishek').length).toBe(2));
    const viewAll = screen.getAllByRole('link', { name: /view all/i });
    expect(viewAll[0]!.getAttribute('href')).toBe('/temple-portal/bookings');
    expect(viewAll[1]!.getAttribute('href')).toBe('/temple-portal/donations');
    expect(screen.getByText('Pandit assigned')).toBeTruthy();
    expect(screen.getByText('Awaiting payment')).toBeTruthy();
    expect(screen.queryByText('priest_assigned')).toBeNull();
    expect(screen.queryByTestId('listing-unverified')).toBeNull();
  });

  it('tells the manager when devotees cannot see or book the temple yet', async () => {
    stubFetch({
      '/temple-portal/dashboard': { status: 200, body: { profile: { templeName: 'Test Mandir' }, templeLinked: true, stats, recentBookings: [], publicListing: { verified: false, status: 'pending_review', slug: 't' } } },
      '/temple-portal/donations': { status: 200, body: { donations: [] } },
    });
    render(<TempleDashboard />);
    const banner = await screen.findByTestId('listing-unverified');
    expect(banner.textContent).toMatch(/not public yet/i);
    expect(banner.textContent).toMatch(/cannot find this temple or book pujas/i);
  });

  it('shows real recent donations instead of a "feed pending" placeholder', async () => {
    stubFetch({
      '/temple-portal/dashboard': { status: 200, body: { profile: { templeName: 'Test Mandir' }, templeLinked: true, stats, recentBookings: [] } },
      '/temple-portal/donations': { status: 200, body: { donations: [{ id: 'd1', donor: 'Meera', email: null, amountInr: 251, status: 'paid', receiptNumber: null, createdAt: '2026-10-28T10:00:00Z', paidAt: '2026-10-28T10:01:00Z' }] } },
    });
    render(<TempleDashboard />);
    await waitFor(() => expect(screen.getByText('Meera')).toBeTruthy());
    expect(screen.getByText('Received')).toBeTruthy();
    expect(screen.queryByText(/feed pending/i)).toBeNull();
  });

  it('says donations are unavailable when the read fails, not "none yet"', async () => {
    stubFetch({
      '/temple-portal/dashboard': { status: 200, body: { profile: { templeName: 'Test Mandir' }, templeLinked: true, stats, recentBookings: [] } },
      '/temple-portal/donations': { status: 500, body: {} },
    });
    render(<TempleDashboard />);
    await waitFor(() => expect(screen.getByText('Donations unavailable')).toBeTruthy());
  });
});

describe('temple donations: "Today" is the Indian calendar day', () => {
  it('does not count yesterday evening (IST) as today just because its UTC date matches', async () => {
    // 01:30 IST on 30 Oct. The donation below is 15:30 IST on 29 Oct (10:00 UTC, still 29 Oct in UTC).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T20:00:00Z'));
    stubFetch({
      '/temple-portal/donations': { status: 200, body: { donations: [{ id: 'd1', donor: 'Meera', email: null, amountInr: 500, status: 'paid', receiptNumber: null, createdAt: '2026-10-29T10:00:00Z', paidAt: '2026-10-29T10:00:00Z' }] } },
    });
    render(<TempleDonationsPage />);
    await waitFor(() => expect(screen.getAllByText('₹500').length).toBeGreaterThan(0));
    const todayCard = screen.getByText('Today').parentElement!.parentElement!;
    expect(todayCard.textContent).toContain('₹0');
    const totalCard = screen.getByText('Total Received').parentElement!.parentElement!;
    expect(totalCard.textContent).toContain('₹500');
  });

  it('does not say "No donations yet" under a load error', async () => {
    stubFetch({ '/temple-portal/donations': { status: 500, body: {} } });
    render(<TempleDonationsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy());
    expect(screen.queryByText('No donations yet')).toBeNull();
  });
});

describe('temple payouts', () => {
  it('shows dashes, not fabricated rupee zeros, when the read fails', async () => {
    stubFetch({ '/temple-portal/payouts': { status: 500, body: {} } });
    render(<TemplePayoutsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy());
    expect(screen.getAllByText('—').length).toBe(3);
    expect(screen.queryByText('₹0')).toBeNull();
  });
});

describe('temple bookings', () => {
  it('filters by every status a booking can reach and labels them in words', async () => {
    stubFetch({ '/temple-portal/bookings': { status: 200, body: { bookings: [] } } });
    render(<TempleBookingsPage />);
    await screen.findByText(/no bookings yet/i);
    for (const label of ['Awaiting payment', 'Pandit assigned', 'Proof uploaded', 'Delivered']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('templeBookingStatus has a readable fallback for an unknown status', () => {
    expect(templeBookingStatus('on_hold').label).toBe('On hold');
  });
});
