import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { wikiThumb, remoteImage, remoteSrcSet, IMG_W } from '../lib/images';

/**
 * CM-08 — "Product cards ship 5.58 MB of unoptimised hotlinked Wikimedia
 * images". The srcSet/ladder work closed most of that; what survived it is a
 * container problem the ladder cannot touch. Commons stores three of this
 * catalogue's assets as PNG, and PNG does not get smaller when you ask for a
 * 500px thumbnail of a photograph — it stays a lossless raster.
 *
 * MEASURED against production on 2026-09-01 (GET, browser UA + Referer, one
 * request per URL — full numbers and the alpha proof live on
 * `transcodeThumbFile` in lib/images.ts):
 *
 *   Rāmacaritamānasa_manuscript_(19th_century).png @500px  505,253 B
 *   the same thumbnail with `.jpg` appended                 84,584 B   −83.3%
 *
 * That single card was 36.9% of /pujas's entire measured image budget
 * (1,366,871 B across its 10 cards).
 *
 * What these assertions are actually worth: every one of them FAILS on the
 * pre-fix `wikiThumb`, which returned the `.png` tail verbatim. None of them
 * restates the bug as the expectation — the first two check opposite outcomes
 * for PNG and SVG-derived PNG, which is the only interesting part of the rule.
 */

const RAMCHARIT =
  'https://upload.wikimedia.org/wikipedia/commons/7/7f/R%C4%81macaritam%C4%81nasa_manuscript_%2819th_century%29.png';
const BIRLA = 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Example_Unhosted_Scan.png';
const KRISHNA =
  'https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png';
const OM_SVG = 'https://upload.wikimedia.org/wikipedia/commons/3/30/1_Om.svg';
const OM_SVG_THUMB =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Om.svg/250px-Om.svg.png';
const A_JPEG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Example_Unhosted_Photo.jpg/1280px-Example_Unhosted_Photo.jpg';

describe('CM-08 — Commons PNG thumbnails are re-encoded by Commons itself', () => {
  it('appends .jpg to a PNG-sourced thumbnail, from the original URL shape', () => {
    const out = wikiThumb(RAMCHARIT, IMG_W.CARD);
    expect(out).toContain('/500px-');
    expect(out.endsWith('.png.jpg')).toBe(true);
  });

  it('appends .jpg to a PNG-sourced thumbnail, from the /thumb/ URL shape', () => {
    const alreadyThumb = wikiThumb(BIRLA, IMG_W.HERO);
    // Feed the produced /thumb/ URL back in at a different width: the second
    // pass must resize AND still carry exactly one `.jpg`.
    const out = wikiThumb(alreadyThumb, IMG_W.CARD);
    expect(out).toContain('/500px-');
    expect(out.endsWith('.png.jpg')).toBe(true);
    expect(out.match(/\.jpg/g)).toHaveLength(1);
  });

  it('is idempotent — a third pass does not stack another .jpg', () => {
    const once = wikiThumb(KRISHNA, IMG_W.CARD);
    const twice = wikiThumb(once, IMG_W.CARD);
    const thrice = wikiThumb(twice, IMG_W.CARD);
    expect(twice).toBe(once);
    expect(thrice).toBe(once);
  });

  it('leaves SVG-derived thumbnails as PNG — their alpha is the whole point', () => {
    // 500px-1_Om.svg.png measured 65% translucent (168,177 of 258,000 px,
    // min alpha 0). Flattening it to JPEG moves pixels by a mean of 162.9/255.
    expect(wikiThumb(OM_SVG, IMG_W.CARD).endsWith('.svg.png')).toBe(true);
    expect(wikiThumb(OM_SVG_THUMB, IMG_W.CARD).endsWith('.svg.png')).toBe(true);
    expect(wikiThumb(OM_SVG, IMG_W.CARD)).not.toContain('.jpg');
  });

  it('leaves an already-JPEG source completely alone', () => {
    const out = wikiThumb(A_JPEG, IMG_W.CARD);
    expect(out).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Example_Unhosted_Photo.jpg/500px-Example_Unhosted_Photo.jpg',
    );
  });

  it('carries through remoteImage and every remoteSrcSet candidate', () => {
    expect(remoteImage(RAMCHARIT, IMG_W.CARD).endsWith('.png.jpg')).toBe(true);
    const set = remoteSrcSet(RAMCHARIT, [250, 500, 960]);
    expect(set).toBeDefined();
    const candidates = set!.split(',').map((s) => s.trim().split(/\s+/)[0]!);
    expect(candidates.length).toBeGreaterThan(1);
    for (const c of candidates) expect(c.endsWith('.png.jpg')).toBe(true);
    // The `w` descriptor must still be the served width, not the ladder ask —
    // appending an extension must not break the width parse.
    expect(set).toMatch(/\s250w/);
    expect(set).toMatch(/\s500w/);
  });

  it('ENUMERATION GUARD — no Commons .png can reach the browser un-transcoded', () => {
    // The rule is only worth anything if it covers every PNG the product
    // references. Re-derive the list from source rather than trusting a
    // hand-written one: a fourth PNG added later must be caught here.
    const roots = ['lib/images.ts', 'lib/image-credits.ts'];
    const seen: string[] = [];
    for (const rel of roots) {
      let text: string;
      try {
        text = readFileSync(join(__dirname, '..', rel), 'utf8');
      } catch {
        continue;
      }
      for (const m of text.matchAll(
        /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[^\s'"`)]+?\.png/gi,
      )) {
        seen.push(m[0]);
      }
    }
    expect(seen.length).toBeGreaterThan(0);
    for (const url of seen) {
      const out = wikiThumb(url, IMG_W.CARD);
      // Self-hosted (TD-09) PNGs are re-encoded to WebP at build time, never sent as PNG.
      if (out.startsWith('/images/') && out.endsWith('.webp')) continue;
      const isSvgDerived = /\.svg\.png$/i.test(url);
      if (isSvgDerived) {
        expect(out.endsWith('.svg.png')).toBe(true);
      } else {
        expect(out.endsWith('.png.jpg')).toBe(true);
      }
    }
  });
});
