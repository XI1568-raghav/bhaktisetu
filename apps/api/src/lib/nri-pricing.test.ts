import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  NRI_PREMIUM_MULTIPLIER,
  USD_INR_RATE,
  NRI_ROUND_STEP_INR,
  nriPujaPriceInr,
  usdDisplayFromInr,
} from './nri-pricing.js';
import { commissionGross, commissionPlatformCut } from './commission-math.js';

describe('nri-pricing config', () => {
  it('uses the owner-approved 2.5x premium (not the old 9-10x)', () => {
    expect(NRI_PREMIUM_MULTIPLIER).toBe(2.5);
    expect(NRI_PREMIUM_MULTIPLIER).toBeGreaterThanOrEqual(2);
    expect(NRI_PREMIUM_MULTIPLIER).toBeLessThanOrEqual(3);
  });
  it('has a positive display FX rate and a round step', () => {
    expect(USD_INR_RATE).toBeGreaterThan(0);
    expect(NRI_ROUND_STEP_INR).toBe(10);
  });
});

describe('nriPujaPriceInr', () => {
  it('multiplies by 2.5 and rounds to the INR step', () => {
    expect(nriPujaPriceInr(1100).toString()).toBe('2750');
    expect(nriPujaPriceInr(500).toString()).toBe('1250');
    expect(nriPujaPriceInr(751).toString()).toBe('1880'); // 1877.5 -> nearest 10
  });
  it('accepts Decimal and string input and returns a Decimal', () => {
    const out = nriPujaPriceInr(new Prisma.Decimal('1100.00'));
    expect(out).toBeInstanceOf(Prisma.Decimal);
    expect(out.toString()).toBe('2750');
    expect(nriPujaPriceInr('1100').toString()).toBe('2750');
  });
  it('is never below the domestic price and 0 stays 0', () => {
    expect(nriPujaPriceInr(0).toString()).toBe('0');
    expect(nriPujaPriceInr(1).gte(1)).toBe(true);
  });
});

describe('usdDisplayFromInr', () => {
  it('converts at the display rate to whole dollars', () => {
    expect(usdDisplayFromInr(2801)).toBe(Math.round(2801 / USD_INR_RATE));
  });
});

describe('commission-math on an NRI-priced split', () => {
  it('recovers the NRI gross and platform cut from the stored 80/20 split', () => {
    const nri = nriPujaPriceInr(1100); // 2750
    const priestPayout = nri.mul('0.8'); // 2200
    const platformCommission = nri.sub(priestPayout); // 550
    const rate = platformCommission.div(nri);
    expect(commissionGross(priestPayout, rate).toString()).toBe('2750');
    expect(commissionPlatformCut(priestPayout, rate).toString()).toBe('550');
  });
});
