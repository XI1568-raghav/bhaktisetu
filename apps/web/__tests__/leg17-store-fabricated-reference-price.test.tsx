/**
 * LEG-17 — no store surface may show a struck-through "was" price that never
 * existed.
 *
 * The 2026-08-12 sweep filed this as a permanently-live "Akshaya Tritiya Sale
 * — offer valid till April 30" banner. That banner is genuinely gone (a
 * repo-wide grep for "Akshaya" now returns only devotional calendar content in
 * lib/tithis.ts, lib/vedic-months.ts, lib/vrats.ts, lib/yatra-data.ts and
 * app/calendar/[month]/page.tsx). What survived is the more durable half: a
 * fabricated reference price on every product, with no end date at all.
 *
 * apps/web/lib/products.ts hardcodes `compareAtPrice` and `discount` on all 24
 * seed products — e.g. prod_001 price 1299 / compareAtPrice 1899 / discount 32
 * — and /store renders them as a "-32%" badge and a struck-through "₹1,899".
 * No product has ever been sold at ₹1,899, because the seed catalogue has
 * never taken an order. Under the Consumer Protection Act 2019 and the CCPA
 * guidelines on misleading advertisements, a struck-through reference price
 * that was never charged is a fabricated discount, and unlike a stale banner
 * it cannot expire on its own.
 *
 * A second, quieter version of the same defect: lib/medusa.ts maps a real
 * Medusa product with `compareAtPrice: priceInr` (equal to the price) and the
 * grid rendered that unconditionally, printing "₹499 ~~₹499~~". And
 * app/store/seller/[id]/page.tsx built its cart payload with
 * `compareAtPrice: product.compareAtPrice ?? product.price`, so a seller item
 * with no reference price arrived in the cart with one equal to its price and
 * the cart struck it through.
 *
 * These tests assert on the RENDERED DOM of the store surfaces in this lane.
 * The `line-through` class is the thing a customer actually sees, so it is
 * what is asserted — a source scan would have to strip the comments above.
 *
 * OUT OF LANE, still true, reported separately: components/store/ProductDetail.tsx,
 * components/store/SellerShelf.tsx, components/CartDrawer.tsx and the seed
 * fields in lib/products.ts all still carry the pair.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// /store mounts StoreFilterBar, a client component that pushes filter state
// into the URL. vitest has no mounted app router. Same stub the A11Y-11 test
// uses (see store-card-interactive.test.tsx).
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) };
});

// /store/cart reads the auth session for its "Login to Checkout" label.
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, session: null }),
}));

import StorePage from '../app/store/page';
import CartPage from '../app/store/cart/page';
import { CartProvider } from '../components/CartContext';

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

describe('LEG-17 — /store publishes no fabricated reference price', () => {
  async function renderStore() {
    const ui = await StorePage({ searchParams: Promise.resolve({}) });
    await act(async () => {
      render(<CartProvider>{ui}</CartProvider>);
    });
  }

  it('renders no struck-through price anywhere in the grid', async () => {
    await renderStore();
    expect(
      struckThroughTexts(),
      'a struck-through "was" price is rendered; no seed product was ever sold at it',
    ).toEqual([]);
  });

  it('renders no percentage-off badge', async () => {
    await renderStore();
    const text = document.body.textContent ?? '';
    const badge = /-\d{1,2}%/.exec(text);
    expect(badge?.[0], 'a fabricated "-NN%" discount badge is still rendered').toBeUndefined();
  });

  it('still shows the real price and the product, so the grid is not just emptied', async () => {
    await renderStore();
    const text = document.body.textContent ?? '';
    expect(text).toContain('Premium Brass Puja Thali Set (7 Piece)');
    expect(text).toContain('1,299');
    // ...and the fabricated reference price is not printed in any form.
    expect(text).not.toContain('1,899');
  });
});

describe('LEG-17 — /store/cart publishes no fabricated saving', () => {
  /**
   * A cart that ALREADY holds a fabricated compareAtPrice. Carts persist in
   * localStorage under poojly_cart (never rename — CLAUDE.md), so removing the
   * field at the source is not enough: the page must not render a saving even
   * when an old cart still carries one.
   */
  function seedLegacyCart() {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'prod_001',
          quantity: 2,
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

  async function renderCart() {
    seedLegacyCart();
    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>,
      );
    });
  }

  it('renders no struck-through price on a line item', async () => {
    await renderCart();
    expect(struckThroughTexts()).toEqual([]);
  });

  it('makes no "you are saving" claim', async () => {
    await renderCart();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/you are saving/i);
    expect(text).not.toContain('1,899');
  });

  it('still totals the real prices', async () => {
    await renderCart();
    // 2 x Rs 1,299 = Rs 2,598, and that figure legitimately renders THREE
    // times: the line item's own `price * quantity`, the "Subtotal (2 items)"
    // row, and the "Total" row — delivery is free over Rs 499, so subtotal and
    // total are equal. getByText throws on multiple matches, so assert on all
    // of them and pin the count: removing the fabricated saving banner must
    // leave every real money row intact, and a drop to 2 would mean one was
    // taken out with it.
    const totals = screen.getAllByText(/2,598/);
    expect(
      totals.length,
      'expected the line-item subtotal, the Subtotal row and the Total row',
    ).toBe(3);
  });
});
