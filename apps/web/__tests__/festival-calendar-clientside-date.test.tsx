import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FESTIVALS, nextFestival } from '../lib/festivals';
import { NextFestivalHero, FestivalCountdownBadge, pickNextFestival, daysUntil } from '../app/festival/FestivalLive';
import { CalendarTodayMarkers } from '../app/calendar/CalendarTodayMarkers';

/**
 * /festival, /festival/<slug>, /calendar and /calendar/<month> are prerendered once and
 * served from Cloudflare assets (no Worker, so no cold-start error 1102). Everything
 * that depends on today's date therefore runs in the browser. These tests pin that the
 * browser logic gives the answers the server used to give.
 */
const WEB = join(__dirname, '..');
const lite = FESTIVALS.map(({ slug, name, sanskrit, deity, date2026 }) => ({ slug, name, sanskrit, deity, date2026 }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('next festival (same rule as lib/festivals.nextFestival)', () => {
  it.each(['2026-01-01', '2026-06-15', '2026-10-30', '2026-12-31'])('picks the same festival as the server rule on %s', (day) => {
    const server = nextFestival(new Date(`${day}T10:00:00Z`));
    const browser = pickNextFestival(lite, day);
    expect(browser?.slug).toBe(server?.slug);
  });

  it('renders nothing on the server and the hero after mount', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T08:00:00Z'));
    render(<NextFestivalHero festivals={lite} />);
    const expected = nextFestival(new Date('2026-10-30T08:00:00Z'))!;
    expect(screen.getByText('Next festival')).toBeTruthy();
    expect(screen.getByRole('link', { name: new RegExp(`Plan ${expected.name}`) }).getAttribute('href')).toBe(`/festival/${expected.slug}`);
  });
});

describe('countdown badge', () => {
  const at = (iso: string) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(iso));
  };
  it('says Today on the day', () => {
    at('2026-11-08T05:00:00Z');
    render(<FestivalCountdownBadge iso="2026-11-08" />);
    expect(screen.getByText('Today')).toBeTruthy();
  });
  it('says In N days inside 30 days', () => {
    at('2026-11-01T05:00:00Z');
    render(<FestivalCountdownBadge iso="2026-11-08" />);
    expect(screen.getByText('In 7 days')).toBeTruthy();
  });
  it('says Returns next year once passed and nothing when far away', () => {
    at('2026-11-20T05:00:00Z');
    const { unmount } = render(<FestivalCountdownBadge iso="2026-11-08" />);
    expect(screen.getByText('Returns next year')).toBeTruthy();
    unmount();
    at('2026-06-01T05:00:00Z');
    const far = render(<FestivalCountdownBadge iso="2026-11-08" />);
    expect(far.container.textContent).toBe('');
    expect(daysUntil('2026-11-08', new Date('2026-06-01T00:00:00Z'))).toBeGreaterThan(30);
  });
});

describe('calendar markers', () => {
  it('highlights today, dims past cards of the current year and leaves the rest alone', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-08T05:00:00Z'));
    document.body.innerHTML = `
      <div data-fdate="2026-11-08" data-fpast="opacity-70" class="border border-gray-200 bg-white"><h3 data-ftitle>Diwali</h3></div>
      <div data-fdate="2026-03-04" data-fpast="opacity-70" class="border border-gray-200 bg-white"><h3 data-ftitle>Holi</h3></div>
      <div data-fdate="2026-12-20" data-fpast="opacity-70" class="border border-gray-200 bg-white"><h3 data-ftitle>Later</h3></div>`;
    render(<CalendarTodayMarkers year={2026} />);
    const [today, past, later] = Array.from(document.querySelectorAll<HTMLElement>('[data-fdate]'));
    expect(today.className).toContain('bg-saffron-50');
    expect(today.className).not.toContain('bg-white');
    expect(today.querySelector('[data-ftoday]')?.textContent).toBe('Today');
    expect(past.className).toContain('opacity-70');
    expect(past.className).toContain('bg-gray-50/50');
    expect(later.className).toBe('border border-gray-200 bg-white');
  });

  it('dims nothing when the calendar year is not the current year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-02-01T05:00:00Z'));
    document.body.innerHTML = `<div data-fdate="2026-03-04" data-fpast="opacity-70" class="bg-white"></div>`;
    render(<CalendarTodayMarkers year={2026} />);
    expect(document.querySelector('[data-fdate]')!.className).toBe('bg-white');
  });
});

describe('the pages themselves carry no server-side date logic', () => {
  const read = (p: string) => readFileSync(join(WEB, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  it.each(['app/festival/page.tsx', 'app/festival/[slug]/page.tsx', 'app/calendar/page.tsx', 'app/calendar/[month]/page.tsx'])('%s', (p) => {
    const src = read(p);
    expect(src).not.toMatch(/\bnew Date\(\)|Date\.now\(|nextFestival\(|daysUntil\(|todayIso/);
  });
});
