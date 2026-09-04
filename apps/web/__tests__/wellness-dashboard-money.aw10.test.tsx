import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * AW-10 (2026-08-12, P2) — the wellness dashboard's money row, the same defect
 * AW-04 fixed on the astrologer side.
 *
 * Live observation: with one PAID enrolment the page read
 * "Paid out ₹800 · Pending payout — · This month ₹800" while
 * /payouts/balance answered {availableInr: 800, pendingInr: 0, paidOutInr: 0}.
 * Zero rupees had been transferred. ₹800 was the correct 80% lifetime share —
 * it was simply piped into EarningsCard's `totalPaid` prop, whose label reads
 * "Paid out". `pending` was passed literally `null`, so "Pending payout"
 * rendered as an em dash for every instructor.
 *
 * The API now returns paidOutInr / pendingPayoutInr off the Commission ledger.
 * This asserts the PAGE consumes them: the failure mode this repo keeps
 * shipping is one side of a contract landing without the other.
 */

const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
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
// EarningsCard is NOT stubbed away — the props it receives ARE the defect.
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

import WellnessDashboard from '../app/wellness-portal/page';

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <WellnessDashboard />
    </QueryClientProvider>,
  );
}

const TOKEN = 'demo-wellness-token';

/** One ₹1,000 enrolment: instructor share ₹800, nothing settled yet. */
const DASHBOARD_PAYLOAD = {
  profile: { fullName: 'Ananya Devi' },
  stats: {
    totalSessions: 1,
    upcomingSessions: 1,
    completedSessions: 0,
    totalStudents: 1,
    totalEarningsInr: 800,
    monthEarningsInr: 800,
    paidOutInr: 0,
    pendingPayoutInr: 800,
    instructorShare: 0.8,
    platformRate: 0.2,
  },
  upcomingSessions: [],
  recentSessions: [],
};

function mockFetch(dashboard: unknown) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/wellness-portal/dashboard')) {
      return { ok: true, status: 200, json: async () => dashboard } as Response;
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
    user: { fullName: 'Ananya Devi' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Gate on the fetch having landed. Without it the pre-fetch render satisfies a
 * `toBe('0')` assertion on the first tick and the test goes green against the
 * broken code.
 */
async function settled() {
  await waitFor(() => {
    expect(screen.getByTestId('earnings-card').getAttribute('data-this-month')).toBe('800');
  });
  return screen.getByTestId('earnings-card');
}

describe('AW-10 — wellness dashboard money cards', () => {
  it('feeds the settled figure (₹0) to the card labelled with settlement, not the lifetime total', async () => {
    vi.stubGlobal('fetch', mockFetch(DASHBOARD_PAYLOAD));
    renderDashboard();
    const card = await settled();
    expect(card.getAttribute('data-total-paid')).toBe('0');
  });

  it('passes a real pending-payout number instead of null (the em dash)', async () => {
    vi.stubGlobal('fetch', mockFetch(DASHBOARD_PAYLOAD));
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('earnings-card').getAttribute('data-pending')).toBe('800');
    });
  });

  it('renders null rather than a fabricated 0 when the API omits the split', async () => {
    const legacy = {
      ...DASHBOARD_PAYLOAD,
      stats: {
        ...DASHBOARD_PAYLOAD.stats,
        paidOutInr: undefined,
        pendingPayoutInr: undefined,
      },
    };
    vi.stubGlobal('fetch', mockFetch(legacy));
    renderDashboard();
    const card = await settled();
    // A blank is honest. A confident ₹0 "paid out" — or the old lifetime
    // figure — is not.
    expect(card.getAttribute('data-total-paid')).toBe('null');
    expect(card.getAttribute('data-pending')).toBe('null');
  });

  it('the lifetime net earning survives on the page, just not under a settlement label', async () => {
    vi.stubGlobal('fetch', mockFetch(DASHBOARD_PAYLOAD));
    renderDashboard();
    await settled();
    await waitFor(() => {
      expect(screen.getByTestId('lifetime-earnings')).toHaveTextContent('800');
    });
  });

  it('shows nothing rather than zeros when the dashboard fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/wellness-portal/dashboard')) {
          return { ok: false, status: 500, json: async () => ({}) } as Response;
        }
        return { ok: true, status: 200, json: async () => ({ kyc: null }) } as Response;
      }),
    );
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('earnings-card').getAttribute('data-total-paid')).toBe('null');
    });
    expect(screen.getByTestId('earnings-card').getAttribute('data-pending')).toBe('null');
  });
});
