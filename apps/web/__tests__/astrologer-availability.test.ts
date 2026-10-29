import { describe, it, expect } from 'vitest';
import {
  availabilitySummary,
  isSlotAvailable,
  parseStoredAvailability,
  type PublicAvailability,
} from '../lib/astrologer-availability';
import { cancellationRefundable, formatIst, formatIstDate, localDateTimeMin } from '../lib/consultation-time';

/**
 * The booking page, the public profile and the portal grid read availability
 * through lib/astrologer-availability.ts; POST /consultation/book enforces the
 * same rule through apps/api/src/lib/astrologer-availability.ts. These cases
 * mirror apps/api/src/lib/astrologer-availability.test.ts so the two cannot
 * drift: edit both together.
 */

const closed = { morning: false, afternoon: false, evening: false };
const pub = (over: Partial<Record<string, typeof closed>> = {}): PublicAvailability => ({
  days: {
    Monday: { morning: true, afternoon: true, evening: false },
    Tuesday: { morning: false, afternoon: false, evening: true },
    Wednesday: closed, Thursday: closed, Friday: closed, Saturday: closed, Sunday: closed,
    ...over,
  } as PublicAvailability['days'],
  hours: { morning: '06:00-12:00', afternoon: '12:00-17:00', evening: '17:00-22:00' },
  timezone: 'IST',
});
// 2026-11-02 is a Monday; 09:00 IST = 03:30Z.
const MON = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 2, h, m) - 330 * 60_000);

describe('parseStoredAvailability', () => {
  it('reads the web grid', () => {
    const w = parseStoredAvailability({ Monday: { morning: true, afternoon: false, evening: true } })!;
    expect(w.Monday).toEqual({ morning: true, afternoon: false, evening: true });
    expect(w.Sunday).toEqual(closed);
  });

  it('reads what the mobile app wrote (it used to fall back to the suggested week and clobber it on save)', () => {
    const w = parseStoredAvailability({ weekly: [{ day: 'Tue', morning: true, afternoon: true, evening: false }] })!;
    expect(w.Tuesday).toEqual({ morning: true, afternoon: true, evening: false });
  });

  it.each([null, undefined, 3, 'x', [], {}, { weekly: [] }, { hours: '9-5' }])('nothing recognisable (%j) is null, not a guess', (raw) => {
    expect(parseStoredAvailability(raw)).toBeNull();
  });
});

describe('isSlotAvailable (same answers as the API, IST)', () => {
  const a = pub();
  it('no schedule means no restriction', () => expect(isSlotAvailable(null, MON(0), 60)).toBe(true));
  it('inside an open window', () => expect(isSlotAvailable(a, MON(9), 30)).toBe(true));
  it('may cross from one open window into the next', () => expect(isSlotAvailable(a, MON(11, 50), 30)).toBe(true));
  it('may not run into a closed window, and the closing minute is closed', () => {
    expect(isSlotAvailable(a, MON(16, 45), 30)).toBe(false);
    expect(isSlotAvailable(a, MON(16, 30), 30)).toBe(true);
    expect(isSlotAvailable(a, MON(17), 5)).toBe(false);
  });
  it('the IST weekday decides: Monday 00:30 IST is before the morning window', () => {
    expect(isSlotAvailable(a, MON(0, 30), 5)).toBe(false);
  });
  it('a bad date is not available', () => expect(isSlotAvailable(a, new Date('nope'), 15)).toBe(false));
});

describe('availabilitySummary', () => {
  it('lists open days only, with the hours', () => {
    expect(availabilitySummary(pub())).toEqual([
      { day: 'Monday', text: 'Morning 06:00–12:00, Afternoon 12:00–17:00' },
      { day: 'Tuesday', text: 'Evening 17:00–22:00' },
    ]);
  });
  it('is empty when nothing is open', () => {
    expect(availabilitySummary(pub({ Monday: closed, Tuesday: closed }))).toEqual([]);
  });
});

describe('consultation-time', () => {
  it('formats in IST and says so, whatever the machine zone is', () => {
    expect(formatIst('2026-11-02T03:30:00Z')).toMatch(/^2 Nov, 9:00\s?am IST$/i);
  });
  it('falls back for missing or invalid input', () => {
    expect(formatIst(null)).toBe('Time to be agreed');
    expect(formatIst('garbage', 'n/a')).toBe('n/a');
    expect(formatIstDate('garbage')).toBe('');
  });
  it('the datetime-local minimum is LOCAL wall time, not UTC', () => {
    const d = new Date(2026, 10, 2, 1, 5); // 02 Nov 01:05 local
    expect(localDateTimeMin(d)).toBe('2026-11-02T01:05');
  });

  describe('cancellationRefundable mirrors POST /consultation/:id/cancel', () => {
    const now = Date.UTC(2026, 10, 2, 12);
    const h = (n: number) => new Date(now + n * 3_600_000).toISOString();
    it('unpaid rows cancel free', () => expect(cancellationRefundable({ status: 'pending_payment' }, now)).toBe(true));
    it('a slot >= 24 h away is refundable, one inside the window is not', () => {
      expect(cancellationRefundable({ status: 'confirmed', scheduledAt: h(24) }, now)).toBe(true);
      expect(cancellationRefundable({ status: 'confirmed', scheduledAt: h(23) }, now)).toBe(false);
    });
    it('an unscheduled session is refundable for 24 h after paying', () => {
      expect(cancellationRefundable({ status: 'confirmed', paidAt: h(-23) }, now)).toBe(true);
      expect(cancellationRefundable({ status: 'confirmed', paidAt: h(-25) }, now)).toBe(false);
    });
    it('completed/cancelled rows are not refundable', () => {
      expect(cancellationRefundable({ status: 'completed' }, now)).toBe(false);
    });
  });
});
