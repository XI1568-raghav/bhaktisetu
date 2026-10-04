/**
 * LEG-17, part 2 — the surfaces the /store grid fix did not reach.
 *
 * __tests__/leg17-store-fabricated-reference-price.test.tsx closed the listing
 * grid and /store/cart. Everything below was still live afterwards, and the
 * product detail page is the HIGHEST-intent surface of the three:
 *
 *   1. components/store/ProductDetail.tsx rendered the struck-through
 *      `compareAtPrice` AND an explicit "Save ₹600" chip, plus the "-32%"
 *      corner badge from `product.discount`, plus `{product.rating}` and
 *      "342 reviews". Its related-products rail repeated the struck price and
 *      the "(342)" review tally.
 *   2. components/CartDrawer.tsx struck `item.product.compareAtPrice` through
 *      on every line item — the mini-cart twin of the /store/cart row that was
 *      already fixed.
 *   3. components/store/SellerShelf.tsx built its cart payload with
 *      `compareAtPrice: p.compareAtPrice ?? p.price`, MANUFACTURING a reference
 *      price equal to the price for a real seller's item that had none, so the
 *      drawer then struck the item's own price through.
 *   4. lib/store-filters.ts ranked the default grid by the invented
 *      `reviewCount` and offered a "Rating: High to Low" sort and a "4+ Rating"
 *      filter over the invented `rating`. Removing the star from the card while
 *      still letting a shopper sort and filter by it leaves the fabricated
 *      number steering the shelf — it just stops being auditable.
 *   5. lib/products.ts and lib/medusa.ts are where all of it originates:
 *      24 seed rows with compareAtPrice/discount/rating/reviewCount, and a
 *      Medusa mapper whose own comment said it "synthesise[s] sane defaults",
 *      setting `compareAtPrice: priceInr` (printing "₹499 ~~₹499~~") and
 *      `rating: 4.5, reviewCount: 0` — a 4.5-star average from zero reviews.
 *
 * Under the Consumer Protection Act 2019 and the CCPA misleading-advertisement
 * guidelines a struck-through price that was never charged is a fabricated
 * discount. This catalogue has never taken an order, so no row can have one,
 * and none can have a review either.
 *
 * These assertions read the RENDERED DOM and the RUNTIME data, never source
 * text — the files above are now thick with comments naming the very strings
 * being forbidden, and a source scan would flag its own explanation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/store',
  };
});

import ProductDetail from '../components/store/ProductDetail';
import CartDrawer from '../components/CartDrawer';
import SellerShelf from '../components/store/SellerShelf';
import StoreFilterBar from '../components/store/StoreFilterBar';
import { CartProvider, useCart } from '../components/CartContext';
import { PRODUCTS } from '../lib/products';
import { listProducts } from '../lib/medusa';
import type { LiveProduct } from '../lib/store-live';
import {
  parseStoreFilters,
  filterAndSortProducts,
  DEFAULT_STORE_FILTERS,
  SORT_LABEL,
  type FilterableProduct,
} from '../lib/store-filters';

const CART_STORAGE_KEY = 'poojly_cart';

function struckThroughTexts(): string[] {
  return Array.from(document.querySelectorAll('.line-through')).map((el) =>
    (el.textContent ?? '').trim(),
  );
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

// ───────────────────────────────────────────────────────────── PDP

describe('LEG-17 — the product detail page publishes no fabricated numbers', () => {
  // prod_001 carried the worst of it: price 1299, compareAtPrice 1899,
  // discount 32, rating 4.7, reviewCount 342.
  const product = PRODUCTS.find((p) => p.id === 'prod_001')!;

  function renderPdp() {
    return act(async () => {
      render(
        <CartProvider>
          <ProductDetail product={product} />
        </CartProvider>,
      );
    });
  }

  it('renders no struck-through price, on the product or on the related rail', async () => {
    await renderPdp();
    expect(
      struckThroughTexts(),
      'a struck-through "was" price is rendered; no seed product was ever sold at one',
    ).toEqual([]);
  });

  it('makes no "Save ₹X" claim', async () => {
    await renderPdp();
    expect(document.body.textContent ?? '').not.toMatch(/Save\s*₹/i);
  });

  it('renders no percentage-off badge', async () => {
    await renderPdp();
    const badge = /-\d{1,2}%/.exec(document.body.textContent ?? '');
    expect(badge?.[0], 'a fabricated "-NN%" discount badge is still rendered').toBeUndefined();
  });

  it('claims no reviews and no star average', async () => {
    await renderPdp();
    const text = document.body.textContent ?? '';
    expect(text, 'a review tally is printed for a catalogue that has taken no orders').not.toMatch(
      /\breviews?\b/i,
    );
    expect(text).not.toContain('4.7');
  });

  it('still renders the product and its real price, so the page is not just gutted', async () => {
    await renderPdp();
    const text = document.body.textContent ?? '';
    expect(text).toContain('Premium Brass Puja Thali Set (7 Piece)');
    expect(text).toContain('1,299');
    expect(text).not.toContain('1,899');
  });

  /**
   * COM-01 superseded the original form of this test, and superseded it in the
   * strongest possible direction.
   *
   * It used to click "Add to Cart" on prod_001 and assert that no
   * `compareAtPrice` reached `poojly_cart`. There is no longer an "Add to Cart"
   * to click: `POST /api/v1/store/orders` resolves line items against
   * `StoreProduct` BY UUID, prod holds zero of those rows, and `prod_001` is
   * not a uuid — so the button led a devotee through a basket, an address and a
   * payment method to `400 Unknown product: prod_001`. Nothing about this
   * product can reach the cart at all now, which is a superset of the LEG-17
   * property: a reference price cannot be carried by an item that cannot be
   * carried.
   *
   * The LEG-17 property itself is still exercised below, on an ORDERABLE
   * product — the only kind for which "added to the cart" is a thing that
   * happens.
   */
  it('offers no way to add a product no seller stocks', async () => {
    await renderPdp();
    expect(screen.queryByRole('button', { name: /add to cart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /buy now/i })).toBeNull();
    expect(document.body.textContent ?? '').toMatch(/Not available to order/i);
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]')).toEqual([]);
  });

  it('carries no reference price into the cart for a product that CAN be added', async () => {
    // A seller listing: same row, but with the StoreProduct uuid the order
    // route resolves, so the live control renders.
    const orderable = { ...product, id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' };
    await act(async () => {
      render(
        <CartProvider>
          <ProductDetail product={orderable} />
        </CartProvider>,
      );
    });
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].product.compareAtPrice).toBeNull();
  });
});

// ───────────────────────────────────────────────────────── mini-cart

describe('LEG-17 — the cart drawer publishes no fabricated saving', () => {
  /**
   * A cart saved BEFORE the fix. poojly_cart is never renamed (CLAUDE.md), so
   * clearing the field at the source does not reach a cart already on disk;
   * only not rendering it does. Same reasoning as the /store/cart case.
   */
  function seedLegacyCart() {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'prod_001',
          quantity: 1,
          product: {
            id: 'prod_001',
            handle: 'premium-brass-puja-thali-set',
            title: 'Premium Brass Puja Thali Set (7 Piece)',
            price: 1299,
            compareAtPrice: 1899,
            image: null,
            category: 'Puja Essentials',
            inStock: true,
            freeDelivery: true,
          },
        },
      ]),
    );
  }

  // `CartDrawer` returns null while closed, so the drawer has to be opened
  // through the context the way the header button opens it.
  function OpenOnMount() {
    const { openCart } = useCart();
    return (
      <button type="button" data-testid="open-cart" onClick={openCart}>
        open
      </button>
    );
  }

  async function renderDrawer() {
    seedLegacyCart();
    await act(async () => {
      render(
        <CartProvider>
          <OpenOnMount />
          <CartDrawer />
        </CartProvider>,
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('open-cart'));
    });
  }

  it('renders no struck-through price on a line item', async () => {
    await renderDrawer();
    expect(struckThroughTexts()).toEqual([]);
  });

  it('still shows the real line price', async () => {
    await renderDrawer();
    expect(document.body.textContent ?? '').toContain('1,299');
    expect(document.body.textContent ?? '').not.toContain('1,899');
  });
});

// ─────────────────────────────────────────────────────── seller shelf

describe('LEG-17 — the seller shelf invents no reference price', () => {
  const row = (over: Partial<LiveProduct> = {}): LiveProduct => ({
    id: '11111111-2222-4333-8444-555555555555',
    handle: '11111111-2222-4333-8444-555555555555',
    title: 'Handmade Cotton Wick Diyas (Pack of 50)',
    description: 'Rolled by hand at our Varanasi workshop.',
    price: 249,
    compareAtPrice: null,
    category: 'Puja Essentials',
    imageUrl: null,
    stock: 12,
    sku: 'VW-WICK-50',
    storeName: 'Kashi Puja Bhandar',
    ...over,
  });

  it('a seller item with no reference price reaches the cart without one', async () => {
    await act(async () => {
      render(
        <CartProvider>
          <SellerShelf products={[row()]} />
        </CartProvider>,
      );
    });
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(
      stored[0].product.compareAtPrice,
      'the shelf manufactured a reference price equal to the price on the way into the cart',
    ).toBeNull();
  });
});

// ──────────────────────────────────────────────────── sort and filter

describe('LEG-17 — no store control sorts or filters on an invented rating', () => {
  const P = (over: Partial<FilterableProduct>): FilterableProduct => ({
    title: 'Item',
    description: '',
    category: 'Puja Essentials',
    collection: 'puja-essentials',
    price: 100,
    freeDelivery: false,
    tag: null,
    ...over,
  });

  it('the default ordering is the catalogue order, not a review-count ranking', () => {
    // reviewCount is injected past the type on purpose: the point of the fix is
    // that the field is gone from FilterableProduct, so the only way to prove
    // the default sort no longer consults it is to hand it one anyway. Counts
    // ascend, so a "most-reviewed first" sort would reverse this list.
    const catalogue = [
      { ...P({ title: 'A', price: 100 }), reviewCount: 1 },
      { ...P({ title: 'B', price: 200 }), reviewCount: 50 },
      { ...P({ title: 'C', price: 300 }), reviewCount: 900 },
    ] as unknown as FilterableProduct[];
    const out = filterAndSortProducts(catalogue, DEFAULT_STORE_FILTERS);
    expect(
      out.map((p) => p.title),
      'the default grid is ranked by an invented review tally',
    ).toEqual(['A', 'B', 'C']);
  });

  it('offers no rating sort', () => {
    expect(Object.keys(SORT_LABEL)).not.toContain('rating-desc');
    expect(Object.values(SORT_LABEL).join(' ')).not.toMatch(/rating/i);
    // and an old bookmarked ?sort=rating-desc URL degrades, it does not throw
    expect(parseStoreFilters({ sort: 'rating-desc' }).sort).toBe('popular');
  });

  it('offers no 4+ rating filter, and an old ?rating=4plus URL drops nothing', () => {
    const parsed = parseStoreFilters({ rating: '4plus' }) as Record<string, unknown>;
    expect(parsed.topRated).toBeUndefined();
    const catalogue = [P({ title: 'A' }), P({ title: 'B' })];
    expect(filterAndSortProducts(catalogue, parseStoreFilters({ rating: '4plus' }))).toHaveLength(2);
  });

  it('the rendered filter bar shows neither control', async () => {
    await act(async () => {
      render(
        <StoreFilterBar
          filters={DEFAULT_STORE_FILTERS}
          categories={[{ slug: 'all', name: 'All', count: 2 }]}
          resultCount={2}
          searchPlaceholder="Search the store"
        />,
      );
    });
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/4\+\s*Rating/i);
    expect(text).not.toMatch(/Rating:\s*High to Low/i);
  });
});

// ─────────────────────────────────────────────────────── data sources

describe('LEG-17 — neither catalogue source carries a fabricated number', () => {
  it('no seed product has a reference price or a review', () => {
    const withRef = PRODUCTS.filter(
      (p) => (p as { compareAtPrice?: number | null }).compareAtPrice != null,
    );
    expect(withRef.map((p) => p.id), 'seed rows still carry compareAtPrice').toEqual([]);

    const withReviews = PRODUCTS.filter(
      (p) => ((p as { reviewCount?: number }).reviewCount ?? 0) > 0,
    );
    expect(withReviews.map((p) => p.id), 'seed rows still claim reviews').toEqual([]);

    const withRating = PRODUCTS.filter(
      (p) => (p as { rating?: number | null }).rating != null,
    );
    expect(withRating.map((p) => p.id), 'seed rows still claim a star average').toEqual([]);
  });

  it('the seed path through lib/medusa carries none either', async () => {
    const list = await listProducts();
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.compareAtPrice).toBeNull();
      expect(p.compareAtInr).toBeNull();
    }
  });

  it('a real Medusa product is not given a reference price equal to its own price', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', 'https://commerce.example.test');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        products: [
          {
            id: 'medusa_1',
            handle: 'real-item',
            title: 'Real Item',
            variants: [
              { inventory_quantity: 3, prices: [{ amount: 49900, currency_code: 'inr' }] },
            ],
          },
        ],
        count: 1,
      }),
    })) as unknown as typeof fetch;
    try {
      const mod = await import('../lib/medusa');
      const [p] = await mod.listProducts();
      expect(p.price).toBe(499);
      expect(
        p.compareAtPrice,
        'a real product was given compareAtPrice === price, printing "₹499 ₹499"',
      ).toBeNull();
      expect(p.rating, 'a 4.5-star average was synthesised from zero reviews').toBeNull();
      expect(p.reviewCount).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
