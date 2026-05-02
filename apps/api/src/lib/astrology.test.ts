import { describe, it, expect } from 'vitest';
import {
  generateKundli,
  getDailyHoroscope,
  KundliInputSchema,
  HoroscopeQuerySchema,
  prewarmDailyHoroscopes,
  SIGNS,
} from './astrology.js';

describe('astrology lib — input validation', () => {
  it('rejects future dob', () => {
    const result = KundliInputSchema.safeParse({
      dob: '3050-01-01',
      tob: '08:30',
      location: 'Delhi',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed tob', () => {
    const result = KundliInputSchema.safeParse({
      dob: '1990-05-10',
      tob: '8am',
      location: 'Delhi',
    });
    expect(result.success).toBe(false);
  });

  it('requires location or lat/lng', () => {
    const result = KundliInputSchema.safeParse({
      dob: '1990-05-10',
      tob: '08:30',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid input', () => {
    const result = KundliInputSchema.safeParse({
      name: 'Test',
      dob: '1990-05-10',
      tob: '08:30',
      location: 'Mumbai',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown horoscope sign', () => {
    const result = HoroscopeQuerySchema.safeParse({ sign: 'a' });
    expect(result.success).toBe(false);
  });
});

describe('astrology lib — kundli generation', () => {
  it('generates a kundli with required fields', async () => {
    const k = await generateKundli({
      name: 'Test User',
      dob: '1990-05-10',
      tob: '08:30',
      location: 'Mumbai',
    });
    expect(k.signature).toMatch(/^kr_/);
    expect(k.rashi.english).toBeTruthy();
    expect(k.sunSign.english).toBeTruthy();
    expect(k.lagna.english).toBeTruthy();
    expect(k.nakshatra.name).toBeTruthy();
    expect(k.dasha.sequence).toHaveLength(9);
    expect(k.planetaryPositions.length).toBeGreaterThanOrEqual(9);
    expect(k.interpretation.length).toBeGreaterThanOrEqual(4);
  });

  it('produces deterministic signature for same inputs', async () => {
    const a = await generateKundli({ dob: '1985-01-15', tob: '14:20', location: 'Delhi' });
    const b = await generateKundli({ dob: '1985-01-15', tob: '14:20', location: 'Delhi' });
    expect(a.signature).toBe(b.signature);
  });
});

describe('astrology lib — daily horoscope', () => {
  it('returns a reading for a known sign', async () => {
    const h = await getDailyHoroscope({ sign: 'aries' });
    expect(h.sign).toBe('Aries');
    expect(h.reading.length).toBeGreaterThan(20);
    expect(h.element).toBe('Fire');
  });

  it('accepts Sanskrit alias', async () => {
    const h = await getDailyHoroscope({ sign: 'simha' });
    expect(h.sign).toBe('Leo');
  });

  it('throws on unknown sign', async () => {
    await expect(getDailyHoroscope({ sign: 'crab-walker' })).rejects.toThrow();
  });

  it('prewarm covers all 12 signs', async () => {
    const r = await prewarmDailyHoroscopes();
    expect(r.signs.length).toBe(12);
    expect(SIGNS).toHaveLength(12);
  });
});
