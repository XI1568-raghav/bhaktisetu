/**
 * LEG-17, the residue: the store still awards four badges that are the removed
 * numbers written as words.
 *
 * The main LEG-17 pass took the measurements out of lib/products.ts and out of
 * the controls that ranked on them. Every seed row now carries
 * `rating: null, reviewCount: 0, compareAtPrice: null`; `discount` is gone
 * outright; lib/store-filters.ts dropped the `rating-desc` sort and the
 * `rating=4plus` filter, and rewrote the default "Popular" ordering off
 * `reviewCount` with the reasoning written into the file:
 *
 *   "Removing the star from the product card while leaving a 'Rating: High to
 *    Low' control in place would not have fixed anything: the invented number
 *    would still decide what a shopper sees first, it would just stop being
 *    visible enough to challenge."
 *
 * That is exactly what the `tag` field kept doing. Six of the seventeen badges
 * assert the very claims the sweep deleted, only as adjectives instead of
 * digits — and unlike the digits they are still on screen, rendered as a pill
 * on the /store grid (app/store/page.tsx:197), on the product page
 * (components/store/ProductDetail.tsx:127) and on its related-products rail
 * (:363):
 *
 *   Bestseller  x2  a sales rank. The seed catalogue has never taken an order.
 *   Popular     x2  the `reviewCount` ordering, restated. Same absent signal.
 *   Top Rated   x1  a rating. Every `rating` in this file is null.
 *   Trending    x1  a velocity claim. Nothing measures velocity.
 *
 * Under the CCPA guidelines a "Bestseller" pill is a representation about sales
 * performance, and one attached to a product that has never been sold is a
 * misleading advertisement in the same way a struck-through price never charged
 * is. The remedy is the one this file's own history sets: the honest default is
 * ABSENCE. `tag` is `string | null` and every render site is guarded by
 * `{product.tag && ...}`, so a claim nobody can substantiate simply does not
 * appear. Substituting a fresh adjective would only trade one unverified claim
 * for another.
 *
 * WHAT DELIBERATELY STAYS. 'Premium', 'Certified', 'Handcrafted', 'Pure &
 * Natural', 'Gaushala Sourced', 'Gift Pick', 'Diwali Special' and 'Festival
 * Special' describe the product or the merchandising occasion; none of them
 * asserts a measurement. 'New Arrival' stays too, and the reason is written
 * down rather than assumed: lib/store-filters.ts records that listing order IS
 * the order products were added ("newest is the reverse of listing order, which
 * is the order products were added"), and the row carrying that badge is the
 * last one in the array — so it is the most recently added product, which is
 * what the badge says.
 *
 * These assertions read the RUNTIME catalogue and the RENDERED grid. No source
 * text is scanned, so the paragraphs above — which name all four banned badges
 * verbatim — cannot trip the guard that bans them.
 */

import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { vi } from 'vitest';

// /store mounts StoreFilterBar, a client component that pushes filter state
// into the URL. vitest has no mounted app router — same stub the other store
// tests use.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) };
});

import { PRODUCTS } from '../lib/products';
import StorePage from '../app/store/page';
import { CartProvider } from '../components/CartContext';

/**
 * A badge that asserts sales rank, popularity or a rating.
 *
 * Anchored at both ends so it judges the WHOLE badge, not a substring of a
 * longer descriptor: a future 'Trending in Varanasi' would still be a velocity
 * claim and should be caught, but 'Popular Gift Pick' is caught for the same
 * reason, and nothing that merely contains one of these words by accident —
 * 'Bestseller List Book', say — slips through as a product description.
 */
const UNEARNED_BADGE =
  /\b(best[\s-]?sell\w*|top[\s-]?rated|popular|trending|most[\s-]loved|#\s?1)\b/i;

describe('LEG-17 — no seed product wears a badge nothing measured', () => {
  it('the catalogue is the size this sweep looked at', () => {
    expect(PRODUCTS.length).toBe(24);
  });

  it.each(PRODUCTS.map((p) => [p.handle, p.tag] as const))(
    '%s carries no sales-rank, popularity or rating badge',
    (handle, tag) => {
      if (tag === null) return;
      expect(
        tag,
        `${handle} wears "${tag}", a claim about sales or ratings that no order and no review supports`,
      ).not.toMatch(UNEARNED_BADGE);
    },
  );

  it('the honest descriptors survive, so this is not a blanket wipe', () => {
    const kept = PRODUCTS.map((p) => p.tag).filter((t): t is string => t !== null);
    expect(kept.length, 'every badge was removed; only the unearned ones should go').toBeGreaterThan(
      5,
    );
    expect(kept).toContain('Certified');
    expect(kept).toContain('Handcrafted');
    expect(kept).toContain('Gaushala Sourced');
  });

  it('the guard has teeth, and spares the descriptors', () => {
    for (const bad of ['Bestseller', 'Best Seller', 'Top Rated', 'Top-Rated', 'Popular', 'Trending']) {
      expect(bad, `${bad} should be caught`).toMatch(UNEARNED_BADGE);
    }
    for (const ok of [
      'Premium',
      'Certified',
      'Handcrafted',
      'Diwali Special',
      'Festival Special',
      'Gift Pick',
      'Gaushala Sourced',
      'Pure & Natural',
      'New Arrival',
    ]) {
      expect(ok, `${ok} is a description, not a measurement`).not.toMatch(UNEARNED_BADGE);
    }
  });
});

describe('LEG-17 — /store renders none of them either', () => {
  it('no unearned badge reaches the grid', async () => {
    const ui = await StorePage({ searchParams: Promise.resolve({}) });
    await act(async () => {
      render(<CartProvider>{ui}</CartProvider>);
    });
    const text = document.body.textContent ?? '';

    // Sanity: the grid really did render, so an empty page cannot pass this.
    expect(text).toContain('Premium Brass Puja Thali Set (7 Piece)');

    for (const bad of ['Bestseller', 'Top Rated', 'Trending']) {
      expect(text, `"${bad}" is still rendered on /store`).not.toContain(bad);
    }
    // "Popular" is checked separately: the sort control legitimately reads
    // "Sort: Popular", which is a control label and not a claim about any
    // product. Only the product badge is banned, so assert on the badge count
    // rather than on the word.
    const badges = Array.from(document.querySelectorAll('[data-product-tag]')).map((el) =>
      (el.textContent ?? '').trim(),
    );
    for (const b of badges) {
      expect(b, `a product badge reads "${b}"`).not.toMatch(UNEARNED_BADGE);
    }
  });
});
