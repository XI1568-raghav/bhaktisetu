import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { darshanScheduleRows } from '../lib/darshan-schedule';

/**
 * TD-02 (2026-08-12, P1) — the daily-schedule table on /darshan pointed every
 * "live" row back at /darshan itself. The highest-intent action on the page
 * ("Watch Mahakaleshwar Bhasma Aarti now") reloaded the page the devotee was
 * already on, so the live stream read as broken.
 *
 * The same block also hardcoded `status: 'live'` on three rows, so a devotee
 * opening the page at 3 PM was told Bhasma Aarti (04:00) was streaming now.
 * That is fabricated state, not a stale cache.
 *
 * These tests lock three things:
 *   1. No row links to the page it is rendered on.
 *   2. Every row links at a temple that actually has a stream — the slug must
 *      be a key of CHANNEL_BY_SLUG in app/darshan/[id]/page.tsx. Both sides of
 *      the contract, so a row can never point at a "Coming soon" panel.
 *   3. LIVE is computed from the clock against the real per-temple aarti
 *      window, not stamped into a literal.
 */

const APP = join(process.cwd(), 'app');
const BROWSE_PAGE = join(APP, 'darshan', 'page.tsx');
const DETAIL_PAGE = join(APP, 'darshan', '[id]', 'page.tsx');

/** A Date whose IST wall clock is hh:mm. IST is UTC+5:30, no DST. */
function atIST(hh: number, mm: number): Date {
  return new Date(Date.UTC(2026, 7, 12, hh, mm) - 5.5 * 60 * 60 * 1000);
}

function channelSlugs(): string[] {
  const src = readFileSync(DETAIL_PAGE, 'utf8');
  const block = src.slice(
    src.indexOf('const CHANNEL_BY_SLUG'),
    src.indexOf('};', src.indexOf('const CHANNEL_BY_SLUG')),
  );
  return [...block.matchAll(/'([a-z0-9-]+)':\s*'UC/g)].map((m) => m[1]!);
}

describe('TD-02 /darshan daily schedule links', () => {
  it('has no self-referential anchor in the browse page source', () => {
    const src = readFileSync(BROWSE_PAGE, 'utf8');
    const selfLinks = [...src.matchAll(/href=(?:"|\{')\/darshan(?:"|'\})/g)];
    expect(selfLinks.map((m) => m[0])).toEqual([]);
  });

  it('links every row at a temple that really streams', () => {
    const rows = darshanScheduleRows(atIST(9, 0));
    expect(rows.length).toBeGreaterThan(0);
    const streaming = channelSlugs();
    expect(streaming.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.href).toBe(`/darshan/${row.slug}`);
      expect(row.href).not.toBe('/darshan');
      expect(streaming, `${row.temple} ${row.event}`).toContain(row.slug);
    }
  });

  it('derives LIVE from the clock instead of a hardcoded literal', () => {
    // Mahakaleshwar Bhasma Aarti runs 04:00–05:30 IST (90 min window).
    const during = darshanScheduleRows(atIST(4, 30)).find(
      (r) => r.slug === 'mahakaleshwar' && r.event === 'Bhasma Aarti',
    );
    expect(during?.status).toBe('live');

    const afternoon = darshanScheduleRows(atIST(15, 0)).find(
      (r) => r.slug === 'mahakaleshwar' && r.event === 'Bhasma Aarti',
    );
    expect(afternoon?.status).toBe('completed');

    const beforeDawn = darshanScheduleRows(atIST(1, 0)).find(
      (r) => r.slug === 'mahakaleshwar' && r.event === 'Bhasma Aarti',
    );
    expect(beforeDawn?.status).toBe('upcoming');
  });

  it('never reports every row live at once', () => {
    const rows = darshanScheduleRows(atIST(15, 0));
    expect(rows.filter((r) => r.status === 'live')).toEqual([]);
  });

  it('orders rows by their real aarti time', () => {
    const rows = darshanScheduleRows(atIST(9, 0));
    const minutes = rows.map((r) => r.minutesIST);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });
});
