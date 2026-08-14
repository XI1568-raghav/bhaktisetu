import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';
// SCAL-08: the in-process cache fallback is real now, so a suite that asserts
// on the query a service issues must start each test from a cold cache.
import { __memoryCacheClear } from '../lib/cache.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { PanchangService } from './panchang.service.js';

let service: PanchangService;

beforeEach(() => {
  vi.clearAllMocks();
  __memoryCacheClear();
  service = new PanchangService();
});

describe('PanchangService.getToday', () => {
  it('returns DB row when present for today', async () => {
    prismaMock.dailyPanchang.findFirst.mockResolvedValueOnce({
      date: new Date(),
      tithi: 'Purnima',
      nakshatra: 'Magha',
      locationCity: 'Delhi',
      festivals: [],
      vrat: [],
      specialInfo: null,
    });

    const out = await service.getToday('Delhi');
    expect(out.tithi).toBe('Purnima');
  });

  it('falls back to closest DB row within 7 days', async () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);
    prismaMock.dailyPanchang.findFirst
      .mockResolvedValueOnce(null) // first lookup: no exact match
      .mockResolvedValueOnce({ // closest
        date: recent,
        tithi: 'Ekadashi',
        nakshatra: 'Pushya',
        locationCity: 'Delhi',
        festivals: [],
        vrat: ['Ekadashi'],
        specialInfo: null,
      });

    const out = await service.getToday('Delhi');
    expect(out.tithi).toBe('Ekadashi');
    expect((out as any).note).toMatch(/most recent/);
  });

  it('computes dynamically when DB empty', async () => {
    prismaMock.dailyPanchang.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const out = await service.getToday('Mumbai');
    expect(out).toHaveProperty('tithi');
    expect(out).toHaveProperty('nakshatra');
    expect((out as any).computed).toBe(true);
  });

  it('computes dynamically when closest > 7 days old', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);
    prismaMock.dailyPanchang.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        date: old,
        tithi: 'Old',
        nakshatra: 'Old',
        locationCity: 'Delhi',
        festivals: [],
        vrat: [],
        specialInfo: null,
      });

    const out = await service.getToday('Delhi');
    expect((out as any).computed).toBe(true);
  });
});

describe('PanchangService.getByDate', () => {
  it('returns null on invalid date string', async () => {
    const out = await service.getByDate('not-a-date');
    expect(out).toBeNull();
  });

  it('returns DB entry when match exists', async () => {
    prismaMock.dailyPanchang.findFirst.mockResolvedValue({
      date: new Date('2026-05-01'),
      tithi: 'Trayodashi',
      nakshatra: 'Hasta',
      locationCity: 'Delhi',
      festivals: [],
      vrat: [],
      specialInfo: null,
    });

    const out = await service.getByDate('2026-05-01', 'Delhi');
    expect((out as any).tithi).toBe('Trayodashi');
  });

  it('falls back to computation when DB miss', async () => {
    prismaMock.dailyPanchang.findFirst.mockResolvedValue(null);

    const out = await service.getByDate('2026-06-15', 'Delhi');
    expect(out).not.toBeNull();
    expect((out as any).computed).toBe(true);
    expect(out).toHaveProperty('tithi');
  });
});

describe('PanchangService.getUpcomingFestivals', () => {
  it('returns DB festivals + dedupes by (date, festival) key', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    prismaMock.dailyPanchang.findMany.mockResolvedValue([
      {
        date: today,
        tithi: 'Purnima',
        nakshatra: 'Hasta',
        festivals: ['Holi'],
        vrat: [],
        specialInfo: 'Festival of colors',
      },
    ]);

    const out = await service.getUpcomingFestivals(30);
    expect(out.total).toBeGreaterThanOrEqual(1);
    const holi = out.festivals.find((f) => f.festival === 'Holi');
    expect(holi).toBeDefined();
    expect(holi!.specialInfo).toBe('Festival of colors');
    expect(out.festivals).toEqual(
      [...out.festivals].sort((a, b) => a.date.getTime() - b.date.getTime())
    );
  });

  it('handles empty DB by surfacing only hardcoded calendar matches', async () => {
    prismaMock.dailyPanchang.findMany.mockResolvedValue([]);
    const out = await service.getUpcomingFestivals(365);
    // Hardcoded FESTIVALS_DB may or may not have entries in window;
    // assert shape, not count.
    expect(Array.isArray(out.festivals)).toBe(true);
    expect(out).toHaveProperty('startDate');
    expect(out).toHaveProperty('endDate');
  });
});

describe('PanchangService.getUpcomingVrats', () => {
  it('combines DB vrats with computed Ekadashi/Purnima', async () => {
    prismaMock.dailyPanchang.findMany.mockResolvedValue([]);
    const out = await service.getUpcomingVrats(60);
    expect(out.total).toBeGreaterThan(0);
    expect(Array.isArray(out.vrats)).toBe(true);
    for (const v of out.vrats) {
      expect(v).toHaveProperty('tithi');
      expect(v).toHaveProperty('vrat');
    }
  });
});

describe('PanchangService.getRange', () => {
  it('returns [] for invalid dates', async () => {
    const out = await service.getRange('bogus', '2026-05-01');
    expect(out).toEqual([]);
  });

  it('fills gaps with computed entries when DB partial', async () => {
    prismaMock.dailyPanchang.findMany.mockResolvedValue([
      {
        date: new Date('2026-05-02'),
        tithi: 'X',
        nakshatra: 'Y',
        locationCity: 'Delhi',
        festivals: [],
        vrat: [],
        specialInfo: null,
      },
    ]);

    const out = await service.getRange('2026-05-01', '2026-05-03', 'Delhi');
    expect(out.length).toBe(3);
    // sorted ascending
    for (let i = 1; i < out.length; i++) {
      expect(new Date((out[i] as any).date).getTime()).toBeGreaterThanOrEqual(
        new Date((out[i - 1] as any).date).getTime()
      );
    }
  });

  it('returns all computed entries when DB empty', async () => {
    prismaMock.dailyPanchang.findMany.mockResolvedValue([]);
    const out = await service.getRange('2026-05-01', '2026-05-05');
    expect(out).toHaveLength(5);
    expect(out.every((e: any) => e.computed === true)).toBe(true);
  });
});
