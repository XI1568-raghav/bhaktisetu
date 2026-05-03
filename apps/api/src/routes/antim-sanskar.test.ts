import { describe, it, expect } from 'vitest';
import { __testing, PACKAGES, GHATS, SACRED_RIVERS } from './antim-sanskar.js';

const { bookSchema, makeBookingNumber } = __testing;

describe('antim-sanskar booking validator', () => {
  const valid = {
    deceasedName: 'Sri Ramesh Kumar',
    contactName: 'Suresh Kumar',
    contactPhone: '+919812345678',
    contactRelation: 'son',
    city: 'Varanasi',
    packageTier: 'standard' as const,
  };

  it('accepts a minimal valid request', () => {
    const r = bookSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('rejects an unknown package tier', () => {
    const r = bookSchema.safeParse({ ...valid, packageTier: 'platinum' });
    expect(r.success).toBe(false);
  });

  it('rejects malformed preferredDate', () => {
    const r = bookSchema.safeParse({ ...valid, preferredDate: '02/05/2026' });
    expect(r.success).toBe(false);
  });

  it('accepts a properly formatted preferredDate', () => {
    const r = bookSchema.safeParse({ ...valid, preferredDate: '2026-05-02' });
    expect(r.success).toBe(true);
  });

  it('rejects empty deceased name', () => {
    const r = bookSchema.safeParse({ ...valid, deceasedName: '' });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown sacred river', () => {
    const r = bookSchema.safeParse({ ...valid, asthiVisarjanRiver: 'kaveri' });
    expect(r.success).toBe(false);
  });

  it('accepts an optional family email', () => {
    const r = bookSchema.safeParse({ ...valid, email: 'family@example.com' });
    expect(r.success).toBe(true);
  });
});

describe('antim-sanskar booking number', () => {
  it('uses the BS-AS-YYYYMMDD-NNNNN shape', () => {
    expect(makeBookingNumber()).toMatch(/^BS-AS-\d{8}-\d{5}$/);
  });
});

describe('antim-sanskar packages', () => {
  it('exposes exactly three tiers in ascending price', () => {
    expect(PACKAGES.length).toBe(3);
    const prices = PACKAGES.map((p) => p.priceInr);
    expect(prices).toEqual([15000, 35000, 50000]);
  });
});

describe('antim-sanskar ghat seed', () => {
  it('seeds at least 30 verified ghats', () => {
    expect(GHATS.length).toBeGreaterThanOrEqual(30);
  });

  it('every ghat has a city, state, and stable id', () => {
    for (const g of GHATS) {
      expect(g.id.length).toBeGreaterThan(0);
      expect(g.city.length).toBeGreaterThan(0);
      expect(g.state.length).toBeGreaterThan(0);
    }
  });

  it('exposes the four sacred rivers for asthi visarjan', () => {
    expect(SACRED_RIVERS.map((r) => r.id).sort()).toEqual([
      'ganga',
      'godavari',
      'narmada',
      'yamuna',
    ]);
  });
});
