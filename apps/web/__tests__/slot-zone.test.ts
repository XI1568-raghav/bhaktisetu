import { describe, it, expect } from 'vitest';
import { withIst, localEquivalent, IST_TIME_NOTE } from '../lib/slot-zone';

describe('slot-zone: temple slots are IST wall-clock times', () => {
  it('labels a slot with IST so a devotee abroad cannot read it as local time', () => {
    expect(withIst('Morning (6:00 AM)')).toBe('Morning (6:00 AM) IST');
    expect(withIst('6:00 AM')).toBe('6:00 AM IST');
  });

  it('does not double-label', () => {
    expect(withIst('6:00 AM IST')).toBe('6:00 AM IST');
  });

  it('leaves an empty label empty', () => {
    expect(withIst('')).toBe('');
  });

  it('states the zone in one sentence', () => {
    expect(IST_TIME_NOTE).toMatch(/India Standard Time/);
    expect(IST_TIME_NOTE).toMatch(/UTC\+5:30/);
  });

  it('converts an IST slot to the devotee zone (New York, EDT in October)', () => {
    // 2026-10-15 06:00 IST = 2026-10-15 00:30 UTC = 2026-10-14 20:30 EDT
    const s = localEquivalent('2026-10-15', '06:00', 'America/New_York');
    expect(s).toMatch(/Oct/);
    expect(s).toMatch(/14/);
    expect(s).toMatch(/8:30/);
    expect(s).toMatch(/PM/);
    expect(s).toMatch(/EDT/);
  });

  it('crosses the date line correctly (Sydney)', () => {
    // 2026-10-15 18:00 IST = 12:30 UTC = 23:30 AEDT on the 15th
    const s = localEquivalent('2026-10-15', '18:00', 'Australia/Sydney');
    expect(s).toMatch(/15/);
    expect(s).toMatch(/11:30/);
    expect(s).toMatch(/PM/);
  });

  it('returns null when the devotee is already in India', () => {
    expect(localEquivalent('2026-10-15', '06:00', 'Asia/Kolkata')).toBeNull();
  });

  it('returns null for an unparseable date or slot rather than printing nonsense', () => {
    expect(localEquivalent('', '06:00', 'America/New_York')).toBeNull();
    expect(localEquivalent('2026-10-15', 'Evening', 'America/New_York')).toBeNull();
    expect(localEquivalent('2026-10-15', '06:00', 'Not/AZone')).toBeNull();
  });
});
