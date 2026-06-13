import { describe, it, expect } from 'vitest';
import {
  BLR_TEMPLE_SEED,
  BLR_SEED_COUNT,
} from '../_temple-seed-blr.js';
import { BLR_AREAS } from '../scrape-temples-blr.js';

describe('R-Q1-S-013 BLR temple seed', () => {
  it('exposes >= 100 BLR temple rows (spec target)', () => {
    expect(BLR_SEED_COUNT).toBeGreaterThanOrEqual(100);
    expect(BLR_TEMPLE_SEED.length).toBe(BLR_SEED_COUNT);
  });

  it('every row is Bengaluru / Karnataka', () => {
    for (const t of BLR_TEMPLE_SEED) {
      expect(t.city).toBe('Bengaluru');
      expect(t.state).toBe('Karnataka');
    }
  });

  it('every row has a unique placeholder email under the placeholder TLD', () => {
    const emails = new Set<string>();
    for (const t of BLR_TEMPLE_SEED) {
      expect(t.email).toMatch(/@bengaluru\.temple\.placeholder\.in$/);
      expect(emails.has(t.email), `dup email ${t.email}`).toBe(false);
      emails.add(t.email);
    }
  });

  it('every row carries a non-empty area string (for Google Places query)', () => {
    for (const t of BLR_TEMPLE_SEED) {
      expect(typeof t.area).toBe('string');
      expect(t.area.length).toBeGreaterThan(2);
    }
  });

  it('BLR_AREAS deduped from seed is non-empty', () => {
    expect(BLR_AREAS.length).toBeGreaterThan(0);
    expect(BLR_AREAS.length).toBeLessThanOrEqual(BLR_SEED_COUNT);
  });

  it('every row name is non-empty + does not duplicate a different row', () => {
    const names = new Set<string>();
    for (const t of BLR_TEMPLE_SEED) {
      expect(t.name.trim().length).toBeGreaterThan(3);
      const key = `${t.name}|${t.area}`;
      expect(names.has(key), `dup name+area ${key}`).toBe(false);
      names.add(key);
    }
  });
});
