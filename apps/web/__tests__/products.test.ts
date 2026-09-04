import { describe, it, expect } from 'vitest';
import { PRODUCTS, CATEGORIES, getProductByHandle } from '../lib/products';

describe('products', () => {
  it('exports a non-empty product catalogue', () => {
    expect(PRODUCTS.length).toBeGreaterThan(0);
  });

  it('every product has a unique id', () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every product has a unique handle', () => {
    const handles = PRODUCTS.map((p) => p.handle);
    expect(new Set(handles).size).toBe(handles.length);
  });

  /**
   * LEG-17 — these two cases replace, deliberately, a pair that encoded the
   * OPPOSITE contract:
   *
   *   it('compareAtPrice >= price for every product', ...)
   *   it('discount stays in 0-100 range', ...)
   *
   * They were internally consistent and passed for months, and that is the
   * point: they policed the SHAPE of a fabricated discount instead of asking
   * whether it should exist. Every one of the 24 rows carried a `compareAtPrice`
   * above its price and a `discount` derived from it, and no row had ever been
   * sold at that price, because this catalogue has never taken an order. Under
   * the Consumer Protection Act 2019 and the CCPA misleading-advertisement
   * guidelines that is a fabricated discount. `discount` is gone from the type
   * and `compareAtPrice` is now nullable and null on every row, so the old
   * assertions could not be satisfied honestly — the contract they described
   * is the defect. What replaces them is the invariant that actually matters.
   */
  it('no product carries a reference price it was never sold at', () => {
    const offenders = PRODUCTS.filter((p) => p.compareAtPrice !== null).map((p) => p.id);
    expect(offenders).toEqual([]);
  });

  it('no product claims a review or a star average', () => {
    expect(PRODUCTS.filter((p) => p.reviewCount !== 0).map((p) => p.id)).toEqual([]);
    expect(PRODUCTS.filter((p) => p.rating !== null).map((p) => p.id)).toEqual([]);
  });

  it('every product still has a real price', () => {
    for (const p of PRODUCTS) {
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('getProductByHandle returns the matching product', () => {
    const first = PRODUCTS[0]!;
    expect(getProductByHandle(first.handle)).toEqual(first);
  });

  it('getProductByHandle returns undefined for unknown handles', () => {
    expect(getProductByHandle('not-a-real-handle')).toBeUndefined();
  });

  it('exposes a non-empty categories list', () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });
});
