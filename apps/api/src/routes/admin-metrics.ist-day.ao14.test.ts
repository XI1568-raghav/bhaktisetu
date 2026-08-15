/**
 * AO-14 — /admin/metrics reported "0 signups today" while /admin listed 10
 * signups dated today.
 *
 * Measured on the sweep (2026-08-12): the metrics tile read
 * `TODAY (2026-08-12) … SIGNUPS 0`, while the dashboard's Recent Signups table
 * listed ten users all dated "12 Aug". Their raw createdAt was
 * 2026-08-11T19:19:10Z — 12 Aug 00:49 IST, 11 Aug in UTC. The metrics endpoint
 * cut the day with `startOfDayUtc`; the dashboard formats with
 * toLocaleDateString('en-IN').
 *
 * For the first 5.5 hours of every IST day the founder's "real-numbers"
 * dashboard therefore reports zero signups, zero bookings and zero GMV for
 * activity the next tab is already showing — and it is the page framed as the
 * investor view, so it is the number most likely to be screenshotted.
 *
 * India-first product, India day boundary. IST is a fixed UTC+05:30 with no
 * DST, so the window is arithmetic, not a tz database lookup.
 */
import { describe, it, expect } from 'vitest';
import { __testing } from './admin-metrics.js';

const { startOfDayIst, dayKeyIst, IST_OFFSET_MS } = __testing;

describe('AO-14 — the day window is Asia/Kolkata', () => {
  it('IST is UTC+05:30', () => {
    expect(IST_OFFSET_MS).toBe(5.5 * 3600_000);
  });

  it('counts the sweep signup as TODAY, the way the dashboard renders it', () => {
    // The exact instant from the finding: 11 Aug in UTC, 12 Aug 00:49 IST.
    const signupAt = new Date('2026-08-11T19:19:10.000Z');
    const now = new Date('2026-08-12T04:00:00.000Z'); // 09:30 IST on 12 Aug

    // Day starts 2026-08-11T18:30:00Z. The signup is after it, so it counts.
    expect(startOfDayIst(now).toISOString()).toBe('2026-08-11T18:30:00.000Z');
    expect(signupAt.getTime()).toBeGreaterThanOrEqual(startOfDayIst(now).getTime());
  });

  it('labels the day with the IST date, not the UTC one', () => {
    // 00:49 IST on 12 Aug. The UTC label would say 11 Aug and contradict every
    // en-IN formatted date on the neighbouring screen.
    expect(dayKeyIst(new Date('2026-08-11T19:19:10.000Z'))).toBe('2026-08-12');
  });

  it('holds across the 5.5h window that used to read zero', () => {
    // Every instant from 18:30Z (IST midnight) to 23:59Z belongs to the NEXT
    // IST day — this is the whole reported failure window.
    for (const iso of [
      '2026-08-11T18:30:00.000Z',
      '2026-08-11T20:00:00.000Z',
      '2026-08-11T23:59:59.000Z',
    ]) {
      expect(dayKeyIst(new Date(iso)), iso).toBe('2026-08-12');
      expect(startOfDayIst(new Date(iso)).toISOString(), iso).toBe('2026-08-11T18:30:00.000Z');
    }
  });

  it('does not roll the day over early', () => {
    // 18:29Z is 23:59 IST on 11 Aug — still the previous day.
    expect(dayKeyIst(new Date('2026-08-11T18:29:59.000Z'))).toBe('2026-08-11');
    expect(startOfDayIst(new Date('2026-08-11T18:29:59.000Z')).toISOString()).toBe(
      '2026-08-10T18:30:00.000Z',
    );
  });

  it('a start-of-day is always exactly midnight IST', () => {
    for (const iso of [
      '2026-01-01T00:00:00.000Z',
      '2026-06-15T12:34:56.000Z',
      '2026-12-31T23:59:59.000Z',
    ]) {
      const start = startOfDayIst(new Date(iso));
      // Midnight IST is 18:30:00.000Z the previous day, always.
      expect(start.getTime() % 86_400_000, iso).toBe(18.5 * 3600_000);
    }
  });
});
