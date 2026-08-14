import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DELIVERY_FEE_INR,
  FREE_DELIVERY_THRESHOLD_INR,
  computeStoreOrderTotals,
} from './store-pricing.js';

// COM-06 / S-09 drift guard. POST /store/orders now 409s when the client's
// total disagrees with the server's, so if these two constants ever diverge
// EVERY checkout starts failing. This test reads the browser copy and fails
// first, at build time, instead of in production at the pay button.

const WEB_PRICING = resolve(__dirname, '../../../web/lib/store-pricing.ts');

function readWebConstant(name: string): number {
  const src = readFileSync(WEB_PRICING, 'utf8');
  const m = src.match(new RegExp(`export const ${name}\\s*=\\s*(\\d+)`));
  if (!m) throw new Error(`web store-pricing.ts does not export ${name}`);
  return Number(m[1]);
}

describe('store pricing — API and web agree', () => {
  it('finds the web pricing module', () => {
    expect(existsSync(WEB_PRICING)).toBe(true);
  });

  it('uses the same free-delivery threshold', () => {
    expect(readWebConstant('FREE_DELIVERY_THRESHOLD_INR')).toBe(FREE_DELIVERY_THRESHOLD_INR);
  });

  it('uses the same delivery fee', () => {
    expect(readWebConstant('DELIVERY_FEE_INR')).toBe(DELIVERY_FEE_INR);
  });

  it('neither side computes a tax line', () => {
    const web = readFileSync(WEB_PRICING, 'utf8');
    const api = readFileSync(resolve(__dirname, 'store-pricing.ts'), 'utf8');
    expect(web).not.toMatch(/\*\s*0\.05/);
    expect(api).not.toMatch(/\*\s*0\.05/);
  });
});

describe('computeStoreOrderTotals', () => {
  it('charges delivery below the threshold', () => {
    expect(computeStoreOrderTotals([{ qty: 1, unitPriceInr: 199 }])).toEqual({
      subtotalInr: 199,
      deliveryFeeInr: 49,
      totalInr: 248,
    });
  });

  it('waives delivery at exactly the threshold', () => {
    expect(computeStoreOrderTotals([{ qty: 1, unitPriceInr: 499 }])).toEqual({
      subtotalInr: 499,
      deliveryFeeInr: 0,
      totalInr: 499,
    });
  });

  it('sums multiple lines before deciding the fee', () => {
    expect(
      computeStoreOrderTotals([
        { qty: 2, unitPriceInr: 200 },
        { qty: 1, unitPriceInr: 150 },
      ]),
    ).toEqual({ subtotalInr: 550, deliveryFeeInr: 0, totalInr: 550 });
  });

  // The order route rejects an empty items[] before pricing ever runs, so this
  // only pins that the helper stays total rather than throwing.
  it('is total over an empty basket', () => {
    expect(computeStoreOrderTotals([]).subtotalInr).toBe(0);
  });
});
