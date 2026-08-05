import { describe, it, expect } from 'vitest';
import {
  PUJA_PRICE_BANDS,
  CITY_MULTIPLIER,
  INSTANT_SURGE_CAP,
  resolvePujaPrice,
} from './pricing-bands.js';

describe('pricing-bands — competitor-anchored at-home puja pricing', () => {
  it('has bands for the core at-home pujas', () => {
    const slugs = PUJA_PRICE_BANDS.map((b) => b.slug);
    for (const s of ['satyanarayan-puja', 'griha-pravesh', 'rudrabhishek', 'vivah-marriage']) {
      expect(slugs).toContain(s);
    }
  });

  it('every band is monotonic: budget <= mid <= premium', () => {
    for (const b of PUJA_PRICE_BANDS) {
      expect(b.budgetInr).toBeLessThanOrEqual(b.midInr);
      expect(b.midInr).toBeLessThanOrEqual(b.premiumInr);
    }
  });

  it('resolves budget tier by default at metro rate', () => {
    const r = resolvePujaPrice({ slug: 'satyanarayan-puja' });
    expect(r).not.toBeNull();
    expect(r!.baseInr).toBe(3100);
  });

  it('senior/premium tier prices higher (T3 senior premium)', () => {
    const budget = resolvePujaPrice({ slug: 'satyanarayan-puja', tier: 'budget', city: 'bangalore' });
    const senior = resolvePujaPrice({ slug: 'satyanarayan-puja', tier: 'premium', city: 'bangalore' });
    expect(senior!.priceInr).toBeGreaterThan(budget!.priceInr);
  });

  it('Delhi prices below Bangalore (city multiplier, SmartPuja anchor)', () => {
    const blr = resolvePujaPrice({ slug: 'satyanarayan-puja', tier: 'budget', city: 'bangalore' });
    const del = resolvePujaPrice({ slug: 'satyanarayan-puja', tier: 'budget', city: 'delhi' });
    expect(del!.priceInr).toBeLessThan(blr!.priceInr);
  });

  it('T1 instant surge is capped at INSTANT_SURGE_CAP (2x, India govt anchor)', () => {
    const r = resolvePujaPrice({
      slug: 'satyanarayan-puja',
      tier: 'budget',
      city: 'bangalore',
      isMuhuratPeak: true,
      surgeMultiplier: 5, // request way over cap
    });
    expect(r!.surgeApplied).toBeLessThanOrEqual(INSTANT_SURGE_CAP);
    expect(r!.surgeApplied).toBe(INSTANT_SURGE_CAP);
    expect(r!.priceInr).toBe(Math.round(r!.baseInr * CITY_MULTIPLIER.bangalore! * INSTANT_SURGE_CAP));
  });

  it('no surge on non-peak days', () => {
    const r = resolvePujaPrice({ slug: 'griha-pravesh', tier: 'mid', city: 'mumbai' });
    expect(r!.surgeApplied).toBe(1);
  });

  it('returns null for an unknown puja slug', () => {
    expect(resolvePujaPrice({ slug: 'not-a-puja' })).toBeNull();
  });
});
