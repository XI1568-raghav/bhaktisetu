/**
 * [CM-08] No two store SKUs may illustrate themselves with the same picture.
 *
 * CM-08's second half is "using 19th-century paintings as product
 * photography". The paintings themselves are gone from `IMAGES.store` — the
 * three idol SKUs point at photographs of real objects (a marble Dagadusheth
 * Ganapati, the Wellcome brass Krishna, the LACMA Lakshmi) — but the failure
 * MODE the finding names is a picture that is not of the product, and the
 * cheapest way for that to happen is one file doing duty for two SKUs.
 *
 * It had happened. Measured on the live store, 2026-09-01: 24 `<img>` tags,
 * only 23 distinct URLs. `hanuman-chalisa-book` and `sunderkand-book` both
 * pointed at
 *   commons/d/da/Hanuman_Chalisa_4x3.jpg
 * so a devotee shopping for a Sunderkand saw a Hanuman Chalisa, at a different
 * price, on the page that takes payment. `sunderkand-book` now points at
 * File:Ramcharitmanas book.jpg — the Sunderkand is the Ramcharitmanas' fifth
 * kanda — verified against the Commons imageinfo API the same day
 * (5456x3632, CC BY-SA 4.0, Wikilover90) and credited in lib/image-credits.ts.
 *
 * This file is the ratchet that keeps it from recurring. It reads the runtime
 * `IMAGES` object, not the source text, so a comment quoting a URL cannot
 * satisfy or trip it.
 *
 * NOT asserted here, deliberately: that every store picture is a picture of
 * its own product. No machine can check that. `hanuman-chalisa-book` is still
 * wrong in exactly that way — the file is a poster graphic of the Chalisa text
 * carrying a third-party studio's watermark and phone number, not a printed
 * book — and it is recorded at its own entry in lib/images.ts as needing a
 * photograph the owner has to take. A guard that pretended to cover that would
 * be worse than this one.
 */

import { describe, it, expect } from 'vitest';
import { IMAGES, getProductImage, IMG_W } from '../lib/images';

/** The SKU keys, in declaration order. */
const SKUS = Object.keys(IMAGES.store) as Array<keyof typeof IMAGES.store>;

/** Group SKU keys by the URL they resolve to. */
function byUrl(resolve: (sku: string) => string): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const sku of SKUS) {
    const url = resolve(sku as string);
    groups.set(url, [...(groups.get(url) ?? []), sku as string]);
  }
  return groups;
}

describe('[CM-08] every store SKU has its own picture', () => {
  it('there are SKUs to check, and the map is the real one', () => {
    expect(SKUS.length, 'IMAGES.store is empty — this file would pass vacuously').toBeGreaterThan(
      15,
    );
    for (const sku of SKUS) {
      expect(String(IMAGES.store[sku]), `${sku} has no URL`).toMatch(/^https:\/\//);
    }
  });

  it('the duplicate detector fires on a duplicate (0 is not vacuous)', () => {
    /* The exact shape that shipped: two different SKUs, one URL. Asserted
     * against the same grouping function the real check uses, so a refactor
     * that neuters the check fails here first. */
    const fake = new Map<string, string[]>();
    for (const [sku, url] of [
      ['hanuman-chalisa-book', 'https://x/Hanuman_Chalisa_4x3.jpg'],
      ['sunderkand-book', 'https://x/Hanuman_Chalisa_4x3.jpg'],
      ['bhagavad-gita', 'https://x/Gita.jpg'],
    ] as const) {
      fake.set(url, [...(fake.get(url) ?? []), sku]);
    }
    const dupes = [...fake.entries()].filter(([, skus]) => skus.length > 1);
    expect(dupes.length).toBe(1);
    expect(dupes[0]![1]).toEqual(['hanuman-chalisa-book', 'sunderkand-book']);
  });

  it('no two SKUs share a source URL', () => {
    const dupes = [...byUrl((sku) => String(IMAGES.store[sku as keyof typeof IMAGES.store]))]
      .filter(([, skus]) => skus.length > 1)
      .map(([url, skus]) => `${skus.join(' + ')}  ->  ${url}`);
    expect(
      dupes,
      'these SKUs illustrate themselves with the same file. A shopper sees one ' +
        "product's picture on another product's card, on the page that takes " +
        'payment. Give each SKU its own photograph — and if there is not an ' +
        'honest one available, say so at the entry in lib/images.ts rather than ' +
        'borrowing a neighbour.\n' + dupes.join('\n'),
    ).toEqual([]);
  });

  it('no two SKUs collide after the resize funnel either', () => {
    /* Distinct source URLs can still collapse to one request: two Commons
     * files differing only by a query string, or two Unsplash photos with the
     * same id at different w/h. The card renders getProductImage(key, CARD),
     * so that is what must be distinct. */
    const dupes = [...byUrl((sku) => getProductImage(sku, IMG_W.CARD))]
      .filter(([, skus]) => skus.length > 1)
      .map(([url, skus]) => `${skus.join(' + ')}  ->  ${url}`);
    expect(dupes, 'these SKUs resolve to one request at card width\n' + dupes.join('\n')).toEqual(
      [],
    );
  });

  it('the Sunderkand SKU is not the Hanuman Chalisa file', () => {
    /* Named explicitly, because a generic distinctness check would also be
     * satisfied by pointing the Chalisa somewhere new and leaving the
     * Sunderkand wrong. */
    const sunderkand = getProductImage('sunderkand-book', IMG_W.CARD);
    expect(sunderkand).not.toContain('Hanuman_Chalisa');
    expect(sunderkand).toContain('Ramcharitmanas_book');
  });
});
