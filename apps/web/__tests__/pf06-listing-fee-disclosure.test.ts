/**
 * PF-06 (prod sweep 2026-08-12, P2) — the ₹51 platform fee first appeared at
 * step 3 of the booking wizard.
 *
 * The listing card and the detail hero both advertised "₹451"; the wizard's
 * step-3 breakdown then read "Puja Fee ₹451 / Platform Fee ₹51 / Total ₹502" —
 * an 11.3% surcharge on the cheapest puja, revealed only after the devotee had
 * chosen a temple, a date, a slot, and typed devotee names and a sankalp.
 *
 * CM-03 closed the detail hero and the wizard's first step. The catalogue card
 * — the first price a devotee ever sees, and the one they compare across ten
 * pujas — was still bare "₹1,100 onwards". This closes that surface, and pins
 * that all three read the fee from the one shared constant so the listing and
 * the checkout cannot drift.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PLATFORM_FEE_INR, formatInr, pujaTotalInr } from '../lib/puja-pricing';

/** Source with comments removed, so prose cannot satisfy a code guard. */
function codeOf(rel: string): string {
  return readFileSync(path.resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('PF-06 — the catalogue card discloses the fee', () => {
  const src = codeOf('app/pujas/page.tsx');

  it('imports the shared constant rather than printing a literal 51', () => {
    expect(src).toContain('puja-pricing');
    expect(src).toContain('PLATFORM_FEE_INR');
  });

  it('renders the fee inside the card price block, next to "onwards"', () => {
    const anchor = src.indexOf('onwards');
    expect(anchor, '"onwards" price block not found on the card').toBeGreaterThan(-1);
    // The disclosure must sit in the same block, not somewhere else on the page.
    const block = src.slice(Math.max(0, anchor - 600), anchor + 600);
    expect(block).toContain('PLATFORM_FEE_INR');
    expect(block).toMatch(/platform fee/i);
  });

  it('renders the all-in total from the shared helper', () => {
    expect(src).toContain('pujaTotalInr(');
  });

  it('does not hard-code the fee anywhere on the page', () => {
    expect(src).not.toMatch(/=\s*51\b/);
  });
});

describe('PF-06 — the number a card shows is the number checkout charges', () => {
  it('the cheapest puja in the finding: ₹451 + ₹51 = ₹502', () => {
    expect(PLATFORM_FEE_INR).toBe(51);
    expect(pujaTotalInr(451, false)).toBe(502);
    expect(formatInr(pujaTotalInr(451, false))).toBe('502');
  });

  it('an unpriced puja stays at zero rather than advertising a bare fee', () => {
    expect(pujaTotalInr(0, false)).toBe(0);
  });
});
