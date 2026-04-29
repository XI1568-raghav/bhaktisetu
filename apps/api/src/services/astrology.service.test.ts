import { describe, it, expect, beforeEach, vi } from 'vitest';
import { astrologyService } from './astrology.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AstrologyService.getAstrologers', () => {
  it('returns paginated default list', () => {
    const out = astrologyService.getAstrologers();
    expect(out.astrologers.length).toBeGreaterThan(0);
    expect(out.page).toBe(1);
    expect(out.limit).toBe(15);
    expect(out.total).toBeGreaterThanOrEqual(out.astrologers.length);
  });

  it('filters by specialization (case-insensitive)', () => {
    const out = astrologyService.getAstrologers({ specialization: 'tarot reading' });
    expect(out.astrologers.length).toBeGreaterThan(0);
    expect(
      out.astrologers.every((a) =>
        a.specializations.some((s) => s.toLowerCase().includes('tarot'))
      )
    ).toBe(true);
  });

  it('filters by language', () => {
    const out = astrologyService.getAstrologers({ language: 'tamil' });
    expect(
      out.astrologers.every((a) =>
        a.languages.some((l) => l.toLowerCase() === 'tamil')
      )
    ).toBe(true);
  });

  it('filters by price range "20-40"', () => {
    const out = astrologyService.getAstrologers({ priceRange: '20-40' });
    expect(out.astrologers.every((a) => a.perMinuteRate >= 20 && a.perMinuteRate <= 40)).toBe(true);
  });

  it('sorts by rating desc', () => {
    const out = astrologyService.getAstrologers({ sortBy: 'rating' });
    for (let i = 1; i < out.astrologers.length; i++) {
      expect(out.astrologers[i - 1].rating).toBeGreaterThanOrEqual(out.astrologers[i].rating);
    }
  });

  it('sorts by price asc', () => {
    const out = astrologyService.getAstrologers({ sortBy: 'price' });
    for (let i = 1; i < out.astrologers.length; i++) {
      expect(out.astrologers[i - 1].perMinuteRate).toBeLessThanOrEqual(out.astrologers[i].perMinuteRate);
    }
  });

  it('paginates: page 2 limit 3', () => {
    const all = astrologyService.getAstrologers({ limit: 100 });
    const page2 = astrologyService.getAstrologers({ page: 2, limit: 3 });
    expect(page2.astrologers.length).toBeLessThanOrEqual(3);
    expect(page2.page).toBe(2);
    expect(page2.totalPages).toBe(Math.ceil(all.total / 3));
  });

  it('isOnline=true filters to online astrologers', () => {
    const out = astrologyService.getAstrologers({ isOnline: true });
    expect(out.astrologers.every((a) => a.isOnline === true)).toBe(true);
  });
});

describe('AstrologyService.getAstrologerById', () => {
  it('returns detail with reviews array', () => {
    const detail = astrologyService.getAstrologerById('astro_001');
    expect(detail).not.toBeNull();
    expect(Array.isArray(detail!.reviews)).toBe(true);
  });

  it('returns null for unknown id', () => {
    expect(astrologyService.getAstrologerById('astro_xxx')).toBeNull();
  });
});

describe('AstrologyService.getSpecializations', () => {
  it('returns array of specialization metadata', () => {
    const list = astrologyService.getSpecializations();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) {
      expect(s).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          count: expect.any(Number),
          icon: expect.any(String),
        })
      );
    }
  });
});

describe('AstrologyService.startConsultation', () => {
  it('returns error when astrologer not found', () => {
    const out = astrologyService.startConsultation('user-1', 'astro_999', 'chat');
    expect(out).toEqual({ error: 'Astrologer not found.' });
  });

  it('returns error when astrologer offline', () => {
    // astro_005 is offline per fixture data
    const out = astrologyService.startConsultation('user-1', 'astro_005', 'chat');
    expect(out).toHaveProperty('error');
  });

  it('returns error when astrologer busy', () => {
    // astro_003 is online but busy per fixture
    const out = astrologyService.startConsultation('user-1', 'astro_003', 'chat');
    expect(out).toEqual({ error: 'Astrologer is currently busy with another consultation.' });
  });

  it('creates session for available astrologer', () => {
    const out = astrologyService.startConsultation('user-1', 'astro_001', 'video') as any;
    expect(out.error).toBeUndefined();
    expect(out.sessionId).toMatch(/^session_/);
    expect(out.userId).toBe('user-1');
    expect(out.astrologerId).toBe('astro_001');
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
