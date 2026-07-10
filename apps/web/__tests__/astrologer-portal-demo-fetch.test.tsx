import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// P0 #AP-07 (2026-07-10) regression guard. The astrologer-portal dashboard
// used to bail out of its API fetch whenever the session token started with
// 'demo-', leaving a demo astrologer on hardcoded ZERO_STATS forever and
// masking backend bugs during demo logins. The fix removes that skip so the
// fetch runs for demo tokens too (the API accepts them in non-prod). These
// tests pin that behaviour: with a demo token the dashboard fetch MUST fire
// and the rendered stats MUST reflect the API response, not the zero fallback.

// Stub auth-context so the page sees a DEMO session without a provider tree.
const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

// API_BASE_URL is a plain constant; stub it to a sentinel we can assert on.
vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
}));

// Heavy children that would pull in their own fetches / context — stub them
// to inert renders so the test isolates the dashboard fetch behaviour.
vi.mock('../components/MyProviderProfileCard', () => ({
  default: () => <div data-testid="profile-card" />,
}));
vi.mock('../components/provider/EarningsCard', () => ({
  default: () => <div data-testid="earnings-card" />,
}));
vi.mock('../components/provider/KycStatusBadge', () => ({
  default: () => <div data-testid="kyc-badge" />,
}));

import AstrologerDashboard from '../app/astrologer-portal/page';

const DEMO_TOKEN = 'demo-astro-token';

function mockFetchOnce(payload: unknown) {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => payload,
  } as Response);
  return fetchSpy;
}

describe('AP-07 — astrologer portal fetches the dashboard for DEMO sessions', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      session: { accessToken: DEMO_TOKEN },
      user: { fullName: 'Demo Astrologer' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the dashboard API with the demo Bearer token (no demo-skip)', async () => {
    const fetchSpy = mockFetchOnce({
      profile: { fullName: 'Demo Astrologer', rating: 4.9, ratingCount: 12 },
      stats: {
        totalConsultations: 42,
        rating: 4.9,
        pricePerMinute: 30,
        approved: true,
        consultationsToday: 3,
        earningsTodayInr: 900,
        earningsMonthInr: 12000,
        totalEarningsInr: 54000,
        activeClients: 7,
      },
      upcomingSessions: [],
    });

    render(<AstrologerDashboard />);

    // The dashboard fetch must have fired with the demo token in the header.
    await waitFor(() => {
      const dashboardCall = fetchSpy.mock.calls.find(
        (c) => (c[0] as string).includes('/astrologer-portal/dashboard'),
      );
      expect(dashboardCall).toBeTruthy();
      const opts = dashboardCall![1] as RequestInit;
      expect((opts.headers as Record<string, string>).Authorization).toBe(`Bearer ${DEMO_TOKEN}`);
    });
  });

  it('renders the API stat (42) — NOT the ZERO_STATS fallback (0)', async () => {
    mockFetchOnce({
      profile: { fullName: 'Demo Astrologer', rating: 4.9, ratingCount: 12 },
      stats: {
        totalConsultations: 42,
        rating: 4.9,
        pricePerMinute: 30,
        approved: true,
        consultationsToday: 3,
        earningsTodayInr: 900,
        earningsMonthInr: 12000,
        totalEarningsInr: 54000,
        activeClients: 7,
      },
      upcomingSessions: [],
    });

    render(<AstrologerDashboard />);

    // The "Total Consultations" card renders the API value (42), proving the
    // response was applied. Under the old demo-skip bug this stayed "0".
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
    expect(screen.queryByText('Total Consultations')).toBeInTheDocument();
  });
});
