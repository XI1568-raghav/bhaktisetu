/**
 * Store-owner revamp (2026-08-05) — regression guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Store checkout — real addresses (fake rows removed)', () => {
  it('loads addresses from /users/me/addresses, not hardcoded fake rows', () => {
    const src = read('app/store/checkout/page.tsx');
    expect(src).toContain('/users/me/addresses');
    expect(src).not.toContain('SAVED_ADDRESSES');
    expect(src).not.toContain('Lotus Garden Apartments');
    expect(src).not.toContain('Whitefield');
  });

  it('Add New Address links to /profile (was a dead button)', () => {
    const src = read('app/store/checkout/page.tsx');
    expect(src).toMatch(/href="\/profile"/);
  });
});

describe('Store catalog — dead Load More removed', () => {
  it('store page no longer renders a dead Load More button', () => {
    const src = read('app/store/page.tsx');
    expect(src).not.toContain('Load More Products');
  });
});

describe('Store orders — tracking number captured', () => {
  it('orders page collects a tracking number when marking SHIPPED', () => {
    const src = read('app/store-admin/orders/page.tsx');
    expect(src).toContain('trackingNumber');
    expect(src).toMatch(/trackingNumber.*SHIPPED|SHIPPED.*trackingNumber|nextStatus === 'SHIPPED'/s);
  });
});
