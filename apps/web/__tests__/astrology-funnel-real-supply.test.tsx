import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AW-02 (2026-08-12, P0) — the main consumer astrology funnel sold
 * consultations with 15 FICTIONAL astrologers.
 *
 * /astrology fetched `GET /astrology/astrologers?limit=100`, served from a
 * 15-row in-memory fixture (apps/api/src/services/astrology.service.ts:118-374,
 * ids 'astro_001'..'astro_015'), and seeded its own state with an identical
 * hardcoded copy (AstrologyClient.tsx:74 `fallbackAstrologers`) so the invented
 * people rendered even before the fetch resolved and stayed rendered if it
 * failed. Clicking any card led to a real Razorpay charge: ₹750 captured
 * against 'astro_001', Jitsi room minted, "Your astrologer has been notified",
 * and NO Commission row — verify-payment skipped the ledger write because no
 * real provider existed to credit. Meanwhile the 3 genuinely onboarded
 * astrologers appeared nowhere in the funnel and could never earn.
 *
 * The grid now reads `GET /astrology/astrologers/live` — approved
 * AstrologerProfile rows only. Supplying MORE real astrologers is owner-gated
 * (they must be recruited, vetted and onboarded); what is fixed here is that
 * the product no longer takes money against people who do not exist. When
 * there is no real supply the page says so.
 */

const CLIENT = join(process.cwd(), 'app', 'astrology', 'AstrologyClient.tsx');

const useRouterMock = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock,
  usePathname: () => '/astrology',
  useSearchParams: () => new URLSearchParams(),
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
}));

const LIVE_PAYLOAD = {
  astrologers: [
    {
      id: '71e54617-6963-418e-845f-920f4350505b',
      userId: 'ba87a424-e9d2-44f1-92a9-996441b31131',
      name: 'Acharya Vinod Sharma',
      specializations: ['Vedic Astrology'],
      languages: ['Hindi', 'Sanskrit', 'English'],
      experienceYears: 22,
      rating: 0,
      consultationCount: 0,
      perMinuteRate: 25,
      isOnline: true,
      mode: { chat: true, call: true },
      bio: 'Vedic astrologer with 22 years of experience.',
      verified: true,
    },
  ],
  total: 1,
  source: 'live',
};

async function loadPage() {
  const mod = await import('../app/astrology/AstrologyClient');
  return mod.default;
}

beforeEach(() => {
  useRouterMock.replace.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-02 — the /astrology grid is bound to REAL supply', () => {
  it('source carries no hardcoded astrologer fixture at all', () => {
    const src = readFileSync(CLIENT, 'utf8');
    // The 15 invented people and the stock portraits attached to them.
    for (const invented of [
      'Raghunath Sharma',
      'Meera Devi',
      'Vikram Joshi',
      'Bhaskar Rao',
      'Gopal Das',
    ]) {
      expect(src, `/astrology must not hardcode "${invented}"`).not.toContain(invented);
    }
    expect(src, '/astrology must not reference mock astro_* ids').not.toMatch(/astro_\d{3}/);
    expect(src, 'the fabricated fallback array must be gone').not.toContain('fallbackAstrologers');
  });

  it('fetches the live directory, not the mock /astrologers list', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => LIVE_PAYLOAD,
    } as Response);

    const AstrologyPage = await loadPage();
    render(<AstrologyPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/astrology/astrologers/live'))).toBe(true);
    expect(urls.some((u) => /\/astrology\/astrologers\?/.test(u))).toBe(false);
  });

  it('renders the real onboarded astrologer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => LIVE_PAYLOAD,
    } as Response);

    const AstrologyPage = await loadPage();
    render(<AstrologyPage />);

    await waitFor(() => {
      expect(screen.getByText('Acharya Vinod Sharma')).toBeInTheDocument();
    });
  });

  it('says the directory is empty rather than inventing astrologers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ astrologers: [], total: 0, source: 'live' }),
    } as Response);

    const AstrologyPage = await loadPage();
    render(<AstrologyPage />);

    await waitFor(() => {
      expect(screen.getByText(/No astrologers are available/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Raghunath Sharma/)).not.toBeInTheDocument();
  });

  it('says the fetch failed rather than falling back to fixture astrologers', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const AstrologyPage = await loadPage();
    render(<AstrologyPage />);

    await waitFor(() => {
      expect(screen.getByText(/could not load the astrologer directory/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Raghunath Sharma/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Meera Devi/)).not.toBeInTheDocument();
  });
});
