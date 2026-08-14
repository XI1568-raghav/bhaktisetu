import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { LiveProduct } from '../lib/store-live';

/**
 * PM-11 (prod sweep 2026-08-12, P2/broken) — both "live directory" pages
 * shipped in PR #235 answered 404 on the web while their APIs returned 200.
 *
 * /astrology/astrologers/live was rebuilt in the same sweep (AW-03). This is
 * the other one: https://darshya.online/store/products/live 404s with a real
 * Chrome UA, while GET /api/v1/store/products/live is healthy and is the ONLY
 * endpoint that serves real `store_products` rows — the inventory of sellers
 * who onboarded, passed KYC and listed goods. Price discovery for the store
 * role dead-ends on a route that was never created: there is no
 * apps/web/app/store/products/ directory at all.
 *
 * This directory sorts by price because that is what the finding says the page
 * is for ("browse real store products by price"), and it renders the seller's
 * own row only — no fixture fallback. The 24 hardcoded catalogue SKUs live in a
 * separate keyspace (`prod_015` handles vs StoreProduct UUIDs); merging them is
 * COM-01 and is owner-gated.
 */

const PRODUCTS: LiveProduct[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    handle: 'brass-diya',
    title: 'Hand-cast Brass Diya',
    description: 'Cast in Moradabad.',
    price: 850,
    compareAtPrice: 1200,
    category: 'Puja Essentials',
    imageUrl: null,
    stock: 4,
    sku: 'BD-1',
    storeName: 'Ganga Brass Works',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    handle: 'tulsi-mala',
    title: 'Tulsi Mala 108 beads',
    description: 'Strung by hand.',
    price: 299,
    compareAtPrice: null,
    category: 'Malas',
    imageUrl: null,
    stock: 0,
    sku: 'TM-9',
    storeName: 'Vrindavan Seva Store',
  },
];

const getLiveProducts = vi.fn(async () => PRODUCTS);

vi.mock('../lib/store-live', () => ({
  getLiveProducts: (...args: unknown[]) => getLiveProducts(...(args as [])),
}));

afterEach(() => {
  cleanup();
  getLiveProducts.mockResolvedValue(PRODUCTS);
});

async function renderLiveDirectory() {
  const { default: Page } = await import('../app/store/products/live/page');
  const el = await (Page as unknown as () => Promise<React.ReactElement>)();
  const { container } = render(el);
  return container;
}

describe('PM-11 — /store/products/live exists and lists real seller inventory', () => {
  it('renders every live seller product with its price and seller', async () => {
    const container = await renderLiveDirectory();
    const text = container.textContent ?? '';

    expect(text).toContain('Hand-cast Brass Diya');
    expect(text).toContain('Tulsi Mala 108 beads');
    expect(text).toContain('Ganga Brass Works');
    expect(text).toContain('Vrindavan Seva Store');
    expect(text).toMatch(/850/);
    expect(text).toMatch(/299/);
  });

  it('orders the directory by price so it can be used for price discovery', async () => {
    const container = await renderLiveDirectory();
    const text = container.textContent ?? '';
    expect(text.indexOf('Tulsi Mala 108 beads')).toBeLessThan(
      text.indexOf('Hand-cast Brass Diya'),
    );
  });

  it('links each row to the seller product page that POST /store/orders can resolve', async () => {
    const container = await renderLiveDirectory();
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/store/seller/11111111-1111-4111-8111-111111111111');
  });

  it('says so honestly when no seller has listed anything yet — never fixtures', async () => {
    getLiveProducts.mockResolvedValue([]);
    const container = await renderLiveDirectory();
    const text = container.textContent ?? '';

    expect(text).toMatch(/no .{0,40}(seller|product)/i);
    // The 24 hardcoded catalogue SKUs must never leak into a page headed
    // "listed by real sellers".
    expect(text).not.toMatch(/Premium Brass Puja Thali Set/i);
    expect(text).not.toMatch(/prod_0\d\d/);
  });

  it('is a canonical, indexable route rather than an alias of /store', async () => {
    const { metadata } = await import('../app/store/products/live/page');
    expect(String((metadata as { alternates?: { canonical?: string } }).alternates?.canonical))
      .toBe('https://darshya.online/store/products/live');
  });
});
