import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * AW-04 (2026-08-12, P1) — the astrologer dashboard's money row lied twice.
 *
 * Live observation: with exactly one confirmed ₹375 consultation the dashboard
 * read "Paid out ₹375 · Pending payout — · This month ₹375" while
 * /payouts/balance answered {availableInr:700, pendingInr:0, paidOutInr:0} and
 * the portal's own Earnings page read "Total earnings ₹700 · Pending payout
 * ₹700 · Paid out ₹0" at the same moment.
 *
 *   - `totalEarningsInr` was GROSS (SUM of amount_inr, before the 20% platform
 *     cut) and was piped into EarningsCard's `totalPaid` prop, whose label is
 *     "Paid out". So the card claimed ₹375 had been transferred when ₹0 had,
 *     and overstated the astrologer's real take (₹300) by 25%.
 *   - `pending` was passed literally `null`, so "Pending payout" rendered as an
 *     em dash for every astrologer.
 *
 * The API now returns paidOutInr / pendingPayoutInr off the Commission ledger
 * and net (80%) month/total figures. This test asserts the PAGE consumes them —
 * the failure mode this repo keeps shipping is one side of the contract landing
 * without the other.
 */

const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
  // Must delegate to the CURRENT global fetch: these suites swap
  // globalThis.fetch per test, and a captured reference would freeze the first
  // one. The signal is passed through so the pages' timeout wiring stays real.
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: (c: unknown) =>
    typeof c === 'object' && c !== null && 'status' in c
      ? `Couldn't load live data (HTTP ${(c as { status: number }).status}).`
      : "Couldn't load live data.",
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

vi.mock('../components/MyProviderProfileCard', () => ({
  default: () => <div data-testid="profile-card" />,
}));
vi.mock('../components/provider/KycStatusBadge', () => ({
  default: () => <div data-testid="kyc-badge" />,
}));
// EarningsCard is NOT stubbed away — the props it receives are the defect.
vi.mock('../components/provider/EarningsCard', () => ({
  default: (props: { totalPaid?: number | null; pending?: number | null; thisMonth?: number | null }) => (
    <div
      data-testid="earnings-card"
      data-total-paid={String(props.totalPaid)}
      data-pending={String(props.pending)}
      data-this-month={String(props.thisMonth)}
    />
  ),
}));

import AstrologerDashboard from '../app/astrologer-portal/page';

const TOKEN = 'demo-astro-token';

/** One ₹375 consultation: astrologer share ₹300, nothing settled yet. */
const DASHBOARD_PAYLOAD = {
  profile: { fullName: 'Acharya Vinod Sharma', rating: 0, ratingCount: 0 },
  stats: {
    totalConsultations: 1,
    rating: 0,
    pricePerMinute: 25,
    approved: true,
    consultationsToday: 1,
    earningsTodayInr: 300,
    earningsMonthInr: 300,
    totalEarningsInr: 300,
    paidOutInr: 0,
    pendingPayoutInr: 300,
    astrologerShare: 0.8,
    activeClients: 1,
  },
  upcomingSessions: [],
};

function mockFetch(dashboard: unknown) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/astrologer-portal/dashboard')) {
      return { ok: true, status: 200, json: async () => dashboard } as Response;
    }
    if (url.includes('/astrologer-portal/online')) {
      return { ok: true, status: 200, json: async () => ({ online: false }) } as Response;
    }
    if (url.includes('/provider-kyc')) {
      return { ok: true, status: 200, json: async () => ({ kyc: null }) } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
}

beforeEach(() => {
  useAuthMock.mockReturnValue({
    session: { accessToken: TOKEN },
    user: { fullName: 'Acharya Vinod Sharma' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Wait until the dashboard fetch has actually landed before asserting.
 *
 * Without this gate the pre-fetch ZERO_STATS render satisfies a `toBe('0')`
 * assertion on the very first tick and the test goes green against the broken
 * code — the same false-positive shape as the rate-limit test that "proved"
 * per-user partitioning by rebuilding the app for every request.
 */
async function settled() {
  await waitFor(() => {
    expect(screen.getByTestId('earnings-card').getAttribute('data-this-month')).toBe('300');
  });
  return screen.getByTestId('earnings-card');
}

describe('AW-04 — astrologer dashboard money cards', () => {
  it('feeds "Paid out" the settled figure (₹0), not gross revenue', async () => {
    vi.stubGlobal('fetch', mockFetch(DASHBOARD_PAYLOAD));
    render(<AstrologerDashboard />);

    const card = await settled();
    expect(card.getAttribute('data-total-paid')).toBe('0');
  });

  it('passes a real pending-payout number instead of null (the em dash)', async () => {
    vi.stubGlobal('fetch', mockFetch(DASHBOARD_PAYLOAD));
    render(<AstrologerDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('earnings-card').getAttribute('data-pending')).toBe('300');
    });
  });

  it('shows the 80% share for the month, never the ₹375 gross', async () => {
    vi.stubGlobal('fetch', mockFetch(DASHBOARD_PAYLOAD));
    render(<AstrologerDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('earnings-card').getAttribute('data-this-month')).toBe('300');
    });
  });

  it('renders a null pending rather than a fabricated 0 when the API omits the split', async () => {
    // An older API build (or a failed fetch) must not be papered over with an
    // invented ₹0 "paid out" — an honest em dash beats a confident wrong number.
    const legacy = {
      ...DASHBOARD_PAYLOAD,
      stats: { ...DASHBOARD_PAYLOAD.stats, paidOutInr: undefined, pendingPayoutInr: undefined },
    };
    vi.stubGlobal('fetch', mockFetch(legacy));
    render(<AstrologerDashboard />);

    const card = await settled();
    expect(card.getAttribute('data-total-paid')).toBe('null');
    expect(card.getAttribute('data-pending')).toBe('null');
  });
});
