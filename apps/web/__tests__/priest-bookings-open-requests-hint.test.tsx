/**
 * A paid booking nobody has taken yet is an open request on the Offers page and is not a row on the
 * Bookings page until a pandit accepts it. A tester booked as a devotee, saw it in the temple portal,
 * looked only at Bookings and concluded it never reached the pandit. Bookings now says it is waiting.
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
  // 401 ONLY, matching lib/api-config.ts:288. Omitting it makes the component
  // throw inside its own catch; the test still passes and the throw escapes as
  // an unhandled rejection, which vitest exits non-zero for. That failed the
  // whole web suite in CI while all 4071 tests passed (priest-portal-p2).
  // A 403 must NOT be reauth — see AUTH-06's second pass.
  loadErrorIsReauth: (c: unknown) =>
    typeof c === 'object' && c !== null && 'status' in c
      ? (c as { status: number }).status === 401
      : false,
}));

vi.mock('../components/provider/VideoProofUpload', () => ({ default: () => null }));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));

import PriestBookingsPage from '../app/priest/bookings/page';

vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  nav.params = new URLSearchParams();
  vi.restoreAllMocks();
});
afterEach(() => cleanup());

function mockApi(requests: unknown[]) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/priest/open-requests')) {
      return new Response(JSON.stringify({ eligible: true, requests }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        bookings: [],
        counts: { all: 0, confirmed: 0, priest_assigned: 0, in_progress: 0, completed: 0 },
        total: 0,
        totalPages: 1,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as unknown as typeof fetch;
}

describe('priest Bookings points at paid requests that are waiting on Offers', () => {
  it('shows a link to Offers when a paid booking is waiting', async () => {
    mockApi([{ id: 'b1' }]);
    render(<PriestBookingsPage />);
    const hint = await screen.findByTestId('open-requests-hint');
    expect(hint.textContent).toMatch(/1 paid booking is waiting for a pandit/i);
    expect(within(hint).getByRole('link').getAttribute('href')).toBe('/priest/offers');
  });

  it('says nothing when no paid booking is waiting', async () => {
    mockApi([]);
    render(<PriestBookingsPage />);
    await screen.findByText(/no assigned bookings yet/i);
    expect(screen.queryByTestId('open-requests-hint')).toBeNull();
  });
});
