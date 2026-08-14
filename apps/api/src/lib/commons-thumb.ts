/**
 * Wikimedia Commons thumbnail rewriting — the API half of the image contract.
 *
 * COM-18 (prod sweep 2026-08-12): the store catalogue served Commons ORIGINALS
 * (Rudraksha_mala.jpg = 5.7 MB, Bhagavad_Gita_book_(small)_01.jpg = 5.0 MB,
 * Pure_Ghee-Homemade-Maharashtra.jpg = 4.0 MB) into 600x600 product cards, on
 * 4G in India. apps/web already routes its own rendering through
 * `wikiThumb` in apps/web/lib/images.ts; this is the same transform for
 * everything that reads the API instead (apps/mobile, GET /store/products).
 *
 * Deliberately duplicated rather than imported: apps/api does not depend on
 * apps/web, and the shared barrels are not safe to pull into either direction.
 * The LADDER is the load-bearing part — keep it identical to
 * `COMMONS_LADDER` in apps/web/lib/images.ts. Commons has rejected arbitrary
 * thumbnail widths with HTTP 400 since 2024, so an off-ladder width does not
 * degrade quality, it 400s and the card renders blank.
 * https://www.mediawiki.org/wiki/Common_thumbnail_sizes
 */

export const COMMONS_LADDER = [
  20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840,
] as const;

/** Snap UP to the next ladder step so quality never undershoots the slot. */
export function snapToCommonsLadder(width: number): number {
  for (const step of COMMONS_LADDER) {
    if (step >= width) return step;
  }
  return COMMONS_LADDER[COMMONS_LADDER.length - 1]!;
}

/**
 * Convert any Wikimedia Commons URL to a thumbnail at the given width.
 * Non-Commons URLs (Unsplash, self-hosted) pass through untouched — they carry
 * their own sizing params and must not be rewritten.
 *
 *   .../commons/a/bc/Foo.jpg                      -> .../commons/thumb/a/bc/Foo.jpg/<w>px-Foo.jpg
 *   .../commons/thumb/a/bc/Foo.jpg/1280px-Foo.jpg -> ...same file at <w>px
 */
export function commonsThumb(url: string, width: number): string {
  if (!url.includes('upload.wikimedia.org/wikipedia/commons/')) return url;
  const w = snapToCommonsLadder(width);
  if (url.includes('/commons/thumb/')) {
    return url.replace(/\/(\d+)px-/, `/${w}px-`);
  }
  const match = url.match(/\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/);
  if (!match) return url;
  const [, a, bc, file] = match;
  // .svg renders as .svg.png at thumb sizes (Commons rule). Others pass through.
  const thumbFile = /\.svg$/i.test(file!) ? `${file}.png` : file;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${bc}/${file}/${w}px-${thumbFile}`;
}
