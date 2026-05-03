import { describe, it, expect } from 'vitest';
import {
  MuhuratInputSchema,
  findWeddingMuhurats,
  deriveBirthNakshatra,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
} from './muhurat.js';

describe('muhurat — input validation', () => {
  it('accepts a valid input', () => {
    const r = MuhuratInputSchema.safeParse({
      brideDob: '1996-08-12',
      brideTob: '06:30',
      groomDob: '1992-03-04',
      groomTob: '12:15',
      fromDate: '2026-11-01',
      toDate: '2026-12-31',
      location: 'Delhi',
    });
    expect(r.success).toBe(true);
  });

  it('rejects from > to', () => {
    const r = MuhuratInputSchema.safeParse({
      brideDob: '1996-08-12',
      brideTob: '06:30',
      groomDob: '1992-03-04',
      groomTob: '12:15',
      fromDate: '2026-12-31',
      toDate: '2026-11-01',
    });
    expect(r.success).toBe(false);
  });

  it('rejects > 365-day window', () => {
    const r = MuhuratInputSchema.safeParse({
      brideDob: '1996-08-12',
      brideTob: '06:30',
      groomDob: '1992-03-04',
      groomTob: '12:15',
      fromDate: '2026-01-01',
      toDate: '2027-12-31',
    });
    expect(r.success).toBe(false);
  });
});

describe('muhurat — derivation', () => {
  it('derives a nakshatra from dob+tob', () => {
    const n = deriveBirthNakshatra('1996-08-12', '06:30');
    expect(NAKSHATRA_NAMES).toContain(n);
  });
});

describe('muhurat — finder', () => {
  it('returns a top-N ranked list', () => {
    const r = findWeddingMuhurats({
      brideDob: '1996-08-12',
      brideTob: '06:30',
      brideNakshatra: 'Hasta',
      groomDob: '1992-03-04',
      groomTob: '12:15',
      groomNakshatra: 'Rohini',
      fromDate: '2026-11-01',
      toDate: '2026-12-31',
      location: 'Delhi',
    });
    expect(r.candidates.length).toBeLessThanOrEqual(10);
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(RASHI_NAMES).toContain(r.bride.rashi);
    expect(RASHI_NAMES).toContain(r.groom.rashi);
    for (let i = 1; i < r.candidates.length; i++) {
      const prev = r.candidates[i - 1];
      const cur = r.candidates[i];
      expect(prev?.score ?? 0).toBeGreaterThanOrEqual(cur?.score ?? 0);
    }
    expect(r.candidates[0]?.abhijitMuhurat.from).toBe('11:48');
  });
});
