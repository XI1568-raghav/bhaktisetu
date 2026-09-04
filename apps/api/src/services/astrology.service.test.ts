import { describe, it, expect, beforeEach, vi } from 'vitest';
import { astrologyService } from './astrology.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * AW-02: a REAL resolved astrologer, the only input startConsultation accepts
 * now that the `ASTROLOGERS.find(...)` fallback has been removed. perMinuteRate
 * 50 keeps the session-shape assertion below identical to what it pinned when
 * this file drove the method with fixture id `astro_001`.
 */
const REAL_ID = '71e54617-6963-418e-845f-920f4350505b';
const REAL_ASTROLOGER = {
  id: REAL_ID,
  userId: 'astro-user-1',
  name: 'Acharya Vinod Sharma',
  specializations: ['Vedic Astrology'],
  languages: ['hi'],
  experienceYears: 12,
  rating: 4.8,
  consultationCount: 90,
  perMinuteRate: 50,
  isOnline: true,
  isBusy: false,
};

describe('AstrologyService.startConsultation', () => {
  it('returns error when astrologer not found', () => {
    const out = astrologyService.startConsultation('user-1', 'astro_999', 'chat');
    expect(out).toEqual({ error: 'Astrologer not found.' });
  });

  it('returns error when astrologer offline', () => {
    const out = astrologyService.startConsultation('user-1', REAL_ID, 'chat', {
      ...REAL_ASTROLOGER,
      isOnline: false,
    } as never);
    expect(out).toHaveProperty('error');
  });

  it('returns error when astrologer busy', () => {
    // AW-02: driven by a RESOLVED profile, not by a fixture id. The fixture
    // fallback is gone — startConsultation consults real supply only.
    const out = astrologyService.startConsultation('user-1', REAL_ID, 'chat', {
      ...REAL_ASTROLOGER,
      isBusy: true,
    } as never);
    expect(out).toEqual({ error: 'Astrologer is currently busy with another consultation.' });
  });

  it('creates session for available astrologer', () => {
    const out = astrologyService.startConsultation(
      'user-1',
      REAL_ID,
      'video',
      REAL_ASTROLOGER as never,
    ) as any;
    expect(out.error).toBeUndefined();
    expect(out.sessionId).toMatch(/^session_/);
    expect(out.userId).toBe('user-1');
    expect(out.astrologerId).toBe(REAL_ID);
    expect(out.mode).toBe('video');
    expect(out.status).toBe('waiting');
    expect(out.freeMinutes).toBe(5);
    expect(out.perMinuteRate).toBe(50);
  });
});

describe('AstrologyService.getKundli', () => {
  it('returns full kundli structure with planet positions and houses', () => {
    const k = astrologyService.getKundli('1990-08-15', '10:30', 'Mumbai', 'Test User');
    expect(k.name).toBe('Test User');
    expect(k.planetaryPositions).toHaveLength(9);
    expect(k.houses).toHaveLength(12);
    expect(k.birthDate).toBe('1990-08-15');
  });

  it('falls back to "User" when name omitted', () => {
    const k = astrologyService.getKundli('1990-08-15', '10:30', 'Delhi');
    expect(k.name).toBe('User');
  });
});

describe('AstrologyService.getDailyHoroscope', () => {
  it('returns horoscope by hindi devanagari rashi', () => {
    const h = astrologyService.getDailyHoroscope('सिंह');
    expect(h).not.toBeNull();
  });

  it('returns horoscope by english name (case-insensitive)', () => {
    const h = astrologyService.getDailyHoroscope('LEO');
    expect(h).not.toBeNull();
  });

  it('returns null for unknown rashi', () => {
    expect(astrologyService.getDailyHoroscope('Bogus')).toBeNull();
  });
});

describe('AstrologyService.getAllHoroscopes', () => {
  it('returns 12 rashis', () => {
    const all = astrologyService.getAllHoroscopes();
    expect(all).toHaveLength(12);
  });
});

describe('AstrologyService.getCompatibility', () => {
  it('returns null when first rashi unknown', () => {
    expect(astrologyService.getCompatibility('Bogus', 'Leo')).toBeNull();
  });

  it('returns null when second rashi unknown', () => {
    expect(astrologyService.getCompatibility('Leo', 'Bogus')).toBeNull();
  });

  it('returns compatibility result with bounded scores', () => {
    const c = astrologyService.getCompatibility('Leo', 'Aries');
    expect(c).not.toBeNull();
    for (const score of [c!.overallScore, c!.emotional, c!.intellectual, c!.physical, c!.spiritual]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(98);
    }
    expect(c!.strengths.length).toBeGreaterThan(0);
    expect(c!.challenges.length).toBeGreaterThan(0);
  });

  it('is deterministic — same input → same output', () => {
    const c1 = astrologyService.getCompatibility('Leo', 'Aries');
    const c2 = astrologyService.getCompatibility('Leo', 'Aries');
    expect(c1).toEqual(c2);
  });
});
