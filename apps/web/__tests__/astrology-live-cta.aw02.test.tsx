import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AW-02, residual — the "Live Consultation" card on /astrology was a dead,
 * mispriced CTA.
 *
 * Two defects in one card:
 *   1. It was a bare `<div className="... cursor-pointer">` with no href and no
 *      onClick. Every onClick in the file was on other elements, so the card
 *      looked clickable, had the hover lift and the arrow affordance, and did
 *      nothing at all when clicked.
 *   2. Its price line read "From Rs. 10/min" as STATIC COPY, while the cheapest
 *      real astrologer is Ritika Menon at Rs 18/min. The one number on the card
 *      was invented, and invented LOW — a price the product cannot honour.
 *
 * It is now a real link to the directory below it, and the price is derived
 * from the loaded astrologers (or omitted when no rate is known — never a
 * fabricated floor).
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
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: () => "Couldn't load live data.",
}));

function astrologer(over: Record<string, unknown> = {}) {
  return {
    id: '71e54617-6963-418e-845f-920f4350505b',
    userId: 'ba87a424-e9d2-44f1-92a9-996441b31131',
    name: 'Acharya Vinod Sharma',
    specializations: ['Vedic Astrology'],
    languages: ['Hindi'],
    experienceYears: 22,
    rating: 0,
    consultationCount: 0,
    perMinuteRate: 25,
    isOnline: true,
    mode: { chat: true, call: true },
    bio: null,
    verified: true,
    ...over,
  };
}

function wireLive(astrologers: unknown[]) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ astrologers, total: astrologers.length, source: 'live' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ) as never;
}

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

describe('AW-02 — the Live Consultation CTA is real and honestly priced', () => {
  it('no longer hardcodes the Rs 10/min floor anywhere in the source', () => {
    // COMMENTS STRIPPED FIRST. This assertion failed on its first run against
    // the FIXED file, because the comment explaining the fix quotes the very
    // string it bans — the same defect that has now bitten five guards in this
    // sweep (a localStorage ban tripping on the comment explaining the ban, a
    // findMany ratchet held over baseline by a comment describing a deleted
    // query). A scanner that reads source as text and does not strip comments
    // is measuring its own documentation.
    const src = readFileSync(CLIENT, 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // JSX comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/^[ \t]*\/\/.*$/gm, ''); // line comments

    // The literal that was on the card. Its absence is the point: any
    // "From Rs. N/min" must now come from loaded data.
    expect(src).not.toMatch(/From Rs\. 10\/min/);
    // And nothing else may hardcode a per-minute price either.
    expect(src).not.toMatch(/From Rs\. \d+\/min/);
  });

  it('quotes the CHEAPEST REAL astrologer, not an invented floor', async () => {
    wireLive([
      astrologer({ perMinuteRate: 25 }),
      astrologer({ id: 'b-2', name: 'Ritika Menon', perMinuteRate: 18 }),
      astrologer({ id: 'b-3', name: 'Dr. Mahesh Iyer', perMinuteRate: 20 }),
    ]);
    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText(/From Rs\. 18\/min/)).toBeTruthy();
    });
    // The old invented price must not be on the page at all.
    expect(screen.queryByText(/From Rs\. 10\/min/)).toBeNull();
  });

  it('renders the card as a real link, not a dead div', async () => {
    wireLive([astrologer()]);
    const Page = await loadPage();
    const { container } = render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Live Consultation')).toBeTruthy();
    });

    // Walk up from the heading to the nearest anchor. A dead <div> has none.
    const heading = screen.getByText('Live Consultation');
    const link = heading.closest('a');
    expect(link, 'Live Consultation card is still not clickable').toBeTruthy();
    expect(link!.getAttribute('href')).toBeTruthy();

    // And the destination has to exist on the page.
    const href = link!.getAttribute('href')!;
    if (href.startsWith('#')) {
      expect(container.querySelector(href)).toBeTruthy();
    }
  });

  it('quotes no price at all rather than inventing one when supply is empty', async () => {
    wireLive([]);
    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Live Consultation')).toBeTruthy();
    });
    expect(screen.queryByText(/From Rs\./)).toBeNull();
  });

  it('ignores a null/zero rate instead of quoting Rs 0/min', async () => {
    wireLive([
      astrologer({ perMinuteRate: null }),
      astrologer({ id: 'b-2', perMinuteRate: 0 }),
      astrologer({ id: 'b-3', perMinuteRate: 22 }),
    ]);
    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText(/From Rs\. 22\/min/)).toBeTruthy();
    });
    expect(screen.queryByText(/From Rs\. 0\/min/)).toBeNull();
  });
});
