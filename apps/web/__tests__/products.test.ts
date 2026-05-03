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

  it('compareAtPrice >= price for every product', () => {
    for (const p of PRODUCTS) {
      expect(p.compareAtPrice).toBeGreaterThanOrEqual(p.price);
    }
  });

  it('discount stays in 0–100 range', () => {
    for (const p of PRODUCTS) {
      expect(p.discount).toBeGreaterThanOrEqual(0);
      expect(p.discount).toBeLessThanOrEqual(100);
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
