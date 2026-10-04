/**
 * LEG-17 (in-lane extension, found 2026-08-28) — /store prints a star rating
 * and a review count for products that have never been sold or reviewed.
 *
 * The LEG-17 sweep removed the fabricated MONEY claim from this grid (the
 * "-32%" badge and the struck-through `compareAtPrice`, see
 * __tests__/leg17-store-fabricated-reference-price.test.tsx) and left the
 * fabricated TRUST claim standing eight lines above it, in the same card:
 *
 *     app/store/page.tsx:232-242
 *       <Star ... /> {product.rating}          ->  "4.7"
 *       ({product.reviewCount.toLocaleString()})  ->  "(342)"
 *
 * Both numbers are fabricated, on BOTH data paths:
 *
 *   1. Seed path (the live one — `isMedusaEnabled()` is false, so
 *      `listProducts()` returns `SEED_PRODUCTS.map(seedToMedusa)`):
 *      lib/products.ts hardcodes `rating: 4.7, reviewCount: 342` on prod_001
 *      and a rating on all 25 seed rows. The reference-price test in this
 *      directory already establishes the premise in the same words — the seed
 *      catalogue "has never taken an order". A catalogue that has never taken
 *      an order has never collected 342 reviews.
 *
 *   2. Medusa path: lib/medusa.ts maps every real product with
 *      `rating: 4.5, reviewCount: 0` — a 4.5-star average explicitly derived
 *      from zero reviews, rendered as "4.5 (0)".
 *
 * There IS a real `Review` model (apps/api/prisma/schema.prisma, with
 * `StoreProduct.reviews`) and a real GET /store/reviews route, so this is not
 * a missing feature being papered over — it is a hardcoded number rendered
 * where the real one belongs. Nothing joins the grid to that table.
 *
 * Fabricated ratings are the same consumer-protection class as the fabricated
 * reference price LEG-17 already removed, and arguably the more load-bearing
 * of the two: a star average is the single strongest purchase signal on a
 * product grid.
 *
 * Asserted on the RENDERED DOM, like its sibling test, so no comment in the
 * page can satisfy or trip the guard.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';

// Same next/navigation stub the sibling LEG-17 test uses: /store mounts
// StoreFilterBar, and vitest has no mounted app router.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) };
});

import StorePage from '../app/store/page';
import { CartProvider } from '../components/CartContext';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

async function renderStore() {
  const ui = await StorePage({ searchParams: Promise.resolve({}) });
  await act(async () => {
    render(<CartProvider>{ui}</CartProvider>);
  });
}

describe('LEG-17 — /store publishes no fabricated review count', () => {
  it('prints no parenthesised review count on any card', async () => {
    await renderStore();
    const text = document.body.textContent ?? '';
    // "(342)", "(1,204)", "(0)" — a review tally next to a rating.
    const tally = /\(\d[\d,]*\)/.exec(text);
    expect(
      tally?.[0],
      'a review count is rendered for a catalogue that has never taken an order',
    ).toBeUndefined();
  });

  it('prints no star rating for the seed catalogue', async () => {
    await renderStore();
    const text = document.body.textContent ?? '';
    // prod_001's hardcoded 4.7, and the 4.5 the Medusa mapper invents.
    expect(text).not.toMatch(/\b4\.7\b/);
    expect(text).not.toMatch(/\b4\.5\b/);
  });

  it('renders no filled star icon in a rating badge', async () => {
    await renderStore();
    // lucide renders <svg class="lucide-star ... fill-tulsi-green-dark">
    const filledStars = document.querySelectorAll('svg[class*="fill-tulsi-green"]');
    expect(filledStars.length, 'a rating star badge is still rendered').toBe(0);
  });

  it('still shows the product and its real price, so the grid is not just emptied', async () => {
    await renderStore();
    const text = document.body.textContent ?? '';
    expect(text).toContain('Premium Brass Puja Thali Set (7 Piece)');
    expect(text).toContain('1,299');
  });
});
