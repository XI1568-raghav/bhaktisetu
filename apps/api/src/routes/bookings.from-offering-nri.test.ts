import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import { __testing } from './bookings.js';
import { chargedPujaPriceInr } from '../lib/nri-pricing.js';

// Pandit-direct checkout (POST /bookings/from-offering) honours the same
// explicit `nriPricing` flag as the temple wizard: the amount the page shows
// is the amount the order is created for. Still INR; the pandit's share stays
// 80% of the puja price actually charged; the flat fees are not multiplied.

const { fromOfferingBodySchema, splitPujaPrice } = __testing;

const base = {
  offeringId: '0f9a3d4c-2b41-4d6e-8a10-6f2c9b7e1d55',
  scheduledDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })(),
  scheduledTime: '06:00',
  devotees: [{ name: 'Arjun Sharma' }],
};

describe('from-offering body: nriPricing', () => {
  it('defaults to false (domestic) when absent', () => {
    const r = fromOfferingBodySchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nriPricing).toBe(false);
  });
  it('accepts true', () => {
    const r = fromOfferingBodySchema.safeParse({ ...base, nriPricing: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nriPricing).toBe(true);
  });
  it('rejects a non-boolean', () => {
    expect(fromOfferingBodySchema.safeParse({ ...base, nriPricing: 'yes' }).success).toBe(false);
  });
  it('the legacy currency hint still never selects the price', () => {
    const r = fromOfferingBodySchema.safeParse({ ...base, currency: 'USD' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nriPricing).toBe(false);
  });
});

describe('chargedPujaPriceInr', () => {
  it('is the domestic price without the flag and 2.5x (rounded to Rs 10) with it', () => {
    expect(chargedPujaPriceInr(1100, false).toString()).toBe('1100');
    expect(chargedPujaPriceInr(1100, true).toString()).toBe('2750');
    expect(chargedPujaPriceInr('1101', true).toString()).toBe('2750');
  });
  it('the 80/20 split is on the NRI price actually charged', () => {
    const charged = chargedPujaPriceInr(1100, true);
    const { priestPayout, platformCommission } = splitPujaPrice(charged, 0.8);
    expect(priestPayout.toString()).toBe('2200');
    expect(platformCommission.toString()).toBe('550');
    expect(priestPayout.add(platformCommission).equals(charged)).toBe(true);
  });
});

describe('from-offering handler', () => {
  const src = readFileSync(fileURLToPath(new URL('./bookings.ts', import.meta.url)), 'utf8');
  const start = src.indexOf("'/from-offering'");
  const end = src.indexOf("'/verify-payment'", start);
  const handler = src.slice(start, end);
  it('prices the puja from the flag, splits that price, and keeps fees flat and INR', () => {
    expect(handler).toMatch(/chargedPujaPriceInr\(offering\.basePrice\.toString\(\), body\.nriPricing\)/);
    expect(handler).toMatch(/splitPujaPrice\(\s*pujaPrice,/);
    expect(handler).toMatch(/priceAmount = pujaPrice\.add\(platformFee\)\.add\(prasadFee\)/);
    expect(handler).toMatch(/const currency = 'INR'/);
    expect(handler).not.toMatch(/currency:\s*'USD'/);
  });
  it('returns the breakdown the page renders', () => {
    expect(handler).toMatch(/basePriceInr: pujaPrice\.toString\(\)/);
  });
});

void Prisma;
