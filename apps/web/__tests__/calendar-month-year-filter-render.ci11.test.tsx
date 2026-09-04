import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { FESTIVALS, FESTIVAL_YEAR, festivalsInMonth } from '../lib/festivals';

/**
 * CI-11 (rendering half) — festival-month-year-filter.ci11.test.ts locks down
 * `festivalsInMonth`, the year-aware helper. Nothing consumed it:
 * app/calendar/[month]/page.tsx still filtered on the MONTH segment of
 * `date2026` alone, in FOUR places, so Maha Kumbh Mela (2027-01-14) was
 * counted in the <title>, counted in the OG title, listed as an upcoming
 * 14 January event under the heading "Hindu Festivals in January 2026",
 * emitted into the page's ItemList JSON-LD as a 2027 Event, and counted in
 * the "Jump to another month" chip for January.
 *
 * This file asserts the CONSUMPTION at all four sites.
 */

const PAGE = path.resolve(__dirname, '../app/calendar/[month]/page.tsx');

/**
 * A source-text guard that reads a COMMENT passes on a reverted file. Strip
 * both comment forms before asserting on anything.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// The month page asks the live catalogue which pujas are bookable. That is a
// different finding's concern; pin it so this suite measures the year filter.
vi.mock('../lib/puja-catalogue', () => ({
  getCatalogueSlugs: vi.fn(async () => new Set<string>()),
  catalogueSlugsFromPayload: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
});

async function renderMonth(month: string) {
  const { default: CalendarMonthPage } = await import('../app/calendar/[month]/page');
  return render(await CalendarMonthPage({ params: Promise.resolve({ month }) }));
}

function jsonLd(container: HTMLElement): Array<Record<string, unknown>> {
  const el = container.querySelector('script[type="application/ld+json"]')!;
  return JSON.parse(el.innerHTML) as Array<Record<string, unknown>>;
}

/** The off-year rows that make this finding real. */
const OFF_YEAR = FESTIVALS.filter((f) => !f.date2026.startsWith(`${FESTIVAL_YEAR}-`));

describe('CI-11 — /calendar/<month> counts and lists only the calendar year', () => {
  it('the corpus really does hold an off-year January date', () => {
    expect(OFF_YEAR.length).toBeGreaterThan(0);
    expect(OFF_YEAR.map((f) => f.slug)).toContain('maha-kumbh');
    expect(Number(OFF_YEAR.find((f) => f.slug === 'maha-kumbh')!.date2026.split('-')[1])).toBe(1);
  });

  it('the <title> and the OG title count only in-year festivals', async () => {
    const { generateMetadata } = await import('../app/calendar/[month]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ month: 'january' }) });
    const expected = festivalsInMonth(0).length;
    const monthOnly = FESTIVALS.filter(
      (f) => Number(f.date2026.split('-')[1]) === 1,
    ).length;
    // The bug is only observable when the two counts differ.
    expect(monthOnly).toBeGreaterThan(expected);

    expect(meta.title).toBe(
      `Hindu Festivals in January ${FESTIVAL_YEAR} — ${expected} Festivals with Dates`,
    );
    expect(meta.openGraph?.title).toBe(`January ${FESTIVAL_YEAR} — ${expected} Hindu festivals`);
  });

  it('the rendered list does not carry a 2027 festival', async () => {
    const { container } = await renderMonth('january');
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const f of OFF_YEAR) {
      expect(hrefs, f.slug).not.toContain(`/festival/${f.slug}`);
    }
    expect(screen.queryByText(/Maha Kumbh/i)).toBeNull();
  });

  it('the header count matches the in-year set', async () => {
    const { container } = await renderMonth('january');
    const n = festivalsInMonth(0).length;
    expect(container.textContent).toContain(`${n} festival`);
  });

  it('the ItemList JSON-LD counts and lists only the in-year set', async () => {
    const { container } = await renderMonth('january');
    const [ld] = jsonLd(container);
    const inYear = festivalsInMonth(0);
    expect(ld['numberOfItems']).toBe(inYear.length);
    const items = ld['itemListElement'] as Array<{ item: { url: string; startDate: string } }>;
    expect(items).toHaveLength(inYear.length);
    for (const entry of items) {
      expect(entry.item.startDate.slice(0, 4)).toBe(String(FESTIVAL_YEAR));
    }
  });

  it('the "Jump to another month" chips count only in-year festivals', async () => {
    // Rendered from a month with no off-year rows of its own, so the January
    // chip is the one under test.
    const { container } = await renderMonth('march');
    const januaryChip = Array.from(container.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/calendar/january',
    )!;
    expect(januaryChip).toBeDefined();
    expect(januaryChip.textContent).toContain(`(${festivalsInMonth(0).length})`);
  });

  it('every month page agrees with the helper', async () => {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    for (let i = 0; i < months.length; i++) {
      const { container, unmount } = await renderMonth(months[i]!);
      const [ld] = jsonLd(container);
      expect(ld['numberOfItems'], months[i]).toBe(festivalsInMonth(i).length);
      unmount();
    }
  });

  it('the month-only parseInt filter is gone from the route', () => {
    const src = stripComments(fs.readFileSync(PAGE, 'utf8'));
    expect(src).toMatch(/festivalsInMonth\(/);
    expect(src).not.toMatch(/parseInt\(\s*f\.date2026/);
    expect(src).not.toMatch(/FESTIVALS\.filter/);
  });
});
