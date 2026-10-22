import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * DF-10 (prod sweep 2026-08-12), the fabricated-numbers half.
 *
 * /darshan/kashi-vishwanath rendered "LIVE · 12,450 watching", "PEAK VIEWERS
 * 24,000" and "QUALITY HD 1080p". None of it comes from YouTube — the embed
 * exposes no viewer API to the page, and those figures are literals in the
 * FALLBACK_TEMPLE_LIBRARY in the route file. The underlying stream is genuinely
 * live, which makes the invented numbers not just false but unnecessary, and
 * "12,450 watching" is the single most disprovable claim on the site: anyone
 * can open the same YouTube stream and read the real count.
 *
 * The status half of DF-10 (LIVE/Completed frozen at build time) was already
 * closed by TD-02 — app/darshan/page.tsx grades every row against the IST
 * clock at render time via darshanScheduleRows(), with revalidate = 300.
 *
 * The rule this locks: no darshan surface prints a concurrent-viewer count, a
 * peak-viewer count or a stream-quality claim that the platform did not
 * measure. When YouTube's Data API is wired, they come back sourced.
 */

const WEB = path.resolve(__dirname, '..');
const src = (rel: string) =>
  fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('DF-10 — the darshan detail page prints no unmeasured audience number', () => {
  const page = () => src('app/darshan/[id]/page.tsx');

  it('does not render a concurrent-viewer count', () => {
    expect(page()).not.toMatch(/watching/i);
    expect(page()).not.toMatch(/stream\.viewerCount\.toLocaleString/);
  });

  it('does not render a peak-viewer tile', () => {
    expect(page()).not.toMatch(/Peak Viewers/i);
    expect(page()).not.toMatch(/stream\.peakViewers\.toLocaleString/);
  });

  it('does not assert a stream quality the page never measured', () => {
    expect(page()).not.toMatch(/HD 1080p/);
  });

  it('does not hand a fabricated count to the player either', () => {
    expect(page()).not.toMatch(/viewerCount=\{stream\.viewerCount\}/);
  });
});

describe('DF-10 — the player renders a count only when it is given a real one', () => {
  it('the player still guards on a positive count rather than printing zero', () => {
    expect(src('components/DarshanPlayer.tsx')).toMatch(/viewerCount > 0/);
  });
});

describe('DF-10 — the schedule status is clock-derived (already closed by TD-02)', () => {
  it('the list page grades rows in the browser, not at build time', () => {
    // The page is prerendered with no revalidate (Cloudflare Worker free plan, 10 ms CPU),
    // so a build-time status would be wrong for 23 h a day. The client table re-grades.
    const list = src('app/darshan/page.tsx');
    expect(list).toMatch(/darshanScheduleRows\(\)/);
    expect(list).not.toMatch(/export const revalidate/);
    const table = src('components/DarshanScheduleTable.tsx');
    expect(table).toMatch(/^'use client'/m);
    expect(table).toMatch(/setRows\(darshanScheduleRows\(\)\)/);
  });
});
