/**
 * NRI dollar pricing (owner decision 2026-10-05: 2.5x, not 9-10x).
 *
 * The money rule these tests lock: Razorpay orders stay INR, the NRI amount is
 * an INR amount, and the dollar figure is a display conversion of exactly that
 * INR amount. The amount the wizard shows must equal what the API charges.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  NRI_PREMIUM_MULTIPLIER,
  NRI_ROUND_STEP_INR,
  USD_INR_RATE,
  nriPujaPriceInr,
  nriTotalInr,
  usdFromInr,
  usdPriceLine,
  resolveDisplayCurrency,
  isIndiaTimeZone,
} from '../lib/nri-pricing';
import { PLATFORM_FEE_INR, PRASAD_DELIVERY_FEE_INR, pujaTotalInr } from '../lib/puja-pricing';
import {
  nriPujaPriceInr as apiNriPujaPriceInr,
  chargedPujaPriceInr as apiChargedPujaPriceInr,
  NRI_PREMIUM_MULTIPLIER as API_MULT,
  NRI_ROUND_STEP_INR as API_STEP,
  USD_INR_RATE as API_RATE,
} from '../../api/src/lib/nri-pricing';

const readRepo = (rel: string) => readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');

describe('web and API constants agree', () => {
  it('multiplier, step and display rate are identical', () => {
    expect(NRI_PREMIUM_MULTIPLIER).toBe(API_MULT);
    expect(NRI_ROUND_STEP_INR).toBe(API_STEP);
    expect(USD_INR_RATE).toBe(API_RATE);
    expect(NRI_PREMIUM_MULTIPLIER).toBe(2.5);
  });
  it('web fee constants still match the API (fees are not multiplied)', () => {
    const api = readRepo('apps/api/src/services/booking.service.ts');
    expect(PLATFORM_FEE_INR).toBe(Number(api.match(/export const PLATFORM_FEE_INR\s*=\s*(\d+)/)![1]));
    expect(PRASAD_DELIVERY_FEE_INR).toBe(
      Number(api.match(/export const PRASAD_DELIVERY_FEE_INR\s*=\s*(\d+)/)![1]),
    );
  });
});

describe('the amount shown equals the amount the API charges', () => {
  it('web nriPujaPriceInr == API nriPujaPriceInr for every whole-rupee price up to 50,000', () => {
    for (let p = 1; p <= 50000; p++) {
      expect(nriPujaPriceInr(p), `price ${p}`).toBe(Number(apiNriPujaPriceInr(p)));
    }
  });
  it('web agrees with the API on paise-bearing prices too', () => {
    for (const p of [751.5, 1099.99, 2501.25, 0.5]) {
      expect(nriPujaPriceInr(p), `price ${p}`).toBe(Number(apiNriPujaPriceInr(p)));
    }
  });
  it('total = NRI puja price + platform fee (+ prasad fee), both flat', () => {
    expect(nriTotalInr(1100, false)).toBe(2750 + PLATFORM_FEE_INR);
    expect(nriTotalInr(1100, true)).toBe(2750 + PLATFORM_FEE_INR + PRASAD_DELIVERY_FEE_INR);
    expect(nriTotalInr(0, true)).toBe(0);
  });
  it('the dollar line carries the exact INR figure that is charged', () => {
    const total = nriTotalInr(1100, false); // 2801
    const line = usdPriceLine(total);
    expect(line).toBe(`$${usdFromInr(total)} (charged as ₹2,801; the dollar figure is for reference)`);
  });
});

describe('which currency is shown', () => {
  it('a remembered choice always wins', () => {
    expect(resolveDisplayCurrency({ stored: 'INR', timeZone: 'America/New_York', isNri: true })).toBe('INR');
    expect(resolveDisplayCurrency({ stored: 'USD', timeZone: 'Asia/Kolkata', isNri: false })).toBe('USD');
  });
  it('defaults to USD when the browser timezone is not India', () => {
    expect(resolveDisplayCurrency({ timeZone: 'America/Los_Angeles' })).toBe('USD');
    expect(resolveDisplayCurrency({ timeZone: 'Europe/London' })).toBe('USD');
  });
  it('defaults to INR in India, and when the timezone is unknown', () => {
    expect(resolveDisplayCurrency({ timeZone: 'Asia/Kolkata' })).toBe('INR');
    expect(resolveDisplayCurrency({ timeZone: 'Asia/Calcutta' })).toBe('INR');
    expect(resolveDisplayCurrency({})).toBe('INR');
    expect(isIndiaTimeZone(null)).toBe(false);
  });
  it('a signed-in isNri profile counts, even from an Indian timezone', () => {
    expect(resolveDisplayCurrency({ timeZone: 'Asia/Kolkata', isNri: true })).toBe('USD');
  });
  it('ignores a junk stored value', () => {
    expect(resolveDisplayCurrency({ stored: 'EUR', timeZone: 'Asia/Kolkata' })).toBe('INR');
  });
});

describe('pandit-direct checkout (/from-offering) shows what the API charges', () => {
  it('USD view total == API NRI puja price + the flat platform fee, for every price up to 50,000', () => {
    for (let p = 1; p <= 50000; p += 7) {
      const apiCharged = Number(apiChargedPujaPriceInr(p, true)) + PLATFORM_FEE_INR;
      expect(nriTotalInr(p, false), `price ${p}`).toBe(apiCharged);
    }
  });
  it('INR view total == API domestic puja price + the flat platform fee', () => {
    for (const p of [1, 751.5, 1100, 5100, 50000]) {
      expect(Number(apiChargedPujaPriceInr(p, false)) + PLATFORM_FEE_INR).toBe(pujaTotalInr(p, false));
    }
  });
  const page = readRepo('apps/web/app/checkout/offering/page.tsx');
  it('the page sends the explicit flag and prices from the same helpers as the wizard', () => {
    expect(page).toMatch(/nriPricing:\s*isNriPricing/);
    expect(page).toMatch(/nriTotalInr\(priceInr, false\)/);
    expect(page).toMatch(/useDisplayCurrency\(\)/);
  });
  it('refuses to open Razorpay when the order amount is not the amount shown', () => {
    expect(page).toMatch(/Number\(data\.amount\) !== Math\.round\(totalPayableInr \* 100\)/);
  });
});
