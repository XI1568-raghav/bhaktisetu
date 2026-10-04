import { describe, it, expect } from 'vitest';
import {
  computePujaMuhuratDay,
  findPujaMuhurats,
  subtractWindow,
  parseWindow,
  PujaMuhuratQuerySchema,
  type DayInputs,
} from './puja-muhurat.js';

// A shubh Griha Pravesh day: auspicious tithi (5 = Panchami), GP nakshatra
// (Rohini), preferred weekday (Thursday=4), non-cautionary month (March=3).
const SHUBH_GP_DAY: DayInputs = {
  date: '2026-03-05',
  dayOfWeek: 4,
  tithiNumber: 5,
  nakshatra: 'Rohini',
  month: 3,
  sunrise: '06:22',
  sunset: '18:22',
  rahuKaal: '13:30 - 15:00',
};

describe('computePujaMuhuratDay — Griha Pravesh', () => {
  it('grades a GP-auspicious day shubh with score >= 60', () => {
    const r = computePujaMuhuratDay('GRIHA_PRAVESH', SHUBH_GP_DAY);
    expect(r.grade).toBe('shubh');
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it('hard-avoids Amavasya for Griha Pravesh', () => {
    const r = computePujaMuhuratDay('GRIHA_PRAVESH', { ...SHUBH_GP_DAY, tithiNumber: 30 });
    expect(r.grade).toBe('avoid');
    expect(r.windows).toHaveLength(0);
    expect(r.flags).toContain('Amavasya');
  });

  it('marks Purnima as the canonical Satyanarayan day', () => {
    const r = computePujaMuhuratDay('SATYANARAYAN', { ...SHUBH_GP_DAY, tithiNumber: 15 });
    expect(r.grade).toBe('shubh');
    expect(r.flags).toContain('Purnima');
    expect(r.reasons.join(' ')).toMatch(/Purnima/);
  });

  it('scores a shubh Griha Pravesh day above a neutral day', () => {
    const shubh = computePujaMuhuratDay('GRIHA_PRAVESH', SHUBH_GP_DAY);
    const neutral = computePujaMuhuratDay('GRIHA_PRAVESH', {
      ...SHUBH_GP_DAY,
      tithiNumber: 6,      // Shashthi — not in GP set
      nakshatra: 'Ardra',  // not a GP nakshatra
      dayOfWeek: 0,        // Sunday — neutral
    });
    expect(shubh.score).toBeGreaterThan(neutral.score);
  });
});

describe('subtractWindow — Rahukaal cutter', () => {
  it('splits a window around Rahukaal', () => {
    // 12:00–13:00 with Rahukaal 12:15–12:45 → [12:00–12:15, 12:45–13:00]
    const out = subtractWindow([720, 780], [735, 765]);
    expect(out).toEqual([[720, 735], [765, 780]]);
  });

  it('drops slivers smaller than 15 min', () => {
    // 12:00–13:00 with Rahukaal 11:50–12:05 → only a 5-min head (dropped) + tail
    const out = subtractWindow([720, 780], [710, 725]);
    expect(out).toEqual([[725, 780]]);
  });

  it('returns the window untouched when there is no overlap', () => {
    expect(subtractWindow([600, 660], [700, 760])).toEqual([[600, 660]]);
  });
});

describe('window/Rahukaal non-overlap contract', () => {
  it('no returned window overlaps the Rahukaal interval', () => {
    const r = computePujaMuhuratDay('GRIHA_PRAVESH', SHUBH_GP_DAY);
    const [rs, re] = parseWindow(SHUBH_GP_DAY.rahuKaal);
    for (const w of r.windows) {
      const ws = parseWindow(`${w.from} - ${w.to}`)[0];
      const we = parseWindow(`${w.from} - ${w.to}`)[1];
      // overlap test: NOT (we <= rs || ws >= re) must be false
      expect(we <= rs || ws >= re).toBe(true);
    }
  });
});

describe('PujaMuhuratQuerySchema — kebab-case alias', () => {
  it('normalises "griha-pravesh" to GRIHA_PRAVESH', () => {
    const p = PujaMuhuratQuerySchema.parse({ pujaType: 'griha-pravesh' });
    expect(p.pujaType).toBe('GRIHA_PRAVESH');
    expect(p.days).toBe(30);
    expect(p.city).toBe('Gurugram');
  });

  it('rejects an unknown puja type', () => {
    expect(PujaMuhuratQuerySchema.safeParse({ pujaType: 'mundan' }).success).toBe(false);
  });
});

describe('findPujaMuhurats — ranking', () => {
  it('returns top-N sorted by score desc', () => {
    const days: DayInputs[] = [
      SHUBH_GP_DAY,
      { ...SHUBH_GP_DAY, date: '2026-03-06', tithiNumber: 30 }, // Amavasya → avoid
      { ...SHUBH_GP_DAY, date: '2026-03-07', tithiNumber: 7, nakshatra: 'Chitra' }, // shubh
    ];
    const out = findPujaMuhurats('GRIHA_PRAVESH', days, 2);
    expect(out).toHaveLength(2);
    expect(out[0]!.score).toBeGreaterThanOrEqual(out[1]!.score);
    expect(out.every((d) => d.grade !== 'avoid')).toBe(true);
  });
});

describe('PujaMuhuratQuerySchema — limit', () => {
  const base = { pujaType: 'SATYANARAYAN' };

  it('defaults to 5, the previous behaviour', () => {
    expect(PujaMuhuratQuerySchema.parse(base).limit).toBe(5);
  });

  it('accepts 1 to 92 and coerces a query-string number', () => {
    expect(PujaMuhuratQuerySchema.parse({ ...base, limit: '30' }).limit).toBe(30);
    expect(PujaMuhuratQuerySchema.parse({ ...base, limit: 92 }).limit).toBe(92);
    expect(PujaMuhuratQuerySchema.parse({ ...base, limit: 1 }).limit).toBe(1);
  });

  it('rejects 0, 93 and non-numbers', () => {
    for (const bad of [0, 93, -1, 'x', 2.5]) {
      expect(PujaMuhuratQuerySchema.safeParse({ ...base, limit: bad }).success, String(bad)).toBe(false);
    }
  });
});
