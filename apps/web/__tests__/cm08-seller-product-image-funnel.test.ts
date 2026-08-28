import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { remoteImage, remoteSrcSet, IMG_W } from '../lib/images';

/**
 * CM-08 family — `/store/seller/[id]` painted a raw operator-supplied
 * `product.imageUrl` into a 960×960 slot with no resize funnel and no srcSet.
 *
 * Every other card surface in the app routes its remote URL through
 * `remoteImage(url, width)`, which rewrites a Wikimedia Commons original to a
 * `/thumb/<w>px-` variant and an Unsplash URL to its `w`/`h`/`q` params. The
 * largest original measured in this codebase was 14,905 KB served into a 343px
 * slot. This page was the one product surface that skipped the funnel, and it
 * loads the image with `loading="eager"` — so on a seller product with a
 * Commons URL it is the largest blocking download on the page.
 *
 * It is also the surface where the URL is least controlled: `product.imageUrl`
 * here is whatever a store operator typed, not a seeded value.
 *
 * `remoteImage` returns non-resizable hosts untouched, so funnelling costs
 * nothing when the operator supplies a Supabase or CloudFront URL — and
 * `remoteSrcSet` correctly returns `undefined` for those, which React renders
 * as an omitted attribute.
 *
 * Confirmed RED before the fix: the page's `<img>` had `src={product.imageUrl}`
 * with no `remoteImage(` anywhere in the file and no `srcSet`.
 */

const WEB = path.resolve(__dirname, '..');
const PAGE_REL = 'app/store/seller/[id]/page.tsx';

/** Comments stripped — this file and the page both quote the old pattern. */
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const page = () => stripComments(readFileSync(path.join(WEB, PAGE_REL), 'utf8'));

describe('CM-08 — the seller product image goes through the resize funnel', () => {
  it('never paints the raw column value', () => {
    const src = page();
    expect(src).not.toMatch(/src=\{product\.imageUrl\}/);
  });

  it('routes it through remoteImage at a declared ladder width', () => {
    const src = page();
    expect(src).toMatch(/remoteImage\(/);
    expect(src).toMatch(/IMG_W\./);
  });

  it('offers a srcSet so a phone does not download the desktop candidate', () => {
    const src = page();
    expect(src).toMatch(/srcSet=\{/);
    expect(src).toMatch(/remoteSrcSet\(/);
    // Without `sizes`, the browser assumes 100vw and picks the widest
    // candidate on every viewport, which makes the srcSet worse than useless.
    expect(src).toMatch(/sizes=/);
  });

  it('keeps the intrinsic dimensions that stop the layout reflowing', () => {
    const src = page();
    expect(src).toMatch(/width=\{/);
    expect(src).toMatch(/height=\{/);
  });

  it('keeps the honest empty state for a product with no photo', () => {
    expect(page()).toMatch(/has not added a photo/i);
  });
});

/**
 * The funnel's own behaviour, so the assertions above are not just about the
 * presence of a function name.
 */
describe('CM-08 — remoteImage actually shrinks what an operator might paste', () => {
  const commons =
    'https://upload.wikimedia.org/wikipedia/commons/a/ab/Example_Original.jpg';
  const unsplash = 'https://images.unsplash.com/photo-1?w=2400&h=1600&q=90';
  const opaque = 'https://cdn.example.test/product/1.jpg';

  it('rewrites a Commons original to a thumbnail at the asked width', () => {
    const out = remoteImage(commons, IMG_W.WIDE);
    expect(out).not.toBe(commons);
    expect(out).toContain(`${IMG_W.WIDE}px-`);
  });

  it('rewrites an oversized Unsplash URL down to the slot', () => {
    expect(remoteImage(unsplash, IMG_W.WIDE)).toContain(`w=${IMG_W.WIDE}`);
  });

  it('leaves a host it cannot resize completely alone', () => {
    // This is why funnelling an operator-supplied URL is safe rather than a gamble.
    expect(remoteImage(opaque, IMG_W.WIDE)).toBe(opaque);
    expect(remoteSrcSet(opaque, [IMG_W.CARD, IMG_W.WIDE])).toBeUndefined();
  });

  it('builds real candidates for a host it can resize', () => {
    const set = remoteSrcSet(commons, [IMG_W.CARD, IMG_W.WIDE]);
    expect(set).toBeDefined();
    expect(set).toContain(`${IMG_W.CARD}w`);
    expect(set).toContain(`${IMG_W.WIDE}w`);
  });
});
