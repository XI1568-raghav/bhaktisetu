import { describe, it, expect } from 'vitest';
import {
  describeAvailability,
  isWithinAvailability,
  parseWeeklyAvailability,
  publicAvailability,
} from './astrologer-availability.js';

// 2026-11-02 is a Monday. IST = UTC+5:30, so 09:00 IST = 03:30Z.
const MON = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 2, h, m) - 330 * 60_000);

const web = {
  Monday: { morning: true, afternoon: true, evening: false },
  Tuesday: { morning: false, afternoon: false, evening: true },
  Sunday: { morning: false, afternoon: false, evening: false },
};

describe('parseWeeklyAvailability', () => {
  it('reads the web shape with the hours the web grid prints (afternoon 12-17, evening 17-22)', () => {
    const a = parseWeeklyAvailability(web)!;
    expect(a.bounds).toEqual([6, 12, 17, 22]);
    expect(a.days.Monday).toEqual({ morning: true, afternoon: true, evening: false });
  });

  it('reads the mobile shape with ITS hours (afternoon 12-18, evening 18-22)', () => {
    const a = parseWeeklyAvailability({ weekly: [{ day: 'Mon', morning: true, afternoon: false, evening: true }] })!;
    expect(a.bounds).toEqual([6, 12, 18, 22]);
    expect(a.days.Monday).toEqual({ morning: true, afternoon: false, evening: true });
  });

  it.each([null, undefined, 5, 'x', [], {}, { weekly: [] }, { hours: '9-5' }, { weekly: [{ day: 'Xyz' }] }])(
    'returns null (= no restriction) for %j',
    (raw) => {
      expect(parseWeeklyAvailability(raw as never)).toBeNull();
    },
  );

  it('a saved grid with every window off is NOT null: that astrologer offers no scheduled slots', () => {
    expect(parseWeeklyAvailability({ Monday: { morning: false, afternoon: false, evening: false } })).not.toBeNull();
  });
});

describe('isWithinAvailability (IST)', () => {
  const a = parseWeeklyAvailability(web);

  it('no schedule on file means anything goes', () => {
    expect(isWithinAvailability(null, MON(0), 60)).toBe(true);
  });

  it('inside an open window', () => {
    expect(isWithinAvailability(a, MON(9), 30)).toBe(true);
  });

  it('the IST day decides, not the UTC day: Mon 00:30 IST is Sunday 19:00Z', () => {
    // Monday 00:30 IST is before the 06:00 morning window -> closed even though Monday is open.
    expect(isWithinAvailability(a, MON(0, 30), 5)).toBe(false);
    // Sunday 23:30 IST (= Sunday 18:00Z) is Sunday, which is off.
    expect(isWithinAvailability(a, new Date(MON(0).getTime() - 30 * 60_000), 5)).toBe(false);
  });

  it('morning and afternoon are both open on Monday, so a session may cross noon', () => {
    expect(isWithinAvailability(a, MON(11, 50), 30)).toBe(true);
  });

  it('Monday evening is off: a session may not run into it, and 17:00 itself is closed', () => {
    expect(isWithinAvailability(a, MON(16, 45), 30)).toBe(false); // crosses 17:00
    expect(isWithinAvailability(a, MON(16, 30), 30)).toBe(true); // ends exactly at 17:00
    expect(isWithinAvailability(a, MON(17), 5)).toBe(false);
  });

  it('after 22:00 and before 06:00 is always closed', () => {
    const tue = new Date(MON(0).getTime() + 86_400_000);
    expect(isWithinAvailability(a, new Date(tue.getTime() + 22 * 3_600_000), 5)).toBe(false);
  });

  it('Tuesday evening open: 18:00-18:30 IST ok, spilling past 22:00 is not', () => {
    const tue = (h: number, m = 0) => new Date(MON(h, m).getTime() + 86_400_000);
    expect(isWithinAvailability(a, tue(18), 30)).toBe(true);
    expect(isWithinAvailability(a, tue(21, 45), 30)).toBe(false);
  });
});

describe('describeAvailability / publicAvailability', () => {
  it('names the open windows per day in IST, Monday first', () => {
    expect(describeAvailability(parseWeeklyAvailability(web)!)).toBe('Mon morning/afternoon; Tue evening (IST)');
  });

  it('says so when nothing is open', () => {
    expect(describeAvailability(parseWeeklyAvailability({ Monday: { morning: false } })!)).toBe('no scheduled slots');
  });

  it('public form lists all seven days with the hour ranges and IST', () => {
    const p = publicAvailability(web)!;
    expect(Object.keys(p.days)).toHaveLength(7);
    expect(p.days.Wednesday).toEqual({ morning: false, afternoon: false, evening: false });
    expect(p.hours).toEqual({ morning: '06:00-12:00', afternoon: '12:00-17:00', evening: '17:00-22:00' });
    expect(p.timezone).toBe('IST');
    expect(publicAvailability(null)).toBeNull();
  });
});
