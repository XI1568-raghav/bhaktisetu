import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) };
});

import { getLiveProducts, getLiveProduct, type LiveProduct } from '../lib/store-live';
import SellerShelf from '../components/store/SellerShelf';
import { CartProvider } from '../components/CartContext';
import * as SellerPDP from '../app/store/seller/[id]/page';

// COM-11 (prod sweep 2026-08-12): a store owner could onboard, pass KYC and
// create products (POST /store-admin/products), and GET /store/products/live
// existed to surface them — its own header comment said "store-owner products
// never surface publicly". A repo-wide grep for `products/live` across apps/web
// returned ZERO results. Nothing in the web app ever called it. The supply side
// of the marketplace had no shelf: an owner's inventory appeared on no public
// page and could never receive an order, even though POST /store/orders
// resolves StoreProduct by UUID and would have accepted it.
//
// The one thing these tests must never allow: a shelf that invents supply.
// When there are no seller products (which is the case today — the endpoint
// returns an empty list) the section must not render at all. No "0 products",
// no placeholder cards, no "Join 200+ sellers".

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

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('live seller catalogue client (COM-11)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  it('returns the owner products the API serves, keyed on the id orders resolve', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ products: [row()], total: 1, source: 'live' }),
    });
    const products = await getLiveProducts();
    expect(products).toHaveLength(1);
    expect(products[0].id).toBe('11111111-2222-4333-8444-555555555555');
    expect(products[0].storeName).toBe('Kashi Puja Bhandar');
  });

  it('returns an empty list — never fixtures — when the API is unreachable', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(getLiveProducts()).resolves.toEqual([]);
  });

  it('returns an empty list when the API answers non-OK', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(getLiveProducts()).resolves.toEqual([]);
  });

  it('resolves a single seller product by id, and null when it is gone', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ products: [row()], total: 1, source: 'live' }),
    });
    await expect(getLiveProduct(row().id)).resolves.toMatchObject({ sku: 'VW-WICK-50' });
    await expect(getLiveProduct('99999999-2222-4333-8444-555555555555')).resolves.toBeNull();
  });
});

describe('seller shelf on /store (COM-11)', () => {
  it('renders nothing at all when no seller has listed a product', () => {
    const html = renderToStaticMarkup(<SellerShelf products={[]} />);
    expect(html).toBe('');
  });

  it('shows the product, its price and the seller who listed it', () => {
    const html = renderToStaticMarkup(
      <CartProvider>
        <SellerShelf products={[row()]} />
      </CartProvider>,
    );
    expect(html).toContain('Handmade Cotton Wick Diyas (Pack of 50)');
    expect(html).toContain('249');
    expect(html).toContain('Kashi Puja Bhandar');
    expect(html).toContain('/store/seller/11111111-2222-4333-8444-555555555555');
  });

  it('is wired into the store page', () => {
    const page = readFileSync(resolve(__dirname, '..', 'app/store/page.tsx'), 'utf8');
    expect(page).toMatch(/getLiveProducts/);
    expect(page).toMatch(/SellerShelf/);
  });
});

describe('seller product detail page (COM-11)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  async function ssr(id: string): Promise<string> {
    const element = await (SellerPDP.default as (p: {
      params: Promise<{ id: string }>;
    }) => Promise<React.ReactElement>)({ params: Promise.resolve({ id }) });
    return renderToStaticMarkup(<CartProvider>{element}</CartProvider>);
  }

  it('server-renders the seller product so it can be seen and bought', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ products: [row()], total: 1, source: 'live' }),
    });
    const html = await ssr(row().id);
    expect(html).toContain('Handmade Cotton Wick Diyas (Pack of 50)');
    expect(html).toContain('Kashi Puja Bhandar');
    expect(html).toContain('Rolled by hand at our Varanasi workshop.');
    expect(html).toContain('Add to Cart');
  });

  it('404s rather than falling back to a fixture product', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ products: [], total: 0, source: 'live' }),
    });
    const err = await ssr(row().id).then(
      () => null,
      (e: unknown) => e as { digest?: string },
    );
    expect(err).not.toBeNull();
    expect(String(err?.digest)).toMatch(/404|NOT_FOUND/);
  });
});
