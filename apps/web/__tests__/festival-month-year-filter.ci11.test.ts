import { describe, it, expect } from 'vitest';
import { FESTIVALS, FESTIVAL_YEAR, festivalsInMonth, getFestival } from '../lib/festivals';

// CI-11 — Maha Kumbh Mela is dated 2027-01-14 in a field called `date2026`.
// /calendar/january filters with `parseInt(f.date2026.split('-')[1])`, i.e. the
// MONTH segment only, so a 2027 festival is listed under the heading "Hindu
// Festivals in January 2026" and counted in that page's title and JSON-LD.

describe('CI-11 — a month page cannot inherit a festival from another year', () => {
  it('the catalogue really does hold an off-year date', () => {
    const kumbh = getFestival('maha-kumbh');
    expect(kumbh).toBeDefined();
    expect(kumbh!.date2026.slice(0, 4)).not.toBe(String(FESTIVAL_YEAR));
  });

  it('the month-only filter that shipped picks it up', () => {
    // This is the exact expression app/calendar/[month]/page.tsx uses.
    const monthOnly = FESTIVALS.filter(
      (f) => parseInt(f.date2026.split('-')[1] || '0', 10) === 1,
    );
    expect(monthOnly.map((f) => f.slug)).toContain('maha-kumbh');
  });

  it('festivalsInMonth filters on the year as well', () => {
    expect(festivalsInMonth(0).map((f) => f.slug)).not.toContain('maha-kumbh');
    expect(festivalsInMonth(0, 2027).map((f) => f.slug)).toEqual(['maha-kumbh']);
  });

  it('every festival festivalsInMonth returns is in the year asked for', () => {
    for (let m = 0; m < 12; m++) {
      for (const f of festivalsInMonth(m)) {
        expect(f.date2026.slice(0, 4), f.slug).toBe(String(FESTIVAL_YEAR));
        expect(Number(f.date2026.split('-')[1]), f.slug).toBe(m + 1);
      }
    }
  });

  it('the twelve months together account for every in-year festival', () => {
    const covered = Array.from({ length: 12 }, (_, m) => festivalsInMonth(m)).flat();
    const inYear = FESTIVALS.filter((f) => f.date2026.startsWith(`${FESTIVAL_YEAR}-`));
    expect(covered).toHaveLength(inYear.length);
  });

  it('the /festival index flags a card that is not in the calendar year', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { default: FestivalIndex } = await import('../app/festival/page');
    render(FestivalIndex());
    const offYear = FESTIVALS.filter((f) => !f.date2026.startsWith(`${FESTIVAL_YEAR}-`));
    expect(offYear.length).toBeGreaterThan(0);
    for (const f of offYear) {
      const card = screen
        .getAllByRole('link')
        .find((a) => a.getAttribute('href') === `/festival/${f.slug}`)!;
      expect(card, f.slug).toBeDefined();
      // The page is headed "Hindu festival calendar 2026"; a 2027 date on that
      // grid has to say so on the card itself.
      expect(card.textContent, f.slug).toContain(`Not in ${FESTIVAL_YEAR}`);
    }
  });
});