import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * Customer test 2026-10-05 — nobody running the platform could see a stranded
 * booking. The admin menu had no Bookings page. This is the screen a launch-day
 * operator needs first: which paid bookings has no pandit taken, and how soon is
 * the slot.
 */
const authValue = vi.hoisted(() => ({ session: { accessToken: 'test-token' }, user: { id: 'a1' }, isAuthenticated: true, isLoading: false }));
vi.mock('../lib/auth-context', () => ({ useAuth: () => authValue }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/admin/bookings', useSearchParams: () => new URLSearchParams() }));

import AdminBookingsPage from '../app/admin/bookings/page';

const realFetch = globalThis.fetch;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const soon = new Date(Date.now() + 20 * 3600 * 1000).toISOString();
const later = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();

const row = (over: Record<string, unknown> = {}) => ({
  id: 'b1', bookingNumber: 'BS-1', status: 'confirmed', priestId: null, scheduledDate: soon, scheduledTimeSlot: '07:00',
  createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  pujaType: { name: 'Hanuman Chalisa Path', slug: 'hanuman-chalisa-path' },
  temple: { name: 'Kashi Vishwanath Temple', slug: 'k', city: 'Varanasi' },
  user: { fullName: 'Arjun Sharma', phone: '+919000000001' },
  priest: null,
  ...over,
});

function api(handler: (url: string) => Response) {
  const urls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => { urls.push(String(input)); return handler(String(input)); }) as unknown as typeof fetch;
  return urls;
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => { globalThis.fetch = realFetch; });

describe('/admin/bookings', () => {
  it('opens on the bookings waiting for a pandit, via the waiting filter', async () => {
    const urls = api(() => json(200, { bookings: [row()], total: 1, page: 1, limit: 50 }));
    render(<AdminBookingsPage />);
    expect(await screen.findByText('BS-1')).toBeInTheDocument();
    expect(urls[0]).toMatch(/\/admin\/bookings\?[^#]*waiting=1/);
  });

  it('shows what an operator needs to act: puja, temple, slot, the devotee to call, and no pandit yet', async () => {
    api(() => json(200, { bookings: [row()], total: 1, page: 1, limit: 50 }));
    render(<AdminBookingsPage />);
    await screen.findByText('BS-1');
    expect(screen.getByText('Hanuman Chalisa Path')).toBeInTheDocument();
    expect(screen.getByText(/Kashi Vishwanath Temple/)).toBeInTheDocument();
    expect(screen.getByText(/07:00/)).toBeInTheDocument();
    expect(screen.getByText(/Arjun Sharma/)).toBeInTheDocument();
    expect(screen.getByText(/\+919000000001/)).toBeInTheDocument();
    expect(screen.getByText(/no pandit yet/i)).toBeInTheDocument();
  });

  it('flags a waiting booking whose slot is within 48 hours, and not one that is days away', async () => {
    api(() => json(200, { bookings: [row({ id: 'b1', bookingNumber: 'BS-SOON' }), row({ id: 'b2', bookingNumber: 'BS-LATER', scheduledDate: later })], total: 2, page: 1, limit: 50 }));
    render(<AdminBookingsPage />);
    await screen.findByText('BS-SOON');
    expect(screen.getAllByText(/slot within 48h/i)).toHaveLength(1);
  });

  it('says plainly when nothing is waiting', async () => {
    api(() => json(200, { bookings: [], total: 0, page: 1, limit: 50 }));
    render(<AdminBookingsPage />);
    expect(await screen.findByText(/no bookings are waiting for a pandit/i)).toBeInTheDocument();
  });

  it('switching to another tab asks for that status, without the waiting filter', async () => {
    const urls = api(() => json(200, { bookings: [], total: 0, page: 1, limit: 50 }));
    render(<AdminBookingsPage />);
    await screen.findByText(/no bookings are waiting/i);
    fireEvent.click(screen.getByRole('tab', { name: /delivered/i }));
    await waitFor(() => expect(urls.some((u) => /status=delivered/.test(u) && !/waiting=/.test(u))).toBe(true));
  });

  it('shows the pandit name once assigned', async () => {
    api(() => json(200, { bookings: [row({ status: 'priest_assigned', priestId: 'p1', priest: { displayName: 'Pandit Suresh' } })], total: 1, page: 1, limit: 50 }));
    render(<AdminBookingsPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^all$/i }));
    expect(await screen.findByText('Pandit Suresh')).toBeInTheDocument();
  });

  it('says when it is showing only part of a long list', async () => {
    api(() => json(200, { bookings: [row()], total: 120, page: 1, limit: 50 }));
    render(<AdminBookingsPage />);
    expect(await screen.findByText(/showing 1 of 120/i)).toBeInTheDocument();
  });

  it('a failed load says so and offers a retry, never an empty "all clear"', async () => {
    api(() => json(500, { error: 'Internal Server Error' }));
    render(<AdminBookingsPage />);
    expect(await screen.findByRole('button', { name: /try again|retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/no bookings are waiting/i)).toBeNull();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });
});
