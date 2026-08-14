/**
 * CM-03 (prod sweep 2026-08-12) — an advertised ₹1,100 became ₹1,301 at step 3
 * of a 4-step wizard, on a site whose homepage trust strip read "₹0 hidden fees".
 *
 * The ₹51 platform fee and the ₹150 prasad-delivery fee are REAL: the API
 * charges them (apps/api/src/services/booking.service.ts folds both into
 * `priceAmount`, which is what the Razorpay order is minted from). So the fix
 * is disclosure, not deletion — the fees must be visible at the first step of
 * the funnel, and the "₹0 hidden fees" claim must stop over-promising.
 *
 * These tests lock three things:
 *   - the web fee constants stay in lockstep with the API's (drift = mischarge)
 *   - the wizard discloses the total before the review step
 *   - the marketing surfaces do not contradict the checkout
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PLATFORM_FEE_INR,
  PRASAD_DELIVERY_FEE_INR,
  formatInr,
  pujaTotalInr,
} from '../lib/puja-pricing';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const readRepo = (rel: string) => readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');

describe('CM-03 — web fee constants mirror the API (the only side that charges)', () => {
  const apiSrc = readRepo('apps/api/src/services/booking.service.ts');

  it('platform fee matches apps/api PLATFORM_FEE_INR', () => {
    const m = apiSrc.match(/export const PLATFORM_FEE_INR\s*=\s*(\d+)/);
    expect(m, 'API PLATFORM_FEE_INR not found — the mirror test cannot verify').toBeTruthy();
    expect(PLATFORM_FEE_INR).toBe(Number(m![1]));
  });

  it('prasad delivery fee matches apps/api PRASAD_DELIVERY_FEE_INR', () => {
    const m = apiSrc.match(/export const PRASAD_DELIVERY_FEE_INR\s*=\s*(\d+)/);
    expect(m, 'API PRASAD_DELIVERY_FEE_INR not found').toBeTruthy();
    expect(PRASAD_DELIVERY_FEE_INR).toBe(Number(m![1]));
  });
});

describe('CM-03 — total maths', () => {
  it('₹1,100 without prasad is ₹1,151', () => {
    expect(pujaTotalInr(1100, false)).toBe(1151);
  });

  it('₹1,100 with prasad is ₹1,301 — the number the sweep captured', () => {
    expect(pujaTotalInr(1100, true)).toBe(1301);
  });

  it('an unpriced (unselected) temple stays at zero rather than showing a bare fee', () => {
    expect(pujaTotalInr(0, false)).toBe(0);
    expect(pujaTotalInr(0, true)).toBe(0);
  });

  it('formats in the Indian grouping used across the funnel', () => {
    expect(formatInr(1301)).toBe('1,301');
    expect(formatInr(225000)).toBe('2,25,000');
  });
});

describe('CM-03 — the wizard discloses the real total before the review step', () => {
  const src = read('app/pujas/book/page.tsx');

  it('reads its fees from the shared module, not local literals', () => {
    expect(src).toContain("from '../../../lib/puja-pricing'");
    // The old inline constants were the drift hazard.
    expect(src).not.toMatch(/^\s*const PLATFORM_FEE\s*=\s*51;/m);
    expect(src).not.toMatch(/^\s*const PRASAD_DELIVERY_FEE\s*=\s*150;/m);
  });

  it('renders a fee disclosure inside step 0, not only in the step-2 breakdown', () => {
    const step0 = src.indexOf('{currentStep === 0 && (');
    const step1 = src.indexOf('{currentStep === 1 && (');
    expect(step0).toBeGreaterThan(-1);
    expect(step1).toBeGreaterThan(step0);
    const stepOneMarkup = src.slice(step0, step1);
    // The disclosure block is tagged with the finding id so it cannot be
    // deleted by accident during an unrelated redesign.
    expect(stepOneMarkup).toContain('CM-03');
    expect(stepOneMarkup).toContain('PLATFORM_FEE');
    expect(stepOneMarkup).toContain('PRASAD_DELIVERY_FEE');
    expect(stepOneMarkup).toMatch(/totalWithoutPrasad|stepOneTotal/);
  });
});

describe('CM-03 — marketing surfaces stop contradicting the checkout', () => {
  it('the homepage trust strip no longer promises "₹0 hidden fees"', () => {
    const src = read('components/home/TrustStrip.tsx');
    expect(src).not.toContain('₹0 hidden fees');
  });

  it('the puja detail page discloses the platform fee next to the advertised price', () => {
    const src = read('app/pujas/[slug]/page.tsx');
    expect(src).toContain('puja-pricing');
    expect(src).toContain('PLATFORM_FEE_INR');
  });
});
