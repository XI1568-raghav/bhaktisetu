import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * RES-01 / RES-02 / RES-03 / RES-06 (prod sweep 2026-08-12).
 *
 * Three defects that always travel together, measured live with Playwright:
 *
 *  RES-01  Only the auth pair had a timeout. Every other fetch used a bare
 *          `fetch`, which never rejects on a stalled socket — /priest,
 *          /profile, /dashboard and /payouts held their spinner at T+10s AND
 *          at T+30s with no error and no retry, because the `finally` that
 *          clears the spinner sits after an `await` that never returns.
 *
 *  RES-02  7 of 10 authenticated pages answered an HTTP 500 by rendering
 *          fabricated zeros with NO error: "Available to withdraw ₹0",
 *          "₹0 Revenue This Month", "0 Total Cows", "No Bookings Yet — begin
 *          your spiritual journey" to a devotee who already has confirmed
 *          pujas. During an incident that tells every provider on the platform
 *          that their business earned nothing.
 *
 *  RES-03  /profile rendered a blank form on a failed load, and Save then
 *          PATCHed `null` for every field the user never touched — silently
 *          destroying gotra, nakshatra, rashi, city and email. Gotra and
 *          nakshatra are load-bearing for sankalp.
 *
 *  RES-06  A KYC fetch failure left the badge on its `unsubmitted` default, so
 *          an approved, Aadhaar-verified pandit was told "KYC required for
 *          payout" every time the backend hiccuped.
 *
 * These tests bind to the honest behaviour: a request that never answers must
 * carry an AbortSignal, and a load that failed must SAY SO next to any number
 * it could not fetch.
 */

const nav = { replace: vi.fn(), push: vi.fn(), params: new URLSearchParams() };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => '/',
  useSearchParams: () => nav.params,
}));

const authState = {
  session: { accessToken: 'test-token' } as { accessToken: string } | null,
  user: { id: 'u1', fullName: 'Demo Pandit', email: 'pandit@demo.com' },
  isAuthenticated: true,
  isLoading: false,
  signOut: vi.fn(),
};
vi.mock('../lib/auth-context', () => ({
  useAuth: () => authState,
}));

// NOT mocked: lib/api-config. The timeout helper it exports is the thing under
// test — stubbing the module out would make every assertion below vacuous.

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));
vi.mock('../components/PujaRecommendationWidget', () => ({ default: () => null }));
vi.mock('../components/dashboard/DevoteeTodaySection', () => ({ default: () => null }));
vi.mock('../components/profile/AddressManager', () => ({ default: () => null }));

import PayoutsPage from '../app/payouts/page';
import TempleDashboard from '../app/temple-portal/page';
import GaushalaDashboard from '../app/gaushala-portal/page';
import PriestDashboard from '../app/priest/page';
import ProfilePage from '../app/profile/page';
import AstrologerDashboard from '../app/astrologer-portal/page';
import WellnessDashboard from '../app/wellness-portal/page';
import DevoteeDashboard from '../app/dashboard/page';

const realFetch = globalThis.fetch;

/**
 * The wellness portal reads through react-query, so it needs a provider. One
 * client per render, retries off — a retry would mask the error state under
 * test.
 */
function render(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Every call answers with the given status and an error body. */
function failingFetch(status: number) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  ) as unknown as typeof fetch;
}

/**
 * The exact failure `fetchWithTimeout` produces on a stalled socket: the
 * AbortController fires and fetch rejects with an AbortError. A bare fetch can
 * never reach this state — it just never settles.
 */
function abortingFetch() {
  return vi.fn(async () => {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }) as unknown as typeof fetch;
}

/** Records the RequestInit of every call so we can inspect the signal. */
function recordingFetch(body: unknown = {}, status = 200) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

beforeEach(() => {
  authState.session = { accessToken: 'test-token' };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

// ─── RES-01: every data loader must carry an abort signal ──────────────────

describe('RES-01 — data loads carry a timeout, not just auth', () => {
  it('/payouts sends an AbortSignal (without one there is no timeout at all)', async () => {
    const { fn, calls } = recordingFetch({ availableInr: 0, pendingInr: 0, paidOutInr: 0, kycVerified: true, kycOnFile: true });
    globalThis.fetch = fn;

    render(<PayoutsPage />);

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    for (const c of calls) {
      expect(c.init?.signal, `${c.url} has no abort signal`).toBeInstanceOf(AbortSignal);
    }
  });

  it('/temple-portal sends an AbortSignal', async () => {
    const { fn, calls } = recordingFetch({ stats: null, recentBookings: [], profile: null });
    globalThis.fetch = fn;

    render(<TempleDashboard />);

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    for (const c of calls) {
      expect(c.init?.signal, `${c.url} has no abort signal`).toBeInstanceOf(AbortSignal);
    }
  });

  it('/priest sends an AbortSignal on both the dashboard and the KYC call', async () => {
    // 500 on both: the page falls back to its honest zeroDashboard baseline,
    // which keeps this test about the signal and not about payload shape.
    const { fn, calls } = recordingFetch({ error: 'Internal Server Error' }, 500);
    globalThis.fetch = fn;

    render(<PriestDashboard />);

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2));
    for (const c of calls) {
      expect(c.init?.signal, `${c.url} has no abort signal`).toBeInstanceOf(AbortSignal);
    }
  });

  it('/payouts surfaces a timed-out load instead of spinning forever', async () => {
    globalThis.fetch = abortingFetch();

    render(<PayoutsPage />);

    expect(await screen.findByText(/could not reach darshya|couldn't load live data/i)).toBeInTheDocument();
  });
});

// ─── RES-02: a failed load never renders a bare zero ───────────────────────

describe('RES-02 — fabricated zeros always carry the banner', () => {
  it('/payouts says the load failed instead of quietly showing ₹0 withdrawable', async () => {
    globalThis.fetch = failingFetch(500);

    render(<PayoutsPage />);

    expect(await screen.findByText(/couldn't load live data \(http 500\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('/temple-portal says the load failed instead of quietly showing ₹0 revenue', async () => {
    globalThis.fetch = failingFetch(500);

    render(<TempleDashboard />);

    expect(await screen.findByText(/couldn't load live data \(http 500\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('/gaushala-portal says the load failed instead of quietly showing 0 cows and ₹0 donations', async () => {
    globalThis.fetch = failingFetch(500);

    render(<GaushalaDashboard />);

    expect(await screen.findByText(/couldn't load live data \(http 500\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

// ─── RES-06: never accuse a verified provider of missing KYC ───────────────

describe('RES-06 — an unreadable KYC state is unknown, not unsubmitted', () => {
  it('/priest does not claim "KYC required for payout" when the KYC call 500s', async () => {
    globalThis.fetch = failingFetch(500);

    render(<PriestDashboard />);

    // Wait for the dashboard's own load-failure banner so we know both fetches
    // have settled — otherwise this could pass merely by racing the render.
    await screen.findByText(/could not load dashboard/i);
    expect(screen.queryByText(/kyc required for payout/i)).not.toBeInTheDocument();
  });

  it('/gaushala-portal does not claim "KYC required for payout" when the KYC call 500s', async () => {
    globalThis.fetch = failingFetch(500);

    render(<GaushalaDashboard />);

    await screen.findByText(/couldn't load live data \(http 500\)/i);
    expect(screen.queryByText(/kyc required for payout/i)).not.toBeInTheDocument();
  });
});

describe('RES-02 — the react-query portals surface their error too', () => {
  it('/astrologer-portal says the load failed instead of quietly showing 0 consultations', async () => {
    globalThis.fetch = failingFetch(500);

    render(<AstrologerDashboard />);

    expect(await screen.findByText(/couldn't load live data \(http 500\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('/astrologer-portal does not claim "KYC required for payout" when the KYC call 500s', async () => {
    globalThis.fetch = failingFetch(500);

    render(<AstrologerDashboard />);

    await screen.findByText(/couldn't load live data \(http 500\)/i);
    expect(screen.queryByText(/kyc required for payout/i)).not.toBeInTheDocument();
  });

  it('/wellness-portal says the load failed instead of quietly showing 0 students', async () => {
    globalThis.fetch = failingFetch(500);

    render(<WellnessDashboard />);

    expect(await screen.findByText(/couldn't load live data \(http 500\)/i)).toBeInTheDocument();
  });

  it('/dashboard does not tell a devotee "No Bookings Yet" when the load failed', async () => {
    globalThis.fetch = failingFetch(500);

    render(<DevoteeDashboard />);

    expect(await screen.findByText(/couldn't load live data \(http 500\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/no bookings yet/i)).not.toBeInTheDocument();
  });
});

// ─── RES-03: a blank profile must not be savable over real data ────────────

describe('RES-03 — a failed profile load cannot silently null out sankalp fields', () => {
  it('shows an error and disables Save when /users/me fails', async () => {
    globalThis.fetch = failingFetch(500);

    render(<ProfilePage />);

    expect(await screen.findByText(/couldn't load live data \(http 500\)/i)).toBeInTheDocument();
    const save = await screen.findByRole('button', { name: /save/i });
    expect(save).toBeDisabled();
  });

  it('PATCHes only the fields the user actually edited', async () => {
    const loaded = {
      user: {
        fullName: 'Asha Devi',
        email: 'asha@example.com',
        gotra: 'Kashyap',
        nakshatra: 'Rohini',
        rashi: 'Vrishabha',
        preferredLanguage: 'hi',
        locationCity: 'Gurugram',
        locationState: 'Haryana',
        isNri: false,
        nriCountry: '',
      },
    };
    const sent: Array<Record<string, unknown>> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        sent.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return new Response(JSON.stringify({ user: loaded.user }), { status: 200 });
      }
      return new Response(JSON.stringify(loaded), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    render(<ProfilePage />);

    const save = await screen.findByRole('button', { name: /save/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    (save as HTMLButtonElement).click();

    await waitFor(() => expect(sent.length).toBe(1));
    const payload = sent[0]!;
    // Nothing was edited, so nothing may be overwritten — least of all the
    // sankalp fields a puja is performed against.
    expect(payload).not.toHaveProperty('gotra');
    expect(payload).not.toHaveProperty('nakshatra');
    expect(payload).not.toHaveProperty('rashi');
    expect(payload).not.toHaveProperty('locationCity');
    expect(payload).not.toHaveProperty('email');
  });
});
