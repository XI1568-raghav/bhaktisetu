import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  IMAGES,
  COMMONS_INTRINSIC_WIDTH,
  wikiThumb,
  remoteImage,
  remoteSrcSet,
  IMG_W,
  getImage,
  getTempleHero,
  getTempleThumbnail,
  getTempleGallery,
  getDeityImage,
  getPujaImage,
  getProductImage,
  getGaushalaImage,
  getHeroImage,
  getFestivalImage,
  getContentImage,
} from '../lib/images';

/**
 * HN-05 + CM-08 — the two ways a Wikimedia hotlink can be wrong that the
 * existing `images-perf.test.ts` cannot see.
 *
 * `images-perf.test.ts` proves no getter emits a full-resolution ORIGINAL. It
 * cannot prove the file on the other end exists, nor that the width asked for
 * is a width the file actually has. Both were false in production:
 *
 * 1. HN-05 reported one blank tile on /temples and read it as hotlink
 *    throttling ("no 4xx/5xx recorded, so the fetch is being dropped"). It is
 *    not throttling. Queried against the Commons API on 2026-08-15,
 *    `File:MKJNTemple.jpg` comes back `missing` — the file is not on Commons
 *    at any resolution — and a direct GET of both the original and the 960px
 *    thumb answers `404 File not found:
 *    /v1/AUTH_mw/wikipedia-commons-local-public.53/5/53/…`. It is a permanent
 *    dead link, so no CDN, retry or self-host of *that URL* would have fixed
 *    it. The onError placeholder shipped for HN-05 is still right — it just
 *    hides a hole rather than closing it.
 *
 * 2. Commons happily UPSCALES: a 1280px thumb of a 320x240 original returns
 *    HTTP 200 and 125,084 bytes, against 26,266 bytes for the original file
 *    and 16,938 bytes for its 250px thumb. So the resize funnel, whose whole
 *    job is bytes, was shipping 7.4x the bytes of a correctly-sized request
 *    AND a blurred upscale, on the one page where it looks worst. Nine of the
 *    70 Commons files in the map are narrower than the widths asked of them.
 *
 * Both are asserted here against the exported map and the exported getters, so
 * neither can come back by way of a new entry.
 */

const WEB_ROOT = path.resolve(__dirname, '..');
const IMAGES_TS = path.join(WEB_ROOT, 'lib', 'images.ts');

/**
 * Strip block and line comments before any source-text guard runs. A guard
 * that scans raw source matches the comment explaining the guard, and then
 * documenting the rule becomes the thing that breaks it.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Commons files referenced by this app that the Commons API reports as
 * `missing` and whose upload.wikimedia.org URLs answer HTTP 404. Verified
 * 2026-08-15. A name here must never reappear in a URL.
 */
const DELISTED_COMMONS_FILES = ['MKJNTemple.jpg'];

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

function requestedThumbWidth(url: string): number {
  return Number(/\/(\d+)px-/.exec(url)?.[1] ?? 0);
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

/**
 * Every URL the public getters can hand to an <img>, at every slot width the
 * product actually uses — including each srcSet candidate, which is where an
 * oversized request hides most easily.
 */
function allEmittedUrls(): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  const widths = [IMG_W.THUMB, IMG_W.CARD, IMG_W.WIDE, IMG_W.HERO];
  const push = (label: string, url: string) => out.push({ label, url });
  const pushAll = (label: string, make: (w: number) => string) => {
    for (const w of widths) {
      const url = make(w);
      push(`${label}@${w}`, url);
      for (const c of remoteSrcSet(url, widths)?.split(', ') ?? []) {
        push(`${label}@${w}:srcset`, c.split(' ')[0]!);
      }
    }
  };

  for (const slug of Object.keys(IMAGES.temples)) {
    pushAll(`getTempleHero(${slug})`, (w) => getTempleHero(slug, w));
    pushAll(`getTempleThumbnail(${slug})`, (w) => getTempleThumbnail(slug, w));
    for (const w of widths) {
      getTempleGallery(slug, w).forEach((u, i) => push(`gallery(${slug})[${i}]@${w}`, u));
    }
  }
  for (const key of Object.keys(IMAGES.deities)) {
    pushAll(`getDeityImage(${key})`, (w) => getDeityImage(key, 'portrait', w));
    pushAll(`getDeityImage(${key},square)`, (w) => getDeityImage(key, 'square', w));
  }
  for (const key of Object.keys(IMAGES.pujas)) pushAll(`getPujaImage(${key})`, (w) => getPujaImage(key, w));
  for (const key of Object.keys(IMAGES.store)) pushAll(`getProductImage(${key})`, (w) => getProductImage(key, w));
  for (const key of Object.keys(IMAGES.gaushala)) pushAll(`getGaushalaImage(${key})`, (w) => getGaushalaImage(key, w));
  for (const key of Object.keys(IMAGES.hero)) pushAll(`getHeroImage(${key})`, (w) => getHeroImage(key, w));
  for (const key of Object.keys(IMAGES.festivals)) pushAll(`getFestivalImage(${key})`, (w) => getFestivalImage(key, w));
  for (const key of Object.keys(IMAGES.content)) {
    pushAll(`getContentImage(${key})`, (w) => getContentImage(key, 'full', w));
  }
  for (const [category, group] of Object.entries(IMAGES)) {
    for (const key of Object.keys(group as Record<string, unknown>)) {
      push(`getImage(${category},${key})`, getImage(category, key));
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// HN-05 — no URL may point at a file Commons does not have
// ────────────────────────────────────────────────────────────

describe('delisted Commons files', () => {
  it('none appear in the IMAGES map', () => {
    const offenders = allMapUrls().filter((u) =>
      DELISTED_COMMONS_FILES.some((f) => u.includes(f)),
    );
    expect(offenders).toEqual([]);
  });

  it('none can be emitted by any getter', () => {
    const offenders = allEmittedUrls()
      .filter(({ url }) => DELISTED_COMMONS_FILES.some((f) => url.includes(f)))
      .map(({ label }) => label);
    expect(offenders).toEqual([]);
  });

  it('none survive anywhere in lib/images.ts source, comments excluded', () => {
    const src = stripComments(readFileSync(IMAGES_TS, 'utf8'));
    const offenders = DELISTED_COMMONS_FILES.filter((f) => src.includes(f));
    expect(offenders).toEqual([]);
  });

  it('the Mallikarjuna Jyotirlinga entry still has a real photo of that shrine', () => {
    // Removing the dead URL by deleting the temple would pass the guards above
    // and silently drop a Jyotirlinga off the site.
    const hero = getTempleHero('mallikarjuna', IMG_W.HERO);
    expect(hero).toContain('upload.wikimedia.org');
    expect(hero).toMatch(/Srisailam|Mallikarjuna/i);
    expect(getTempleThumbnail('mallikarjuna', IMG_W.CARD)).toMatch(/Srisailam|Mallikarjuna/i);
    expect(getTempleGallery('mallikarjuna', IMG_W.WIDE).length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────
// CM-08 — a thumb request may never exceed the file's real width
// ────────────────────────────────────────────────────────────

describe('no request upscales a Commons file', () => {
  it('wikiThumb caps a 320px-wide original instead of asking for 1280', () => {
    // Bhimashankar.jpg is 320x240 at source (26,266 B). Its 1280px "thumb" is
    // 125,084 B of blur; its 250px thumb is 16,938 B.
    const url = 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Bhimashankar.jpg';
    expect(requestedThumbWidth(wikiThumb(url, IMG_W.HERO))).toBeLessThanOrEqual(320);
  });

  it('wikiThumb caps a 621px-wide original — the site-wide fallback image', () => {
    // Kashi_Vishwanath.jpg is 621x452 and is FALLBACK_IMAGE, the home hero,
    // the temple-card placeholder and the og-image placeholder.
    const url = 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg';
    expect(requestedThumbWidth(wikiThumb(url, IMG_W.HERO))).toBeLessThanOrEqual(621);
    expect(requestedThumbWidth(wikiThumb(url, IMG_W.WIDE))).toBeLessThanOrEqual(621);
  });

  it('caps an already-/thumb/ URL too, not just a bare original', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Mahishasura-Mardini_Durga.jpg/1280px-Mahishasura-Mardini_Durga.jpg';
    expect(requestedThumbWidth(remoteImage(url, IMG_W.HERO))).toBeLessThanOrEqual(464);
  });

  it('leaves a file wide enough for the request alone', () => {
    // Kedarnath is 4000px+ at source; nothing should be clamped.
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/5/56/Kedarnath_Temple_in_Rainy_season.jpg';
    expect(requestedThumbWidth(wikiThumb(url, IMG_W.HERO))).toBe(1280);
  });

  it('no getter, at any slot width or srcSet candidate, overshoots the source', () => {
    const offenders = allEmittedUrls()
      .map(({ label, url }) => {
        const file = commonsFileName(url);
        const intrinsic = file ? COMMONS_INTRINSIC_WIDTH[file] : undefined;
        const asked = requestedThumbWidth(url);
        return intrinsic && asked > intrinsic ? `${label}: asked ${asked} of ${file} (${intrinsic}px)` : null;
      })
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });

  it('every width in the table belongs to a file this app actually references', () => {
    // A table that drifts into fiction silently stops capping anything.
    const referenced = new Set(allMapUrls().map(commonsFileName).filter(Boolean));
    const orphans = Object.keys(COMMONS_INTRINSIC_WIDTH).filter((f) => !referenced.has(f));
    expect(orphans).toEqual([]);
  });

  it('the capped width is still a valid Commons ladder step', () => {
    // Commons answers HTTP 400 for any width off the ladder, so a cap that
    // emits the exact source width would break every image it touched.
    const LADDER = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];
    const bad = allEmittedUrls()
      .filter(({ url }) => url.includes('/commons/thumb/'))
      .filter(({ url }) => !LADDER.includes(requestedThumbWidth(url)))
      .map(({ label, url }) => `${label} -> ${requestedThumbWidth(url)}px (${url})`);
    expect(bad).toEqual([]);
  });
});
