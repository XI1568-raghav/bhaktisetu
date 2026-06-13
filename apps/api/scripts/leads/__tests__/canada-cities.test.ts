import { describe, it, expect } from 'vitest';
import {
  CANADA_PANDIT_CITIES,
  CANADA_CITY_NAMES,
} from '../_canada-cities.js';

describe('canada-cities config (R-Q3-S-007)', () => {
  it('exports Toronto, Vancouver, Brampton with country CA + tier', () => {
    for (const name of ['Toronto', 'Vancouver', 'Brampton']) {
      const entry = CANADA_PANDIT_CITIES.find((c) => c.city === name);
      expect(entry, `${name} present`).toBeDefined();
      expect(entry!.country).toBe('CA');
      expect([1, 2]).toContain(entry!.tier);
    }
  });

  it('includes Mississauga and Surrey (Vancouver overflow)', () => {
    expect(CANADA_CITY_NAMES).toContain('Mississauga');
    expect(CANADA_CITY_NAMES).toContain('Surrey');
  });

  it('every entry has province and rationale strings', () => {
    for (const c of CANADA_PANDIT_CITIES) {
      expect(typeof c.province).toBe('string');
      expect(c.province.length).toBeGreaterThan(0);
      expect(typeof c.rationale).toBe('string');
      expect(c.rationale.length).toBeGreaterThan(10);
    }
  });

  it('Brampton has hard floor justification (≥ 2 per spec)', () => {
    const b = CANADA_PANDIT_CITIES.find((c) => c.city === 'Brampton')!;
    expect(b.rationale).toMatch(/Brampton|Punjabi|density|Stats Canada|hard floor/i);
  });
});
