import { describe, it, expect } from 'vitest';
import {
  IMAGES,
  COMMONS_INTRINSIC_WIDTH,
  IMG_W,
  getTempleHero,
  remoteSrcSet,
} from '../lib/images';

/**
 * CM-08 — the upscale clamp only clamps files it has heard of, and nothing
 * made sure it had heard of them all.
 *
 * `commons-asset-integrity.test.ts` already asserts that "no getter, at any
 * slot width or srcSet candidate, overshoots the source". Its check reads:
 *
 *     const intrinsic = file ? COMMONS_INTRINSIC_WIDTH[file] : undefined;
 *     return intrinsic && asked > intrinsic ? …offender… : null;
 *
 * A file with no row yields `intrinsic === undefined`, so the offender test
 * short-circuits to `null` and the request passes. The assertion therefore
 * cannot fail for exactly the files nobody remembered to measure — it enumerates
 * the offending request at 1280 and then declines to judge it. The docstring on
 * COMMONS_INTRINSIC_WIDTH made that completeness load-bearing ("Only under-1280
 * files need a row — anything wider is never overshot") without anything
 * enforcing it, and it had drifted.
 *
 * MEASURED 2026-08-20 against the Commons `imageinfo` API (prop=imageinfo,
 * iiprop=size) for all 70 Commons files `lib/images.ts` references:
 *
 *   17 of the 70 are narrower than IMG_W.HERO (1280), the widest slot every
 *   getter is exercised at. 9 had a row. 8 did not:
 *
 *     Red_Sindhi_Cow_at_Pakistan.jpg                        960
 *     (1)_Aarti_Thali,_Prayer_Plate_India.jpg              1024
 *     Dwarakadheesh_Temple,_2014.jpg                       1024
 *     Surabhi_Cow_Vrindavan.jpg                            1024
 *     Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg  1033
 *     Raja_Ravi_Varma,_Goddess_Lakshmi,_1896.jpg           1057
 *     StandingHanumanCholaDynasty11thCentury.jpg           1058
 *     Vishnu_from_Gita_Govinda.jpg                         1112
 *
 *   Bytes, measured by HEAD against upload.wikimedia.org on 2026-08-20 with a
 *   browser UA — the 1280px thumb the app asked for versus the widest ladder
 *   step the file can actually satisfy:
 *
 *     Dwarakadheesh_Temple,_2014.jpg   1280px 266,721 B → 960px 176,149 B
 *     Ganesha_Basohli…p73.jpg          1280px 475,939 B → 960px 302,485 B
 *     StandingHanuman…11thCentury.jpg  1280px 445,017 B → 960px 265,749 B
 *     Vishnu_from_Gita_Govinda.jpg     1280px 435,300 B → 960px 278,830 B
 *     Raja_Ravi_Varma,…1896.jpg        1280px 579,946 B → 960px 327,984 B
 *     (1)_Aarti_Thali,…India.jpg       1280px 158,220 B →  960px 97,799 B
 *     Surabhi_Cow_Vrindavan.jpg        1280px 212,262 B → 960px 136,552 B
 *     Red_Sindhi_Cow_at_Pakistan.jpg   1280px 191,365 B →  960px 99,236 B
 *                                    ─────────────────────────────────────
 *                                            2,764,770 B → 1,684,784 B
 *
 *   1,079,986 B of pure upscale — Commons answers 200 and re-encodes the file
 *   larger than it is, so the extra megabyte buys a blurrier image.
 *
 *   Reachable TODAY, not hypothetically: `Dwarakadheesh_Temple,_2014.jpg` is
 *   `IMAGES.temples['dwarkadhish'].hero`, and `app/temples/[slug]/page.tsx:327`
 *   and `:954` call `getTempleHero(slug)` at its IMG_W.HERO default, then
 *   `remoteSrcSet(heroImg, [CARD, WIDE, HERO])` with `sizes="100vw"`, so a
 *   desktop viewport picks the 1280w candidate. `app/darshan/[id]/page.tsx:561`
 *   does the same. The other seven become live the moment any surface asks a
 *   deity, puja, content or gaushala image for a hero-width slot.
 *
 * The guard below is a COMPLETENESS check, not another width check: every
 * Commons file the map references must carry a measured width. That is what
 * makes the existing overshoot assertion able to fail. It deliberately reads
 * the runtime `IMAGES` object rather than the source text, so there is no
 * comment for a regex to trip over.
 */

const COMMONS_FILE = /\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/;

function commonsFileName(url: string): string | undefined {
  const m = COMMONS_FILE.exec(url);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Every string anywhere in the IMAGES tree. */
function allMapUrls(): string[] {
  const out: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') Object.values(node).forEach(visit);
  };
  visit(IMAGES);
  return out;
}

function referencedCommonsFiles(): string[] {
  return [...new Set(allMapUrls().map(commonsFileName).filter((f): f is string => Boolean(f)))].sort();
}

const requestedThumbWidth = (url: string): number => Number(/\/(\d+)px-/.exec(url)?.[1] ?? 0);

describe('CM-08 — every referenced Commons file has a measured intrinsic width', () => {
  it('the file list is non-empty, so the guard below measures something', () => {
    expect(referencedCommonsFiles().length).toBeGreaterThan(50);
  });

  it('no referenced Commons file is missing from COMMONS_INTRINSIC_WIDTH', () => {
    const missing = referencedCommonsFiles().filter((f) => COMMONS_INTRINSIC_WIDTH[f] === undefined);
    expect(
      missing,
      'these Commons files have no recorded source width, so ladderWidth() cannot ' +
        'clamp a request for them and the "no getter overshoots the source" ' +
        'assertion in commons-asset-integrity.test.ts short-circuits to a pass. ' +
        'Read the real width from the Commons imageinfo API — ' +
        'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=size&titles=File:<name> ' +
        '— and add a row. Do not guess.\n' +
        missing.join('\n'),
    ).toEqual([]);
  });

  it('a recorded width is never wider than the widest slot, unless it truly is', () => {
    // Sanity on the values themselves: a row claiming 0 or a negative width
    // would disable the clamp just as effectively as a missing row.
    const nonsense = Object.entries(COMMONS_INTRINSIC_WIDTH).filter(
      ([, w]) => !Number.isInteger(w) || w <= 0,
    );
    expect(nonsense).toEqual([]);
  });
});

describe('CM-08 — the temple hero that is over-requested today', () => {
  it('getTempleHero("dwarkadhish") does not ask Commons to upscale a 1024px file', () => {
    // Dwarakadheesh_Temple,_2014.jpg is 1024x768 at source. 1280px costs
    // 266,721 B and is an upscale; 960px costs 176,149 B and is the real thing.
    const url = getTempleHero('dwarkadhish');
    // TD-09: the hero is now a self-hosted WebP no wider than its source.
    expect(url).toContain('/images/temples/dwarkadhish');
    expect(url).not.toContain('upload.wikimedia.org');
  });

  it('none of its srcSet candidates overshoot either', () => {
    const hero = getTempleHero('dwarkadhish');
    const candidates = remoteSrcSet(hero, [IMG_W.CARD, IMG_W.WIDE, IMG_W.HERO])?.split(', ') ?? [];
    expect(candidates.length).toBeGreaterThan(0);
    const over = candidates
      .map((c) => Number(c.split(' ')[1]!.replace('w', '')))
      .filter((w) => w > 1024);
    expect(over).toEqual([]);
  });
});
