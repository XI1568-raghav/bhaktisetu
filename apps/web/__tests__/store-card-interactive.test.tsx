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
  const ui = await StorePage();
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

  it('keeps every Add to Cart control outside the product link', async () => {
    await renderStore();
    const buttons = screen.getAllByRole('button', { name: /add to cart/i });
    expect(buttons.length).toBeGreaterThan(10);
    for (const b of buttons) {
      expect(b.closest('a[href]'), 'Add to Cart must not sit inside the card link').toBeNull();
    }
  });

  it('ships no dead "Add to wishlist" control', async () => {
    await renderStore();
    expect(screen.queryAllByRole('button', { name: /wishlist/i })).toEqual([]);
  });
});

/* ── The button is real, not decoration ──────────────────────────────────── */

const PRODUCT = {
  id: 'p1',
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
});
