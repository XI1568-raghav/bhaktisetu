import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * AW-01 (2026-08-12, P0) — an astrologer could never see or join a
 * consultation they had already been PAID for.
 *
 * Two independent defects produced the same symptom:
 *
 * 1. apps/web/app/astrologer-portal/page.tsx — `upcomingSessions` appeared
 *    exactly once in the whole file (line 45, inside the TypeScript interface).
 *    It was fetched from GET /astrologer-portal/dashboard and thrown away; the
 *    panel below the stat cards was a HARDCODED empty state that read
 *    "No upcoming sessions" while the stat card directly above it read
 *    "1 Today's Sessions".
 *
 * 2. apps/web/app/astrologer-portal/consultations/page.tsx:78 — fetched
 *    GET /astrology/consultations?role=astrologer, served by
 *    astrology.service.ts:859-863 from an in-memory `this.sessions` Map that
 *    the paid booking flow never writes to. Verified live against the real
 *    onboarded astrologer (AstrologerProfile 71e54617-…, User ba87a424-…):
 *      /astrologer-portal/dashboard  -> upcomingSessions:[{reference:"AC-20260812-628085", …}]
 *      /astrology/consultations      -> {"consultations":[]}
 *    Same astrologer, same moment, two data sources, one of them always empty.
 *
 * The devotee pays, gets a Jitsi room and "Your astrologer has been notified."
 * The astrologer has no way to find that room. Every paid consultation is a
 * guaranteed no-show.
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
vi.mock('../components/provider/EarningsCard', () => ({
  default: () => <div data-testid="earnings-card" />,
}));
vi.mock('../components/provider/KycStatusBadge', () => ({
  default: () => <div data-testid="kyc-badge" />,
}));

import AstrologerDashboard from '../app/astrologer-portal/page';
import AstrologerConsultationsPage from '../app/astrologer-portal/consultations/page';

const TOKEN = 'demo-astro-token';

/** The exact row GET /astrologer-portal/dashboard returns for the real astrologer. */
const DASHBOARD_PAYLOAD = {
  profile: { fullName: 'Acharya Vinod Sharma', rating: 0, ratingCount: 0 },
  stats: {
    totalConsultations: 0,
    rating: 0,
    pricePerMinute: 25,
    approved: true,
    consultationsToday: 1,
    earningsTodayInr: 375,
    earningsMonthInr: 375,
    totalEarningsInr: 375,
    activeClients: 1,
  },
  upcomingSessions: [
    {
      id: '5523ab80-6591-43f0-9205-59ac341035b0',
      reference: 'AC-20260812-628085',
      user_id: '2b5bd615-1633-4c95-9b09-03efb2b9e429',
      minutes: 15,
      amount_inr: '375',
      scheduled_at: null,
      room_name: 'darshya-astrologer-acharya-vinod-sharma-e8cacedaa8ac09c2a4e5f132',
      status: 'confirmed',
      created_at: '2026-08-12T09:07:20.595Z',
      jitsiUrl:
        'https://meet.jit.si/darshya-astrologer-acharya-vinod-sharma-e8cacedaa8ac09c2a4e5f132',
    },
  ],
};

beforeEach(() => {
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue({
    session: { accessToken: TOKEN },
    user: { fullName: 'Acharya Vinod Sharma' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-01a — the dashboard renders the paid session it already fetched', () => {
  it('shows the reference and a join link, not the hardcoded empty state', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/astrologer-portal/dashboard')) {
        return { ok: true, json: async () => DASHBOARD_PAYLOAD } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(<AstrologerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/AC-20260812-628085/)).toBeInTheDocument();
    });
    const join = screen.getByRole('link', { name: /join/i });
    expect(join).toHaveAttribute(
      'href',
      'https://meet.jit.si/darshya-astrologer-acharya-vinod-sharma-e8cacedaa8ac09c2a4e5f132',
    );
    expect(screen.queryByText(/No upcoming sessions/i)).not.toBeInTheDocument();
  });

  it('still shows the empty state when the API genuinely returns no sessions', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/astrologer-portal/dashboard')) {
        return {
          ok: true,
          json: async () => ({ ...DASHBOARD_PAYLOAD, upcomingSessions: [] }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(<AstrologerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No upcoming sessions/i)).toBeInTheDocument();
    });
  });
});

describe('AW-01b — the Consultations page reads the DB-backed source', () => {
  it('fetches /consultation/astrologer/mine, never the in-memory /astrology/consultations', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, limit: 50, offset: 0, consultations: [] }),
    } as Response);

    render(<AstrologerConsultationsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/consultation/astrologer/mine'))).toBe(true);
    expect(urls.some((u) => u.includes('/astrology/consultations'))).toBe(false);
  });

  it('renders a confirmed consultation with its reference, amount and Join button', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 1,
        limit: 50,
        offset: 0,
        consultations: [
          {
            id: '5523ab80-6591-43f0-9205-59ac341035b0',
            reference: 'AC-20260812-628085',
            astrologerId: '71e54617-6963-418e-845f-920f4350505b',
            astrologerName: 'Acharya Vinod Sharma',
            minutes: 15,
            amountInr: 375,
            currency: 'INR',
            status: 'confirmed',
            roomName: 'darshya-astrologer-acharya-vinod-sharma-e8c',
            jitsiUrl: 'https://meet.jit.si/darshya-astrologer-acharya-vinod-sharma-e8c',
            scheduledAt: null,
            createdAt: '2026-08-12T09:07:20.595Z',
            paidAt: '2026-08-12T09:07:20.595Z',
          },
        ],
      }),
    } as Response);

    render(<AstrologerConsultationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/AC-20260812-628085/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
    expect(screen.queryByText(/No upcoming consultations/i)).not.toBeInTheDocument();
  });

  it('surfaces a fetch failure instead of rendering an empty "no consultations" lie', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as Response);

    render(<AstrologerConsultationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load consultations/i)).toBeInTheDocument();
    });
  });
});
