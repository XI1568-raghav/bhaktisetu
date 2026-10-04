import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Phase-1 delta sweep — three independent defects that share one root cause:
 * a slug written by an editor was trusted as a route without the live
 * catalogue ever confirming it, and a horizon was requested without the UI
 * that consumes it ever being measured.
 *
 * P1-A. lib/puja-link.ts CONTENT_PUJA_SLUG_ALIASES had no entry for the
 *   spelling the festival calendar uses for the Pitru Paksha shraadh
 *   (lib/festivals.ts:418 `pujasAvailable: ['pitru-paksha-shraadh', …]`).
 *   Pitru Paksha is the single highest-intent shraadh window of the year and
 *   pitru-dosh-nivaran-puja is the SKU sold for it, so that intent resolved
 *   to nothing bookable.
 *
 * P1-B. app/pujas/book/page.tsx asked /panchang/puja-muhurat for a 60-day
 *   horizon while the date picker's own ceiling is today+30
 *   (`getMaxDate() = istDatePlusDays(30)`, wired to DateInput `max`).
 *
 * P1-C. app/today/page.tsx linked `/pujas/${todayInfo.suggestedPuja}` raw.
 *   `/pujas/[slug]` sets `dynamicParams = false`, so a slug the catalogue does
 *   not sell is a hard 404 — four of the seven weekdays.
 */

const WEB = path.resolve(__dirname, '..');

/**
 * The live catalogue, as recorded by DF-02 against Postgres `puja_types`
 * (darshya_utf8, 2026-08-13) and re-used verbatim from
 * __tests__/festival-booking-links.test.tsx and
 * __tests__/content-booking-links.ci01.test.tsx so the suites cannot drift.
 */
const LIVE_CATALOGUE = new Set([
  'ganesh-puja',
  'hanuman-chalisa-path',
  'lakshmi-puja',
  'maha-mrityunjay-jaap',
  'navgraha-shanti-puja',
  'pitru-dosh-nivaran-puja',
  'ram-charit-manas-path',
  'rudrabhishek',
  'satyanarayan-katha',
  'sunderkand-path',
]);

function code(rel: string): string {
  return fs.readFileSync(path.join(WEB, rel), 'utf8');
}

/**
 * Source-text guards must never match a COMMENT. A guard that reads the
 * comment documenting the fix passes on a file where the fix was reverted.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

vi.mock('../lib/puja-catalogue', () => ({
  getCatalogueSlugs: vi.fn(async () => LIVE_CATALOGUE),
  catalogueSlugsFromPayload: vi.fn(),
}));

// /today's panchang card is a tolerant fetch (`.catch(() => null)`); this suite
// is about the booking link, so the card is held in its degraded state.
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  getTodayPanchang: vi.fn(async () => null),
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

// --- P1-A: the Pitru Paksha alias -------------------------------------------

describe('P1-A lib/puja-link resolves the festival calendar spelling of the Pitru Paksha shraadh', () => {
  it('the calendar really does use `pitru-paksha-shraadh` (the alias is anchored to live data)', async () => {
    const { FESTIVALS } = await import('../lib/festivals');
    const pitruPaksha = FESTIVALS.find((f) => f.slug === 'pitru-paksha');
    expect(pitruPaksha).toBeDefined();
    expect(pitruPaksha!.pujasAvailable).toContain('pitru-paksha-shraadh');
  });

  it('resolves it onto the puja the platform actually sells for that window', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(resolveContentPujas(['pitru-paksha-shraadh'], LIVE_CATALOGUE)).toEqual([
      'pitru-dosh-nivaran-puja',
    ]);
  });

  it('collapses onto the existing pitra-dosh-shanti spelling rather than duplicating the card', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(
      resolveContentPujas(['pitru-paksha-shraadh', 'pitra-dosh-shanti'], LIVE_CATALOGUE),
    ).toEqual(['pitru-dosh-nivaran-puja']);
  });

  it('still emits nothing when the catalogue is unreadable', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(resolveContentPujas(['pitru-paksha-shraadh'], new Set<string>())).toEqual([]);
  });

  it('does not upgrade the neighbouring rituals that are NOT this puja', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    // Tripindi Shraddha is a distinct, venue-qualified rite and pitru-tarpana
    // is the water offering, not the nivaran puja. Both must keep falling
    // through to "nothing bookable" rather than being sold as this SKU.
    expect(resolveContentPujas(['tripindi-shraddha'], LIVE_CATALOGUE)).toEqual([]);
    expect(resolveContentPujas(['pitru-tarpana'], LIVE_CATALOGUE)).toEqual([]);
  });
});

// --- P1-B: the muhurat horizon ----------------------------------------------

describe('P1-B the booking page does not ask for a muhurat horizon it cannot render', () => {
  it('the date picker ceiling is today+30', () => {
    const src = stripComments(code('app/pujas/book/page.tsx'));
    expect(src).toMatch(/function getMaxDate\(\)[\s\S]{0,120}?istDatePlusDays\(30\)/);
    expect(src).toMatch(/max=\{bookingWindowMax\}/);
    expect(src).toMatch(/const bookingWindowMax = useMemo\(\(\) => getMaxDate\(\), \[\]\)/);
  });

  it('requests exactly that horizon from /panchang/puja-muhurat', () => {
    // The request lives in lib/puja-muhurat.ts since the muhurat layer moved
    // out of the 2.7k-line page; the horizon is one constant, pinned to 30.
    const src = stripComments(code('lib/puja-muhurat.ts'));
    expect(src).toMatch(/MUHURAT_HORIZON_DAYS = 30\b/);
    expect(src).toMatch(/panchang\/puja-muhurat\?pujaType=[^`]*&days=\$\{MUHURAT_HORIZON_DAYS\}/);
    expect(src).not.toMatch(/days=60/);
  });
});

// --- P1-C: the /today suggested-puja tile -----------------------------------

/**
 * What each weekday's DAY_DEITY.suggestedPuja must resolve to once the tile
 * goes through the catalogue resolver. Sunday's `surya-namaskar` is a puja the
 * platform does not sell and has no alias, so it must degrade to the browse
 * page rather than 404.
 */
const EXPECTED_HREF_BY_WEEKDAY: Readonly<Record<number, string>> = {
  0: '/pujas', // surya-namaskar — not sold
  1: '/pujas/rudrabhishek',
  2: '/pujas/sunderkand-path', // sundarkand-path, via the sunder/sundar alias
  3: '/pujas/ganesh-puja',
  4: '/pujas/satyanarayan-katha', // satyanarayan-puja, via the katha alias
  5: '/pujas/lakshmi-puja',
  6: '/pujas/sunderkand-path',
};

/**
 * Seven consecutive days from a known Sunday (2026-08-23), pinned at noon UTC
 * so no runner timezone can shift the local weekday the page reads.
 */
const WEEK = [23, 24, 25, 26, 27, 28, 29].map((d) => new Date(Date.UTC(2026, 7, d, 12, 0, 0)));

function suggestedPujaHref(): string | null {
  const label = Array.from(document.querySelectorAll('a span')).find(
    (s) => (s.textContent ?? '').trim().toLowerCase() === 'suggested puja',
  );
  return label?.closest('a')?.getAttribute('href') ?? null;
}

describe('P1-C /today never links a puja slug the catalogue cannot serve', () => {
  it('every weekday resolves through the catalogue or falls back to /pujas', async () => {
    const seen = new Set<number>();
    for (const instant of WEEK) {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(instant);
      vi.resetModules();
      const weekday = new Date().getDay();
      seen.add(weekday);

      const { default: TodayPage } = await import('../app/today/page');
      const { unmount } = render(await TodayPage());

      expect(suggestedPujaHref(), `weekday ${weekday}`).toBe(EXPECTED_HREF_BY_WEEKDAY[weekday]);

      // Nothing else on the page may emit an unverified deep link either.
      for (const a of Array.from(document.querySelectorAll('a[href^="/pujas/"]'))) {
        const slug = (a.getAttribute('href') ?? '').replace('/pujas/', '');
        expect(LIVE_CATALOGUE.has(slug), `weekday ${weekday} slug ${slug}`).toBe(true);
      }

      unmount();
      vi.useRealTimers();
    }
    expect(seen.size).toBe(7);
  });

  it('falls back to the browse page — and drops the ritual name — when the catalogue is unreadable', async () => {
    const cat = await import('../lib/puja-catalogue');
    vi.mocked(cat.getCatalogueSlugs).mockResolvedValueOnce(new Set<string>());
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Monday — rudrabhishek IS sold, so a dead catalogue is the only thing
    // that can make this tile degrade.
    vi.setSystemTime(WEEK[1]!);

    const { default: TodayPage } = await import('../app/today/page');
    render(await TodayPage());

    expect(document.querySelectorAll('a[href^="/pujas/"]').length).toBe(0);
    expect(suggestedPujaHref()).toBe('/pujas');
    // Anti-fabrication: an unconfirmed ritual must not be named in the copy.
    expect((document.body.textContent ?? '').toLowerCase()).not.toContain('rudrabhishek');
  });

  it('the page routes through the resolver rather than interpolating the raw slug', () => {
    const src = stripComments(code('app/today/page.tsx'));
    expect(src).not.toMatch(/\/pujas\/\$\{todayInfo\.suggestedPuja\}/);
    expect(src).toMatch(/resolveContentPujas/);
    expect(src).toMatch(/getCatalogueSlugs/);
    expect(src).toMatch(/BROWSE_PUJAS_HREF/);
  });
});
