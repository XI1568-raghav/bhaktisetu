import { describe, it, expect } from 'vitest';
import { storeService } from './store.service.js';
import { commonsThumb } from '../lib/commons-thumb.js';

/**
 * COM-18 (prod sweep 2026-08-12, P2/perf) — the shopper catalogue served
 * full-resolution Wikimedia Commons ORIGINALS into 600x600 product cards.
 *
 * Measured live with a browser UA: Rudraksha_mala.jpg = 5,728,036 B,
 * Bhagavad_Gita_book_(small)_01.jpg = 5,038,680 B,
 * Pure_Ghee-Homemade-Maharashtra.jpg = 4,044,816 B. The Unsplash half of the
 * same array was correctly sized at ~44-66 KB, so the defect was specifically
 * the Commons set. The buyer is on 4G in India.
 *
 * apps/web already fixed its own half (lib/images.ts wikiThumb + IMG_W.CARD),
 * but the API is the OTHER side of the same contract: GET /store/products is
 * what apps/mobile and any non-web client read, and it still handed out the
 * originals. This locks the API side: no Commons original may leave this
 * service, and the two ladders must agree.
 */

const COMMONS_ORIGINAL =
  /upload\.wikimedia\.org\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+$/;

describe('COM-18 — the store catalogue never serves a full-resolution image', () => {
  const all = storeService.getProducts({ limit: 500 });
  const products = (all as { products: { id: string; images: { url: string }[] }[] }).products;

  it('serves a non-empty catalogue (guard: the assertions below must have data)', () => {
    expect(products.length).toBeGreaterThan(20);
  });

  it('no product image is a bare Wikimedia Commons original', () => {
    const originals = products
      .flatMap((p) => p.images.map((im) => ({ id: p.id, url: im.url })))
      .filter((im) => COMMONS_ORIGINAL.test(im.url));
    expect(originals).toEqual([]);
  });

  it('every Wikimedia image is a /thumb/ URL carrying an explicit pixel width', () => {
    const commons = products
      .flatMap((p) => p.images.map((im) => im.url))
      .filter((u) => u.includes('upload.wikimedia.org'));
    expect(commons.length).toBeGreaterThan(0);
    for (const url of commons) {
      expect(url).toContain('/commons/thumb/');
      expect(url).toMatch(/\/\d+px-/);
    }
  });

  it('leaves the correctly-sized Unsplash images alone', () => {
    const unsplash = products
      .flatMap((p) => p.images.map((im) => im.url))
      .filter((u) => u.includes('images.unsplash.com'));
    expect(unsplash.length).toBeGreaterThan(0);
    for (const url of unsplash) expect(url).toContain('w=600');
  });
});

describe('commonsThumb mirrors apps/web lib/images.ts wikiThumb', () => {
  it('rewrites a Commons original into a ladder-width thumbnail', () => {
    expect(
      commonsThumb('https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg', 600),
    ).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Rudraksha_mala.jpg/960px-Rudraksha_mala.jpg',
    );
  });

  it('snaps UP to the Commons ladder — arbitrary widths 400 since 2024', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Hindu_pooja_thali.jpg';
    expect(commonsThumb(url, 251)).toContain('/330px-');
    expect(commonsThumb(url, 500)).toContain('/500px-');
    expect(commonsThumb(url, 5000)).toContain('/3840px-');
  });

  it('rewrites the width of an existing /thumb/ URL instead of nesting one', () => {
    expect(
      commonsThumb(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/A.jpg/1280px-A.jpg',
        500,
      ),
    ).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/A.jpg/500px-A.jpg');
  });

  it('appends .png for svg sources, per the Commons thumb rule', () => {
    expect(
      commonsThumb('https://upload.wikimedia.org/wikipedia/commons/1/1a/Om.svg', 250),
    ).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Om.svg/250px-Om.svg.png');
  });

  it('passes through anything that is not a Commons URL, untouched', () => {
    const u = 'https://images.unsplash.com/photo-123?w=600&h=600';
    expect(commonsThumb(u, 500)).toBe(u);
    expect(commonsThumb('', 500)).toBe('');
  });
});
