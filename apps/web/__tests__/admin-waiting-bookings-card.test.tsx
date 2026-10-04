import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/** Dashboard tile: how many paid bookings has no pandit taken. A failed check must never read as zero. */
const authValue = vi.hoisted(() => ({ session: { accessToken: 'test-token' }, user: { id: 'a1' }, isAuthenticated: true, isLoading: false }));
vi.mock('../lib/auth-context', () => ({ useAuth: () => authValue }));

import WaitingBookingsCard from '../components/admin/WaitingBookingsCard';

const realFetch = globalThis.fetch;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => { globalThis.fetch = realFetch; });

describe('<WaitingBookingsCard />', () => {
  it('counts the paid bookings waiting for a pandit and links to them', async () => {
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (i: RequestInfo | URL) => { urls.push(String(i)); return json(200, { bookings: [], total: 3, page: 1, limit: 1 }); }) as unknown as typeof fetch;
    render(<WaitingBookingsCard />);
    expect(await screen.findByText(/3 waiting for a pandit/i)).toBeInTheDocument();
    expect(urls[0]).toMatch(/\/admin\/bookings\?[^#]*waiting=1/);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/bookings');
  });

  it('says so when nothing is waiting', async () => {
    globalThis.fetch = vi.fn(async () => json(200, { bookings: [], total: 0, page: 1, limit: 1 })) as unknown as typeof fetch;
    render(<WaitingBookingsCard />);
    expect(await screen.findByText(/none waiting/i)).toBeInTheDocument();
  });

  it('a failed check says it could not check, and never shows zero', async () => {
    globalThis.fetch = vi.fn(async () => json(500, { error: 'boom' })) as unknown as typeof fetch;
    render(<WaitingBookingsCard />);
    expect(await screen.findByText(/could not check/i)).toBeInTheDocument();
    expect(screen.queryByText(/none waiting|0 waiting/i)).toBeNull();
  });
});
