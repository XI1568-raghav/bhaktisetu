import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Only the app-router hook is stubbed — vitest has no mounted router, which a
// real Next server render does have. `notFound` stays the genuine
// implementation, because the 404 assertion below depends on its actual throw.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) };
});

import * as PDP from '../app/store/[handle]/page';
import { CartProvider } from '../components/CartContext';
import { PRODUCTS } from '../lib/products';

// COM-10 (prod sweep 2026-08-12): every /store/<handle> URL 307-redirected to
// /store/view?handle=<handle>, a `use client` page that reads the handle out of
// useSearchParams inside a Suspense boundary. Stripping tags from the delivered
// HTML left global nav, the word "Loading…", and the footer — no title, no
// price, no description, no availability. All 24 product pages were invisible
// to crawlers, and every product URL was a redirect rather than a canonical
// 200, for a business whose entire devotee-CAC thesis is organic reach.
//
// The fix is not "add metadata to the redirect": the product has to be resolved
// on the server and handed DOWN, so the markup React streams already contains
// it. These tests assert the delivered HTML, not the source.

const sample = PRODUCTS[0];
const params = (handle: string) => Promise.resolve({ handle });

async function ssr(handle: string): Promise<string> {
  const element = await (PDP.default as (p: {
    params: Promise<{ handle: string }>;
  }) => Promise<React.ReactElement>)({ params: params(handle) });
  return renderToStaticMarkup(<CartProvider>{element}</CartProvider>);
}

describe('store product detail is server-rendered (COM-10)', () => {
  it('prerenders every catalogue handle', async () => {
    expect(typeof PDP.generateStaticParams).toBe('function');
    const generated = await PDP.generateStaticParams!();
    const handles = generated.map((p: { handle: string }) => p.handle);
    expect(handles).toHaveLength(PRODUCTS.length);
    for (const product of PRODUCTS) {
      expect(handles).toContain(product.handle);
    }
  });

  it('emits per-product metadata with a canonical on the product URL', async () => {
    expect(typeof PDP.generateMetadata).toBe('function');
    const meta = await PDP.generateMetadata!({ params: params(sample.handle) });
    expect(String(meta.title)).toContain(sample.title);
    expect(String(meta.description)).toContain(sample.price.toLocaleString('en-IN'));
    expect(meta.alternates?.canonical).toBe(
      `https://darshya.online/store/${sample.handle}`,
    );
  });

  it('puts the title, price and description in the delivered HTML', async () => {
    const html = await ssr(sample.handle);
    expect(html).toContain(sample.title);
    expect(html).toContain(sample.price.toLocaleString('en-IN'));
    expect(html).toContain(sample.description.slice(0, 60));
    // The Suspense fallback must not be what a crawler receives.
    expect(html).not.toContain('Loading…');
  });

  /**
   * COM-01 — this used to assert the opposite, and the opposite was a false
   * commercial claim.
   *
   * The page emitted `Offer { price: "1299", availability: schema.org/InStock }`
   * for a `prod_NNN` seed row. POST /api/v1/store/orders resolves line items
   * against `StoreProduct` BY UUID and prod holds ZERO of those rows, so no
   * seller stocks this item, nobody can ship it, and checkout answered
   * `400 Unknown product`. Google renders that price and in-stock badge
   * straight into the search result, which made it a machine-readable promise
   * of a sale the site cannot complete.
   *
   * The Offer is WITHDRAWN rather than marked OutOfStock — the same call TC-04
   * made for the NRI plan, because an OutOfStock Offer still asserts the item
   * is something this shop sells. The Product node stays: the page is a real,
   * indexable description of a real kind of item. Only the commercial claim
   * goes, and it returns the moment a seller lists the item (uuid ⇒ orderable
   * ⇒ Offer emitted again, no follow-up commit needed).
   */
  it('emits a Product node but NO Offer for a product no seller stocks', async () => {
    const html = await ssr(sample.handle);
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain(sample.sku);
    expect(html).not.toContain('"@type":"Offer"');
    expect(html).not.toContain(`"price":"${sample.price}"`);
    expect(html).not.toContain('schema.org/InStock');
  });

  it('tells a human, on the page, why it cannot be ordered', async () => {
    // The structured data going quiet is not enough on its own — the devotee
    // standing on the page is owed the reason at the control they would have
    // pressed, not a button that fails at the payment step.
    const html = await ssr(sample.handle);
    expect(html).toContain('Not available to order');
    expect(html).toMatch(/No seller stocks it yet/i);
  });

  it('404s an unknown handle instead of rendering a soft "does not exist" body', async () => {
    // Asserting the digest, not merely "it threw" — `redirect()` throws too, so
    // a bare rejects.toThrow() stayed green against the old redirect shim.
    // COM-09: /store/orders fell into this catch-all and rendered "The product
    // you are looking for does not exist" with a 200.
    const err = await ssr('orders').then(
      () => null,
      (e: unknown) => e as { digest?: string },
    );
    expect(err).not.toBeNull();
    expect(String(err?.digest)).toMatch(/404|NOT_FOUND/);
  });

  it('resolves through the same catalogue the listing renders', async () => {
    // /store lists via lib/medusa listProducts(), which serves Medusa handles
    // when NEXT_PUBLIC_MEDUSA_BACKEND_URL is set and the seed catalogue
    // otherwise. If the PDP only ever read the seed array, every Medusa-only
    // product on the grid would link to a 404 — the listing and the detail page
    // have to agree on what exists.
    const medusa = await import('../lib/medusa');
    const spy = vi.spyOn(medusa, 'getProductByHandle').mockResolvedValue({
      id: 'medusa_1',
      handle: 'medusa-only-brass-lamp',
      title: 'Medusa Only Brass Lamp',
      description: 'Listed in the live commerce backend, absent from the seed.',
      thumbnail: null,
      priceInr: 899,
      compareAtInr: null,
      category: 'Puja Essentials',
      collection: 'puja-essentials',
      inStock: true,
      freeDelivery: true,
      weight: '0.5 kg',
      source: 'medusa',
      imageKey: 'puja-thali',
      tag: null,
      discount: 0,
      rating: 0,
      reviewCount: 0,
      compareAtPrice: 899,
      price: 899,
      features: [],
      sku: 'MD-1',
    } as Awaited<ReturnType<typeof medusa.getProductByHandle>>);

    const html = await ssr('medusa-only-brass-lamp');
    expect(spy).toHaveBeenCalledWith('medusa-only-brass-lamp');
    expect(html).toContain('Medusa Only Brass Lamp');
    spy.mockRestore();
  });

  it('does not redirect the friendly product URL', () => {
    const page = readFileSync(
      resolve(__dirname, '..', 'app/store/[handle]/page.tsx'),
      'utf8',
    );
    expect(page).not.toMatch(/redirect\(`\/store\/view/);
  });
});
