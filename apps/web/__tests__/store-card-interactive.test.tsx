/**
 * A11Y-11 — every /store product card nested two buttons inside its anchor.
 *
 * Measured on the live /store (prod sweep 2026-08-12): 49 nested-interactive
 * instances, e.g.
 *   {"inner":"button \"\"","outer":"a[/store/premium-brass-puja-thali-set]"}
 *   {"inner":"button \"Add to Cart\"","outer":"a[/store/premium-brass-puja-thali-set]"}
 *
 * Neither button had an onClick — activating "Add to Cart" simply followed the
 * enclosing link to the PDP, so a user who believed they had added an item to
 * the cart had not. Interactive content inside <a> is also invalid HTML, and
 * it cost a keyboard user 48 extra tab stops to cross the grid.
 *
 * The "Add to wishlist" heart had no handler and there is no wishlist feature
 * anywhere in the codebase (grep: only these two decorative buttons), so it is
 * removed rather than faked. "Add to Cart" gets the real cart it always
 * implied.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// S-04 gave the filter bar a real client half, which calls useRouter to push
// the filter state into the URL. vitest has no mounted app router, so without
// this stub every render of /store throws "invariant expected app router to be
// mounted" — the page itself is fine, the test environment is not a browser.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) };
});

import StorePage from '../app/store/page';
import { CartProvider, useCart } from '../components/CartContext';
import AddToCartButton from '../components/store/AddToCartButton';

const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex]';

/** app/layout.tsx wraps the whole app in CartProvider (layout.tsx:331). */
async function renderStore() {
  const ui = await StorePage({ searchParams: Promise.resolve({}) });
  await act(async () => {
    render(<CartProvider>{ui}</CartProvider>);
  });
}

/** Pairs of (outer interactive, inner interactive) — always a WCAG 4.1.1 defect. */
function nestedInteractive(): Array<{ outer: string; inner: string }> {
  const pairs: Array<{ outer: string; inner: string }> = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(INTERACTIVE))) {
    const outer = el.parentElement?.closest<HTMLElement>(INTERACTIVE);
    if (outer) {
      pairs.push({
        outer: `${outer.tagName.toLowerCase()}[${outer.getAttribute('href') ?? ''}]`,
        inner: `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 24)}"`,
      });
    }
  }
  return pairs;
}

describe('A11Y-11 — /store has no interactive control inside another', () => {
  it('renders the product grid', async () => {
    await renderStore();
    expect(document.querySelectorAll('a[href^="/store/"]').length).toBeGreaterThan(10);
  });

  it('reports zero nested-interactive pairs', async () => {
    await renderStore();
    const pairs = nestedInteractive();
    expect(pairs.slice(0, 5), `${pairs.length} nested-interactive controls`).toEqual([]);
  });

  /**
   * COM-01 changed WHICH control each card renders, not where it sits.
   *
   * Every one of the 24 seed rows carries a `prod_NNN` id, and POST
   * /api/v1/store/orders resolves line items against `StoreProduct` BY UUID —
   * so "Add to Cart" on these cards led to a basket, an address, a payment
   * method and then `400 Unknown product: prod_015`. Nothing in the grid could
   * ever be bought. The cards now render a disabled "Not available to order"
   * with the reason underneath; a seller row (a real uuid) still gets the live
   * control, which is what __tests__/store-seller-shelf.test.tsx covers.
   *
   * The A11Y-11 property is unchanged and still asserted: whatever control the
   * card renders, it must not be nested inside the card's link.
   */
  it('keeps every cart control outside the product link', async () => {
    await renderStore();
    const buttons = screen.getAllByRole('button', {
      name: /add to cart|not available to order/i,
    });
    expect(buttons.length).toBeGreaterThan(10);
    for (const b of buttons) {
      expect(b.closest('a[href]'), 'the cart control must not sit inside the card link').toBeNull();
    }
  });

  it('offers no cart control for a product no seller stocks', async () => {
    await renderStore();
    // The whole seed grid is browse-only today, so there must be no live
    // "Add to Cart" anywhere in it — an enabled button here is a promise the
    // API refuses to keep.
    expect(screen.queryAllByRole('button', { name: /^add to cart$/i })).toEqual([]);
    const disabled = screen.getAllByRole('button', { name: /not available to order/i });
    expect(disabled.length).toBeGreaterThan(10);
    for (const b of disabled) expect(b).toBeDisabled();
  });

  it('ships no dead "Add to wishlist" control', async () => {
    await renderStore();
    expect(screen.queryAllByRole('button', { name: /wishlist/i })).toEqual([]);
  });
});

/* ── The button is real, not decoration ──────────────────────────────────── */

/**
 * COM-01: this fixture's id used to be `'p1'`.
 *
 * `AddToCartButton` now refuses any id that is not a `StoreProduct` uuid,
 * because that is the only id `POST /api/v1/store/orders` can resolve — so
 * `'p1'` would exercise the browse-only path and these three tests would be
 * asserting nothing about the real control. The id below is a uuid, i.e. a
 * product a seller has actually listed, which is the only case in which "Add to
 * Cart" is a promise the API will keep.
 */
const PRODUCT = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  handle: 'premium-brass-puja-thali-set',
  title: 'Premium Brass Puja Thali Set',
  price: 1299,
  compareAtPrice: 1899,
  image: '/img/thali.jpg',
  category: 'puja-essentials',
  inStock: true,
  freeDelivery: true,
};

function CartReadout() {
  const { itemCount, items } = useCart();
  return (
    <div>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="titles">{items.map((i) => i.product.title).join('|')}</span>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('A11Y-11 — Add to Cart actually adds to the cart', () => {
  it('puts the product in the cart when clicked', () => {
    render(
      <CartProvider>
        <AddToCartButton product={PRODUCT} />
        <CartReadout />
      </CartProvider>,
    );

    expect(screen.getByTestId('count').textContent).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('titles').textContent).toBe('Premium Brass Puja Thali Set');
  });

  it('confirms only after the cart really changed', () => {
    render(
      <CartProvider>
        <AddToCartButton product={PRODUCT} />
      </CartProvider>,
    );

    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button.textContent).not.toMatch(/added/i);

    fireEvent.click(button);

    expect(screen.getByRole('button', { name: /added/i }).textContent).toMatch(/added/i);
  });

  it('is disabled and self-describing when the product is out of stock', () => {
    render(
      <CartProvider>
        <AddToCartButton product={{ ...PRODUCT, inStock: false }} />
        <CartReadout />
      </CartProvider>,
    );

    const button = screen.getByRole('button', { name: /out of stock/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  /**
   * COM-01. "Out of stock" is the WRONG reason for one of the 24 seed rows: it
   * says the item exists and will come back. It does not exist — no seller has
   * ever listed it, prod holds zero `store_products` — and the order route
   * would answer `400 Unknown product`. The guard therefore runs before the
   * stock check, and says which.
   */
  it('refuses a product no seller stocks, and does not call it out of stock', () => {
    render(
      <CartProvider>
        <AddToCartButton product={{ ...PRODUCT, id: 'prod_001' }} />
        <CartReadout />
      </CartProvider>,
    );

    const button = screen.getByRole('button', { name: /not available to order/i });
    expect(button).toBeDisabled();
    expect(screen.queryByRole('button', { name: /out of stock/i })).toBeNull();
    expect(document.body.textContent).toMatch(/no seller stocks this yet/i);

    fireEvent.click(button);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
