import { describe, it, expect } from 'vitest';
import {
  computeNriPrice,
  validateNriPriceBand,
  NRI_INR_MULTIPLIER,
  NRI_INR_MULTIPLIER_MAX,
  INR_USD_INDICATIVE_RATE,
} from './pricing';

describe('pricing helpers — R-Q2-G-006', () => {
  describe('computeNriPrice', () => {
    it('applies 9× multiplier when no explicit override', () => {
      const r = computeNriPrice(1000);
      expect(r.multiplier).toBe(NRI_INR_MULTIPLIER);
      expect(r.nriEquivalentInr).toBe(9000);
      expect(r.nriPriceUsd).toBeCloseTo(9000 / INR_USD_INDICATIVE_RATE, 1);
    });

    it('uses explicit nriPrice override when provided', () => {
      const r = computeNriPrice(1000, 120);
      expect(r.nriPriceUsd).toBe(120);
      expect(r.nriEquivalentInr).toBe(Math.round(120 * INR_USD_INDICATIVE_RATE));
    });

    it('treats explicit nriPrice of 0 as fallback to 9× rule', () => {
      const r = computeNriPrice(500, 0);
      expect(r.multiplier).toBe(NRI_INR_MULTIPLIER);
    });

    it('treats null nriPrice as fallback to 9× rule', () => {
      const r = computeNriPrice(500, null);
      expect(r.multiplier).toBe(NRI_INR_MULTIPLIER);
    });

    it('rejects negative base price', () => {
      expect(() => computeNriPrice(-100)).toThrow(/Invalid basePriceInr/);
    });

    it('rejects NaN base price', () => {
      expect(() => computeNriPrice(NaN)).toThrow(/Invalid basePriceInr/);
    });
  });

  describe('validateNriPriceBand', () => {
    it('accepts USD price within 9-10× band', () => {
      // ₹1000 base, $108 → ~₹9018 → 9.02× → valid
      expect(validateNriPriceBand(1000, 108)).toBeNull();
    });

    it('rejects below 9× floor (with 15% tolerance)', () => {
      // ₹1000 base, $50 → ~₹4175 → 4.18× → reject
      const err = validateNriPriceBand(1000, 50);
      expect(err).toContain('below 9× floor');
    });

    it('rejects above 10× ceiling (with 15% tolerance)', () => {
      // ₹1000 base, $200 → ~₹16700 → 16.7× → reject
      const err = validateNriPriceBand(1000, 200);
      expect(err).toContain('above 10× ceiling');
    });

    it('returns null when prices are zero (no-op)', () => {
      expect(validateNriPriceBand(0, 0)).toBeNull();
      expect(validateNriPriceBand(1000, 0)).toBeNull();
    });

    it('exposes the max multiplier constant', () => {
      expect(NRI_INR_MULTIPLIER_MAX).toBe(10);
    });
  });
});
