import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCalendarDays,
  calendarMonthLabel,
  formatUpcomingFestivals,
} from '../lib/panchang-calendar';

/**
 * DF-09 (prod sweep 2026-08-12). Loaded live on 11 August 2026 the page showed
 * a correct header ("Tuesday, August 11, 2026") above a month grid reading
 * "April 2026", a masa label of "Chaitra-Vaishakha" (the March-May window), and
 * an "Upcoming Festivals & Vrats" list containing the literal strings
 * "2026-08-14T00:00:00.000Z" and "2026-08-25T00:00:00.000Z".
 */

const WEB = path.resolve(__dirname, '..');
const src = (rel: string) =>
  fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('calendar grid follows the clock', () => {
  it('labels the month the given date falls in', () => {
    expect(calendarMonthLabel(new Date(2026, 7, 11))).toBe('August 2026');
    expect(calendarMonthLabel(new Date(2026, 0, 1))).toBe('January 2026');
  });

  it('starts on the Sunday on or before the first of the month', () => {
    // 1 August 2026 is a Saturday, so the grid opens on Sunday 26 July.
    const cells = buildCalendarDays(new Date(2026, 7, 11));
    expect(cells[0]).toMatchObject({ day: 26, month: 'prev' });
  });

  it('marks exactly one cell as today, and it is the right one', () => {
    const cells = buildCalendarDays(new Date(2026, 7, 11));
    const todays = cells.filter((c) => c.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0]).toMatchObject({ day: 11, month: 'current', iso: '2026-08-11' });
  });

  it('covers every day of the month', () => {
    const cells = buildCalendarDays(new Date(2026, 7, 11));
    const current = cells.filter((c) => c.month === 'current').map((c) => c.day);
    expect(current).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it('handles a February and a month starting on Sunday', () => {
    expect(buildCalendarDays(new Date(2027, 1, 10)).filter((c) => c.month === 'current')).toHaveLength(
      28,
    );
    // 1 November 2026 is a Sunday.
    const nov = buildCalendarDays(new Date(2026, 10, 15));
    expect(nov[0]).toMatchObject({ day: 1, month: 'current' });
  });
});

describe('upcoming festivals never render a machine timestamp', () => {
  it('formats the date and keeps the name', () => {
    expect(
      formatUpcomingFestivals([{ date: '2026-08-14T00:00:00.000Z', name: 'Janmashtami' }]),
    ).toEqual([{ label: '14 August 2026', name: 'Janmashtami' }]);
  });

  it('drops a nameless row rather than printing the ISO string as the name', () => {
    expect(formatUpcomingFestivals([{ date: '2026-08-14T00:00:00.000Z', name: '' }])).toEqual([]);
    expect(formatUpcomingFestivals([{ date: '2026-08-25T00:00:00.000Z' }])).toEqual([]);
  });

  it('recovers a name from the local calendar when the API omits it', () => {
    expect(
      formatUpcomingFestivals([{ date: '2026-08-14T00:00:00.000Z' }], (d) =>
        d === '2026-08-14' ? 'Janmashtami' : undefined,
      ),
    ).toEqual([{ label: '14 August 2026', name: 'Janmashtami' }]);
  });

  it('drops an unparseable date instead of rendering NaN', () => {
    expect(formatUpcomingFestivals([{ date: 'not-a-date', name: 'X' }])).toEqual([]);
  });
});

describe('the /panchang page uses the derived values', () => {
  const page = () => src('app/panchang/page.tsx');

  it('no longer ships a hardcoded April grid', () => {
    expect(page()).not.toMatch(/const calendarDays = \[/);
    expect(page()).not.toMatch(/>April 2026</);
    expect(page()).toMatch(/buildCalendarDays/);
    expect(page()).toMatch(/calendarMonthLabel/);
  });

  it('no longer prints a fixed lunar month', () => {
    expect(page()).not.toMatch(/Chaitra-Vaishakha/);
  });

  it('routes the festival list through the formatter', () => {
    expect(page()).toMatch(/formatUpcomingFestivals/);
  });
});
