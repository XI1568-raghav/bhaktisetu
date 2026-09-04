import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...rest }: Record<string, unknown> & { children?: unknown }) => (
    <a href={String(href)} data-prefetch={String(prefetch)} {...(rest as Record<string, unknown>)}>
      {children as never}
    </a>
  ),
}));

import StickyAartiCta from '../components/home/StickyAartiCta';
import { darshanScheduleRows } from '../lib/darshan-schedule';
import { getScheduleForTemple } from '../lib/aarti-schedules';

/**
 * The globally-mounted aarti reminder promised a live aarti and delivered /today.
 *
 * Two defects in one component:
 *
 *   1. It carried its OWN four-slot timetable (Mangal 04:30 / Shringar 07:00 /
 *      Sandhya 18:00 / Shayan 21:00) that belonged to no temple in the product.
 *      Meanwhile lib/aarti-schedules.ts already holds the real per-temple IST
 *      schedules and resolves the live slot — it just was not wired here.
 *   2. The CTA pointed at /today, a page with no aarti section at all. So the
 *      highest-intent moment in the app ("Sandhya Aarti starts in 00:04:12")
 *      landed the devotee somewhere that could not show them an aarti.
 *
 * It also re-derived IST by hand and then did the arithmetic on a synthetic
 * LOCAL-time Date (`new Date(y, m, d, …)` + `setHours`). When the viewer's own
 * DST transition falls between now and the target — a devotee in London at
 * 00:30 IST on 25 Oct, target 04:30 IST — the local clock jumps an hour and the
 * countdown overstates by 60 minutes. Minutes-since-IST-midnight, which is what
 * aarti-schedules.ts:159 already computes, has no such seam.
 */

const SRC = path.join(__dirname, '..', 'components', 'home', 'StickyAartiCta.tsx');

/** Source with comments stripped — a comment is not behaviour. */
function source(): string {
  return fs
    .readFileSync(SRC, 'utf8')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** A Date whose IST wall clock is hh:mm:ss. IST is UTC+5:30, no DST, ever. */
function atIST(hh: number, mm: number, ss = 0): Date {
  return new Date(Date.UTC(2026, 7, 12, hh, mm, ss) - 5.5 * 60 * 60 * 1000);
}

/**
 * Render as a devotee who has scrolled past the reveal threshold. Below it the
 * card is deliberately `aria-hidden`, so ByRole would not see the link at all
 * and every assertion here would pass for the wrong reason.
 */
function renderAt(t: Date, scrollY = 1200) {
  vi.setSystemTime(t);
  Object.defineProperty(window, 'scrollY', { value: scrollY, writable: true, configurable: true });
  return render(<StickyAartiCta />);
}

describe('sticky aarti reminder — points at a surface that can show an aarti', () => {
  beforeEach(() => {
    // Only Date is faked. Faking setInterval too would leave React 19's
    // scheduler on stub timers and the render never flushes.
    vi.useFakeTimers({ toFake: ['Date'] });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it('no longer carries a timetable of its own', () => {
    const src = source();
    expect(src).not.toMatch(/AARTI_SLOTS/);
    expect(src).not.toMatch(/\bhour:\s*\d/);
    expect(src).not.toMatch(/\bminute:\s*\d/);
    // No aarti is named in this file any more; every name comes from the data.
    expect(src).not.toMatch(/['"][A-Za-z]+ Aarti['"]/);
  });

  it('delegates IST resolution to the shared helper instead of re-deriving it', () => {
    const src = source();
    expect(src).not.toMatch(/Asia\/Kolkata/);
    expect(src).not.toMatch(/setHours\(/);
    expect(src).toMatch(/from '\.\.\/\.\.\/lib\/(darshan-schedule|aarti-schedules)'/);
  });

  it('does not send the devotee to /today', () => {
    expect(source()).not.toMatch(/\/today/);
  });

  it('links at the darshan page of the temple whose aarti is live right now', () => {
    // 04:10 IST — Golden Temple Asa di Var runs 03:00–05:00 (120 min window).
    const t = atIST(4, 10);
    const liveRows = darshanScheduleRows(t).filter((r) => r.status === 'live');
    expect(liveRows.length).toBeGreaterThan(0);

    renderAt(t);
    const link = screen.getByRole('link');
    const href = link.getAttribute('href') ?? '';

    expect(href).toMatch(/^\/darshan\/[a-z0-9-]+$/);
    const slug = href.replace('/darshan/', '');

    // The destination is a temple that genuinely publishes an aarti schedule —
    // which is exactly what /darshan/[id] renders and /today does not have.
    expect(getScheduleForTemple(slug)).not.toBeNull();

    const matched = liveRows.find((r) => r.slug === slug);
    expect(matched, `href ${href} is not live at 04:10 IST`).toBeTruthy();
    expect(link.textContent).toContain(matched!.event);
    expect(link.textContent).toContain(matched!.temple);
  });

  it('counts down to a real published slot when one is close', () => {
    // 18:12 IST — nothing is live; Golden Temple Rehras Sahib opens at 18:30.
    const t = atIST(18, 12, 0);
    expect(darshanScheduleRows(t).filter((r) => r.status === 'live')).toEqual([]);

    renderAt(t);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/darshan/golden-temple');
    // 18 minutes to 18:30, counted — not a rounded or remembered figure.
    expect(link.textContent).toContain('00:18:00');
    expect(link.textContent).toContain('Rehras Sahib');
    expect(link.textContent?.toLowerCase()).not.toContain('live');
  });

  it('carries the seconds of the current IST minute into the countdown', () => {
    renderAt(atIST(18, 12, 20));
    // 17m40s, not 18m — the countdown is computed, not floored to the minute.
    expect(screen.getByRole('link').textContent).toContain('00:17:40');
  });

  it('renders nothing when the next aarti is hours away', () => {
    // 14:00 IST — the long afternoon gap. Next published slot is 18:30.
    const { container } = renderAt(atIST(14, 0));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing after the last slot of the IST day', () => {
    // 23:45 IST — Mahakaleshwar Shayan Aarti closed at 23:30 and the first slot
    // of tomorrow is 02:30. No countdown may be invented across that gap.
    const { container } = renderAt(atIST(23, 45));
    expect(container.innerHTML).toBe('');
  });

  it('stays clear of the chat launcher band it was moved out of (TD-07)', () => {
    // Locked by overlay-stacking-consent-first.test.tsx too; re-asserted here so
    // a rewrite of this file cannot quietly walk the card back into that corner.
    expect(source()).toMatch(/fixed[^"`']*\bbottom-24\b/);
  });
});
