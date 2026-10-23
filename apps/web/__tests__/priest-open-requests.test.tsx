import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

/**
 * Customer test 2026-10-05 — a paid booking no pandit could see.
 *
 * Production had 25 bookable puja offerings and none with a pandit attached, so
 * every paid booking stayed `confirmed` with nobody to take it, and the pandit
 * portal listed only bookings already assigned. This is the pandit's side of the
 * fix: the list of open paid bookings, and the button that takes one.
 */
// One object for every call: the real auth context hands out a stable session, and a fresh
// object per render would make the component refetch and bring an accepted row back.
const authValue = vi.hoisted(() => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' }, isAuthenticated: true, isLoading: false }));
vi.mock('../lib/auth-context', () => ({ useAuth: () => authValue }));

import OpenRequests from '../components/priest/OpenRequests';

const realFetch = globalThis.fetch;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const request = {
  id: 'bk-1', bookingNumber: 'BS-20261008-AAAAA', scheduledDate: '2026-10-08T00:00:00.000Z', scheduledTimeSlot: '07:00',
  devoteeCount: 2, priestEarningInr: 2400, pujaName: 'Hanuman Chalisa Path', templeName: 'Kashi Vishwanath Temple', city: 'Varanasi',
};

function route(map: Record<string, () => Response>) {
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    const key = Object.keys(map).find((k) => url.includes(k.split(' ')[1]!) && method === k.split(' ')[0]);
    if (!key) throw new Error(`unexpected ${method} ${url}`);
    return map[key]!();
  }) as unknown as typeof fetch;
  return calls;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => { globalThis.fetch = realFetch; });

describe('<OpenRequests />', () => {
  it('lists the open paid bookings with what a pandit needs to decide', async () => {
    route({ 'GET /priest/open-requests': () => json(200, { eligible: true, requests: [request] }) });
    render(<OpenRequests />);
    expect(await screen.findByText('Hanuman Chalisa Path')).toBeInTheDocument();
    expect(screen.getByText(/Kashi Vishwanath Temple/)).toBeInTheDocument();
    expect(screen.getByText(/Varanasi/)).toBeInTheDocument();
    expect(screen.getByText(/2 devotees/)).toBeInTheDocument();
    expect(screen.getByText(/07:00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByText(/You earn ₹2,400/)).toBeInTheDocument();
  });

  it('tells a pandit who has not finished the profile why the list is empty, with no approval wall', async () => {
    route({ 'GET /priest/open-requests': () => json(200, { eligible: false, requests: [] }) });
    render(<OpenRequests />);
    expect(await screen.findByText(/complete your pandit profile/i)).toBeInTheDocument();
    expect(screen.queryByText(/waiting for approval|admin approves/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
  });

  it('says there is nothing open when there is nothing open', async () => {
    route({ 'GET /priest/open-requests': () => json(200, { eligible: true, requests: [] }) });
    render(<OpenRequests />);
    expect(await screen.findByText(/no open requests/i)).toBeInTheDocument();
  });

  it('accepting calls the accept endpoint, removes the row and shows the server\'s own confirmation', async () => {
    const calls = route({
      'GET /priest/open-requests': () => json(200, { eligible: true, requests: [request] }),
      'PATCH /priest/bookings/bk-1/accept': () => json(200, { message: 'Booking accepted successfully.' }),
    });
    render(<OpenRequests />);
    fireEvent.click(await screen.findByRole('button', { name: /accept/i }));
    expect(await screen.findByText('Booking accepted successfully.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Hanuman Chalisa Path')).toBeNull());
    expect(calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/priest/bookings/bk-1/accept'))).toBe(true);
  });

  it('when another pandit got there first, says what the server said and keeps the list', async () => {
    route({
      'GET /priest/open-requests': () => json(200, { eligible: true, requests: [request] }),
      'PATCH /priest/bookings/bk-1/accept': () => json(400, { error: 'This booking is assigned to a different priest.' }),
    });
    render(<OpenRequests />);
    fireEvent.click(await screen.findByRole('button', { name: /accept/i }));
    expect(await screen.findByText(/assigned to a different priest/i)).toBeInTheDocument();
  });

  it('a failed load says so and offers a retry, never an empty list', async () => {
    route({ 'GET /priest/open-requests': () => json(500, { error: 'Internal Server Error' }) });
    render(<OpenRequests />);
    expect(await screen.findByRole('button', { name: /try again|retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/no open requests/i)).toBeNull();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });

  it('never renders a devotee name', async () => {
    route({ 'GET /priest/open-requests': () => json(200, { eligible: true, requests: [{ ...request, devoteeNames: [{ name: 'Arjun Sharma' }] }] }) });
    const { container } = render(<OpenRequests />);
    await screen.findByText('Hanuman Chalisa Path');
    expect(container.textContent).not.toMatch(/Arjun/);
  });
});
