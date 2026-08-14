/**
 * PF-15, the half the error banner did not close.
 *
 * The shipped fix split "load failed" from "genuinely empty" in the RESULT
 * area: /priest/bookings now renders a red alert with Retry instead of "You
 * have no assigned bookings yet". That is real and it holds.
 *
 * What it did not touch is the tab strip directly above it, which is the other
 * half of what the sweep actually recorded:
 *
 *   "Reproduced identically when the API was unreachable: tab strip
 *    All 0 / Pending 0 / Accepted 0 / In Progress 0 / Completed 0 for an
 *    account holding 25 bookings."
 *
 * `counts` initialises to ZERO_COUNTS and the catch block never touches it, so
 * on a failed load the strip keeps publishing five hard zeros next to an error
 * saying the data could not be read. A zero is a claim about the pandit's book;
 * an unread book supports no such claim. This locks the badges to an unknown
 * marker while `loadError` is set, and locks the honest zeros back on when the
 * server genuinely answers with an empty book.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => '/priest/bookings',
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
  loadErrorMessage: () => "Couldn't load live data.",
}));

vi.mock('../components/provider/VideoProofUpload', () => ({ default: () => null }));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));

import PriestBookingsPage from '../app/priest/bookings/page';

vi.setConfig({ testTimeout: 30_000 });

const TAB_LABELS = ['All', 'Pending', 'Accepted', 'In Progress', 'Completed'];

/** The five tab buttons, in strip order. */
function tabButtons(): HTMLElement[] {
  return TAB_LABELS.map((label) =>
    screen
      .getAllByRole('button')
      .find((b) => (b.textContent ?? '').trim().startsWith(label))!,
  );
}

beforeEach(() => {
  nav.params = new URLSearchParams();
  vi.restoreAllMocks();
});

afterEach(() => cleanup());

describe('PF-15 — the tab strip publishes no count it could not read', () => {
  it('shows an unknown marker, not five zeros, when the bookings fetch fails', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'upstream exploded' }), { status: 500 }),
    ) as unknown as typeof fetch;

    render(<PriestBookingsPage />);
    await screen.findByRole('alert');

    for (const [i, btn] of tabButtons().entries()) {
      expect(btn, TAB_LABELS[i]).toBeTruthy();
      const badge = btn.querySelector('span');
      expect(badge, `${TAB_LABELS[i]} badge`).toBeTruthy();
      expect(
        (badge!.textContent ?? '').trim(),
        `${TAB_LABELS[i]} must not claim 0 when the book was never read`,
      ).not.toBe('0');
    }
  });

  it('still shows the real zeros when the server genuinely answers an empty book', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          bookings: [],
          counts: { all: 0, confirmed: 0, priest_assigned: 0, in_progress: 0, completed: 0 },
          total: 0,
          totalPages: 1,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;

    render(<PriestBookingsPage />);
    await screen.findByText(/no assigned bookings yet/i);

    for (const [i, btn] of tabButtons().entries()) {
      const badge = btn.querySelector('span');
      expect((badge!.textContent ?? '').trim(), TAB_LABELS[i]).toBe('0');
    }
  });

  it('still shows real non-zero counts on a healthy load', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          bookings: [],
          counts: { all: 51, confirmed: 9, priest_assigned: 25, in_progress: 1, completed: 13 },
          total: 51,
          totalPages: 3,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;

    render(<PriestBookingsPage />);
    await waitFor(() => {
      const all = tabButtons()[0];
      expect(within(all).getByText('51')).toBeTruthy();
    });
    expect(within(tabButtons()[2]).getByText('25')).toBeTruthy();
  });
});
