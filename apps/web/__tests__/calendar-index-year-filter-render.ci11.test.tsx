import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { FESTIVALS, FESTIVAL_YEAR, festivalsInMonth } from '../lib/festivals';

/**
 * CI-11 (second rendering site) — the month ROUTE was fixed; the calendar
 * INDEX was not.
 *
 * app/calendar/page.tsx buckets festivals with `parseInt(mm, 10) - 1` on the
 * MONTH segment of `date2026` alone, so Maha Kumbh Mela (2027-01-14) is
 * rendered inside a section whose <h2> literally reads "January 2026", on a
 * page headed "Hindu Calendar 2026", with a 14-of-the-month date cell. The
 * same off-year row is counted in the "N festivals" strapline, in the January
 * jump-chip, and emitted into an ItemList JSON-LD named "Hindu Festival
 * Calendar 2026" as a 2027 Event.
 *
 * It also makes the two surfaces contradict each other: /calendar/january
 * (already year-filtered) and the January block of /calendar disagree on both
 * the count and the contents.
 *
 * Dropping the row outright would delete real content, so the index keeps it —
 * outside the twelve month sections, labelled with the year it actually falls
 * in.
 */

const PAGE = path.resolve(__dirname, '../app/calendar/page.tsx');

/**
 * A source-text guard that reads a COMMENT passes on a reverted file. Strip
 * both comment forms before asserting on anything.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// The index asks the live catalogue which pujas are bookable. That is a
// different finding's concern; pin it so this suite measures the year filter.
vi.mock('../lib/puja-catalogue', () => ({
  getCatalogueSlugs: vi.fn(async () => new Set<string>()),
  catalogueSlugsFromPayload: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
});

async function renderIndex() {
  const { default: CalendarPage } = await import('../app/calendar/page');
  return render(await CalendarPage());
}

function jsonLd(container: HTMLElement): Array<Record<string, unknown>> {
  const el = container.querySelector('script[type="application/ld+json"]')!;
  return JSON.parse(el.innerHTML) as Array<Record<string, unknown>>;
}

/** The off-year rows that make this finding real. */
const OFF_YEAR = FESTIVALS.filter((f) => !f.date2026.startsWith(`${FESTIVAL_YEAR}-`));
const IN_YEAR = FESTIVALS.filter((f) => f.date2026.startsWith(`${FESTIVAL_YEAR}-`));

describe('CI-11 — /calendar buckets and counts only the calendar year', () => {
  it('the corpus really does hold an off-year row that lands in a month section', () => {
    expect(OFF_YEAR.length).toBeGreaterThan(0);
    expect(OFF_YEAR.map((f) => f.slug)).toContain('maha-kumbh');
    expect(IN_YEAR.length).toBeLessThan(FESTIVALS.length);
  });

  it('no month section carries a festival from another year', async () => {
    const { container } = await renderIndex();
    for (let m = 0; m < 12; m++) {
      const section = container.querySelector(`#m-${m}`)!;
      expect(section, `section #m-${m}`).toBeTruthy();
      const hrefs = Array.from(section.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      for (const f of OFF_YEAR) {
        expect(hrefs, `${f.slug} in #m-${m}`).not.toContain(`/festival/${f.slug}`);
      }
    }
  });

  it('each month section holds exactly what the month route would show', async () => {
    const { container } = await renderIndex();
    for (let m = 0; m < 12; m++) {
      const section = container.querySelector(`#m-${m}`)!;
      const hrefs = Array.from(section.querySelectorAll('a'))
        .map((a) => a.getAttribute('href'))
        .filter((h): h is string => !!h && h.startsWith('/festival/'));
      expect(hrefs.sort(), `section #m-${m}`).toEqual(
        festivalsInMonth(m).map((f) => `/festival/${f.slug}`).sort(),
      );
    }
  });

  it('the jump chips count only in-year festivals', async () => {
    const { container } = await renderIndex();
    const januaryChip = Array.from(container.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '#m-0',
    )!;
    expect(januaryChip).toBeDefined();
    // The bug is only observable when the two counts differ.
    const monthOnly = FESTIVALS.filter((f) => Number(f.date2026.split('-')[1]) === 1).length;
    expect(monthOnly).toBeGreaterThan(festivalsInMonth(0).length);
    expect(januaryChip.textContent).toContain(`(${festivalsInMonth(0).length})`);
  });

  it('the strapline counts only the year the page is headed with', async () => {
    const { container } = await renderIndex();
    const header = container.querySelector('header')!;
    expect(header.textContent).toContain(`${IN_YEAR.length} festivals`);
    expect(header.textContent).not.toContain(`${FESTIVALS.length} festivals`);
  });

  it('the ItemList JSON-LD counts and lists only the in-year set', async () => {
    const { container } = await renderIndex();
    const [ld] = jsonLd(container);
    expect(ld['numberOfItems']).toBe(IN_YEAR.length);
    const items = ld['itemListElement'] as Array<{ item: { startDate: string } }>;
    expect(items).toHaveLength(IN_YEAR.length);
    for (const entry of items) {
      expect(entry.item.startDate.slice(0, 4)).toBe(String(FESTIVAL_YEAR));
    }
  });

  it('an off-year festival is still reachable, and carries the year it falls in', async () => {
    const { container } = await renderIndex();
    for (const f of OFF_YEAR) {
      const link = Array.from(container.querySelectorAll('a')).find(
        (a) => a.getAttribute('href') === `/festival/${f.slug}`,
      );
      expect(link, f.slug).toBeTruthy();
      // Outside the twelve month sections, so nothing files it under 2026.
      for (let m = 0; m < 12; m++) {
        expect(container.querySelector(`#m-${m}`)!.contains(link!), `${f.slug} in #m-${m}`).toBe(
          false,
        );
      }
      expect(link!.textContent, f.slug).toContain(f.date2026.slice(0, 4));
    }
  });

  it('the month-only bucket loop is gone from the route', () => {
    const src = stripComments(fs.readFileSync(PAGE, 'utf8'));
    expect(src).toMatch(/festivalsInMonth\(/);
    expect(src).not.toMatch(/parseInt\(mm/);
  });
});
