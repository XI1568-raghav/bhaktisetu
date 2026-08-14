import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AW-03 (2026-08-12, P0) — /astrology/astrologers/live was a hard 404.
 *
 * The API route has existed since PR #235 and is healthy:
 *   apps/api/src/routes/astrology.ts:132  server.get('/astrologers/live', ...)
 *   GET /api/v1/astrology/astrologers/live -> { astrologers, total, source: 'live' }
 *
 * It is the ONLY surface that lists genuinely onboarded AstrologerProfile rows
 * (the /astrology grid reads a 15-row in-memory mock fixture). No page in the
 * app router ever consumed it, so the go-online toggle in the astrologer portal
 * was decorative: an astrologer could flip themselves online and no consumer
 * surface would ever show them.
 *
 * Two things are pinned here.
 *
 * 1. ROUTE EXISTENCE — the app-router file must exist, in the style of
 *    booking-cta-routes.test.ts. A unit test cannot open a browser, but it can
 *    assert the file the router resolves is on disk and still talks to the
 *    endpoint it is supposed to talk to.
 *
 * 2. NO FABRICATED SUPPLY — this codebase has a repeated defect class where a
 *    failed or empty fetch renders fixture data as though it were real
 *    (AstrologyClient.tsx keeps 15 invented astrologers as an "error-only
 *    safety net" and sells consultations with them; a pandit profile page shows
 *    another person's verified identity on any 401). A directory of REAL people
 *    must never invent one. On error it must say so; on empty it must say so.
 */

const LIVE_DIR = join(process.cwd(), 'app', 'astrology', 'astrologers', 'live');
const PAGE = join(LIVE_DIR, 'page.tsx');

function liveRouteSource(): string {
  return readdirSync(LIVE_DIR)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map((f) => readFileSync(join(LIVE_DIR, f), 'utf8'))
    .join('\n');
}

describe('AW-03 — /astrology/astrologers/live route exists', () => {
  it('the app-router page exists — without it the only real-astrologer directory 404s', () => {
    expect(existsSync(PAGE), `missing route: ${PAGE}`).toBe(true);
  });

  it('consumes GET /astrology/astrologers/live (the real directory), not the mock /astrologers list', () => {
    const src = liveRouteSource();
    expect(src).toContain('/astrology/astrologers/live');
  });

  it('ships no fabricated astrologers — no fixture names, ids or stock portraits', () => {
    const src = liveRouteSource();
    // Names lifted from AstrologyClient.tsx's fallbackAstrologers.
    for (const invented of ['Raghunath Sharma', 'Meera Devi', 'Vikram Joshi', 'Bhaskar Rao']) {
      expect(src, `live directory must not hardcode "${invented}"`).not.toContain(invented);
    }
    // Mock directory ids ("astro_001" …) belong to the in-memory fixture.
    expect(src, 'live directory must not reference mock astro_* ids').not.toMatch(/astro_\d{3}/);
    // Stock portrait pool — attaching one to a named real astrologer publishes
    // a stranger's face as that person's likeness.
    expect(src, 'live directory must not use the stock portrait pool').not.toContain(
      'getAstrologerImage',
    );
  });
});

const REAL_PAYLOAD = {
  astrologers: [
    {
      id: '71e54617-6963-418e-845f-920f4350505b',
      userId: 'ba87a424-0000-0000-0000-000000000001',
      name: 'Acharya Vinod Sharma',
      specializations: ['Vedic Astrology'],
      languages: ['Hindi', 'English'],
      experienceYears: 12,
      rating: 4.6,
      consultationCount: 31,
      perMinuteRate: 25,
      isOnline: true,
      // Presence shape is the API's: apps/api/src/services/astrologer.service.ts
      // returns mode as { chat, call }, never a string.
      mode: { chat: true, call: true },
      bio: 'Parashari astrologer.',
      verified: true,
    },
    {
      id: '9641be46-1111-4111-8111-111111111111',
      userId: 'ba87a424-0000-0000-0000-000000000002',
      name: 'Ritika Menon',
      specializations: ['Tarot'],
      languages: ['English', 'Malayalam'],
      experienceYears: 6,
      rating: 4.4,
      consultationCount: 9,
      perMinuteRate: 18,
      isOnline: false,
      mode: { chat: true, call: false },
      bio: null,
      verified: true,
    },
  ],
  total: 2,
  source: 'live',
};

async function loadClient() {
  const mod = await import('../app/astrology/astrologers/live/LiveAstrologersClient');
  return mod.default;
}

function mockFetchResolved(payload: unknown, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  } as Response);
}

describe('AW-03 — the live directory renders real supply and never invents any', () => {
  // Pay the cold transform of the component + its icon deps here rather than
  // inside the first test's 5s budget — on a loaded machine that import alone
  // took 5.07s and flaked the suite.
  beforeAll(async () => {
    await loadClient();
  }, 60_000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the astrologers the API returned, linking each to its real profile id', async () => {
    mockFetchResolved(REAL_PAYLOAD);
    const LiveAstrologersClient = await loadClient();

    render(<LiveAstrologersClient />);

    await waitFor(() => {
      expect(screen.getByText('Acharya Vinod Sharma')).toBeInTheDocument();
    });
    expect(screen.getByText('Ritika Menon')).toBeInTheDocument();

    const link = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href')?.includes('71e54617-6963-418e-845f-920f4350505b'));
    expect(link, 'card must link to the real AstrologerProfile id').toBeTruthy();
  });

  it('hits the live endpoint, not the mock directory', async () => {
    const spy = mockFetchResolved(REAL_PAYLOAD);
    const LiveAstrologersClient = await loadClient();

    render(<LiveAstrologersClient />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toContain('/astrology/astrologers/live');
  });

  it('says the directory is empty when the API returns zero — it does not fill the gap', async () => {
    mockFetchResolved({ astrologers: [], total: 0, source: 'live' });
    const LiveAstrologersClient = await loadClient();

    const { container } = render(<LiveAstrologersClient />);

    await waitFor(() => {
      expect(container.textContent).toMatch(/no astrologers/i);
    });
    expect(screen.queryByText('Acharya Vinod Sharma')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Raghunath Sharma/);
  });

  it('shows an honest error when the fetch fails — no fixture astrologers appear', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));
    const LiveAstrologersClient = await loadClient();

    const { container } = render(<LiveAstrologersClient />);

    await waitFor(() => {
      expect(container.textContent).toMatch(/couldn't load|could not load|try again/i);
    });
    // The whole point: a failed load must not become a directory of invented
    // people that a devotee can pay to consult.
    expect(container.textContent).not.toMatch(/Raghunath Sharma|Meera Devi|Vikram Joshi/);
    expect(screen.queryAllByRole('link').some((a) => /\/book$/.test(a.getAttribute('href') ?? ''))).toBe(
      false,
    );
  });

  it('shows an honest error on a non-OK response too', async () => {
    mockFetchResolved({ error: 'boom' }, false, 500);
    const LiveAstrologersClient = await loadClient();

    const { container } = render(<LiveAstrologersClient />);

    await waitFor(() => {
      expect(container.textContent).toMatch(/couldn't load|could not load|try again/i);
    });
    expect(container.textContent).not.toMatch(/Raghunath Sharma|Meera Devi/);
  });
});
