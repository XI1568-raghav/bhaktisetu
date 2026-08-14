/**
 * Pandit portal P2s from the prod sweep 2026-08-12 — the web half.
 *
 *  PF-12  /priest/payouts read "Total Earned ₹2,310" while /priest read ₹0 for
 *         the same account. The server now reports settled money only; the card
 *         has to use the same word the dashboard does or the contradiction just
 *         moves.
 *  PF-14  The on-duty toggle initialised to false on every load, so a pandit in
 *         the instant-dispatch pool was shown "Go on duty" — and switching
 *         himself OFF took two clicks, the first of which re-armed him.
 *  PF-15  A failed /priest/payouts fetch was swallowed into an empty array and
 *         a zeroed summary, so an API outage rendered as "You have no payout
 *         records yet" with no error and no retry.
 *  PJ-09  Video proof was captured by a raw window.prompt() on the list page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => '/priest',
  useSearchParams: () => nav.params,
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Demo Pandit', email: 'pandit@demo.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, init),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: (c: unknown) =>
    typeof c === 'object' && c !== null && 'status' in c
      ? `Couldn't load live data (HTTP ${(c as { status: number }).status}).`
      : "Couldn't load live data.",
}));

vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));

import PriestDashboard from '../app/priest/page';
import PriestPayoutsPage from '../app/priest/payouts/page';
import PriestBookingsPage from '../app/priest/bookings/page';

vi.setConfig({ testTimeout: 30_000 });

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function fail(status: number, body: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: body }),
    text: async () => body,
  } as unknown as Response;
}

/**
 * The live pandit@demo.com numbers read out of Postgres on 2026-08-13:
 * three PriestPayout rows, all `pending`, ₹2,310 in total, nothing settled.
 */
const SUMMARY = { totalEarned: 0, pending: 2310, lastPayout: null };

function dashboardBody(over: Record<string, unknown> = {}) {
  return {
    priest: {
      id: 'p',
      displayName: 'Demo Pandit',
      avatarUrl: null,
      ratingAvg: 4.6,
      ratingCount: 43,
      isOnDuty: true,
      lastSeenAt: '2026-08-13T04:00:00.000Z',
      ...over,
    },
    earnings: { total: 0, thisMonth: 0, pending: 2310 },
    bookings: { total: 51, upcoming: 26, completed: 13 },
    upcomingBookings: [],
  };
}

function mockApi(extra?: (url: URL) => Response | undefined) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'https://api.test');
    const custom = extra?.(url);
    if (custom) return custom;
    if (url.pathname.endsWith('/priest/dashboard')) return ok(dashboardBody());
    if (url.pathname.endsWith('/priest/payouts')) {
      return ok({ payouts: [], total: 0, page: 1, limit: 20, totalPages: 0, summary: SUMMARY });
    }
    if (url.pathname.endsWith('/provider-kyc')) return ok({ kyc: { verified: true } });
    return ok({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── PF-14 ───────────────────────────────────────────────────────────────────

describe('PF-14 — the on-duty toggle reflects the saved state', () => {
  it('renders ON when the server says the pandit is on duty', async () => {
    mockApi();
    render(<PriestDashboard />);
    const toggle = await screen.findByLabelText('Toggle on-duty');
    // Before the fix this was always "false" on load, whatever the server said.
    await waitFor(() => expect(toggle.getAttribute('aria-pressed')).toBe('true'));
    expect(screen.getByText('You are ON DUTY')).toBeTruthy();
  });

  it('renders OFF when the server says the pandit is off duty', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/dashboard')
        ? ok(dashboardBody({ isOnDuty: false, lastSeenAt: null }))
        : undefined,
    );
    render(<PriestDashboard />);
    const toggle = await screen.findByLabelText('Toggle on-duty');
    await waitFor(() => expect(toggle.getAttribute('aria-pressed')).toBe('false'));
    expect(screen.getByText('Go on duty for instant bookings')).toBeTruthy();
  });

  it('does not claim on-duty when the dashboard fetch fails', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/dashboard') ? fail(500, 'boom') : undefined,
    );
    render(<PriestDashboard />);
    const toggle = await screen.findByLabelText('Toggle on-duty');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
});

// ─── PF-15 ───────────────────────────────────────────────────────────────────

describe('PF-15 — a failed payouts fetch is not reported as "no payouts yet"', () => {
  it('shows an error with a retry instead of the empty state', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/payouts') ? fail(500, 'upstream down') : undefined,
    );
    render(<PriestPayoutsPage />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/could not load/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    expect(screen.queryByText('You have no payout records yet.')).toBeNull();
  });

  it('does not render zeroed summary cards over a failed fetch', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/payouts') ? fail(500, 'upstream down') : undefined,
    );
    render(<PriestPayoutsPage />);
    await screen.findByRole('alert');
    // A ₹0 "paid out" card invented from a failure is the same lie as a
    // fabricated ledger, just cheaper-looking.
    expect(screen.queryByText('Pending Payout')).toBeNull();
  });

  it('retry re-issues the request', async () => {
    let calls = 0;
    const fetchMock = mockApi((url) => {
      if (!url.pathname.endsWith('/priest/payouts')) return undefined;
      calls += 1;
      return fail(500, 'upstream down');
    });
    render(<PriestPayoutsPage />);
    const retry = await screen.findByRole('button', { name: /retry/i });
    expect(calls).toBe(1);
    retry.click();
    await waitFor(() => expect(calls).toBe(2));
    expect(fetchMock).toHaveBeenCalled();
  });

  it('still shows the genuine empty state on a successful empty response', async () => {
    mockApi();
    render(<PriestPayoutsPage />);
    expect(await screen.findByText('You have no payout records yet.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// ─── PF-12 ───────────────────────────────────────────────────────────────────

describe('PF-12 — the payouts page uses the dashboard’s vocabulary for money', () => {
  it('labels the settled figure "Paid out", not "Total Earned"', async () => {
    mockApi();
    render(<PriestPayoutsPage />);
    // "Total Earned" over an unsettled balance is what made the two screens
    // contradict each other; the dashboard card has always said "Paid out".
    expect(await screen.findByText('Paid out')).toBeTruthy();
    expect(screen.queryByText('Total Earned')).toBeNull();
  });
});

// ─── PF-15, the bookings half ────────────────────────────────────────────────
// The finding names two screens. /priest/payouts is covered above; this is the
// one the pandit actually opens to find his work. A 400/500/offline API used to
// land on "You have no assigned bookings yet" — an account holding 25 bookings
// was shown a normal empty day, so nobody looked and the SLAs quietly breached.

const BOOKING_ROW = {
  id: 'b1330da2-c830-41ff-93da-ded81963b163',
  bookingNumber: 'BS-20260812-T6GL8',
  status: 'completed',
  scheduledDate: '2026-08-19T00:00:00.000Z',
  scheduledTimeSlot: '6:00 AM',
  priceAmount: 1100,
  priestPayout: 770,
  currency: 'INR',
  devoteeNames: [{ name: 'Devotee One' }],
  videoProofUrl: null,
  createdAt: '2026-08-12T00:00:00.000Z',
  temple: { id: 't1', name: 'Kashi Vishwanath Temple', city: 'Varanasi' },
  pujaType: { id: 'p1', name: 'Rudrabhishek', durationMinutes: 60 },
  user: { fullName: 'Devotee One' },
};

function bookingsBody(rows: unknown[]) {
  return {
    bookings: rows,
    total: rows.length,
    page: 1,
    limit: 20,
    totalPages: 1,
    counts: {
      all: rows.length,
      confirmed: 0,
      priest_assigned: 0,
      in_progress: 0,
      completed: rows.length,
    },
  };
}

describe('PF-15 — a failed bookings fetch is not reported as "no bookings"', () => {
  it('shows an error with a retry instead of the empty state', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/bookings') ? fail(500, 'upstream down') : undefined,
    );
    render(<PriestBookingsPage />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/could not load your bookings/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    // The exact sentence a pandit used to be shown during an API outage.
    expect(screen.queryByText('You have no assigned bookings yet.')).toBeNull();
  });

  it('still shows the genuine empty state on a successful empty response', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/bookings') ? ok(bookingsBody([])) : undefined,
    );
    render(<PriestBookingsPage />);
    expect(await screen.findByText('You have no assigned bookings yet.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// ─── PJ-09 ───────────────────────────────────────────────────────────────────

describe('PJ-09 — no browser prompt() collects video proof', () => {
  it('offers the completed booking a link to the real uploader, not a dialog', async () => {
    const promptSpy = vi.fn(() => 'https://example.com/proof.mp4');
    vi.stubGlobal('prompt', promptSpy);
    mockApi((url) =>
      url.pathname.endsWith('/priest/bookings')
        ? ok(bookingsBody([BOOKING_ROW]))
        : undefined,
    );
    render(<PriestBookingsPage />);

    // Before the fix this control was a <button> whose onClick opened
    // window.prompt('Paste the video recording URL for this booking:').
    // The whole card is also a <Link> (PF-17, still open), so the accessible
    // name matches twice; the inner one is the action control.
    const links = await screen.findAllByRole('link', { name: /upload video/i });
    const proof = links[links.length - 1]!;
    expect(proof.tagName).toBe('A');
    expect(proof.getAttribute('href')).toBe(`/priest/bookings/view?id=${BOOKING_ROW.id}`);

    // The discriminating assertion: the proof control must not be a button
    // that opens a dialog. That is exactly what it was.
    expect(screen.queryByRole('button', { name: /upload video/i })).toBeNull();

    proof.click();
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it('the pandit bookings list contains no window.prompt path', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../app/priest/bookings/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/window\.prompt/);
  });

  it('routes the proof step at the real uploader instead', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../app/priest/bookings/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/priest\/bookings\/view\?id=/);
  });
});
