/**
 * CM-08 — every Wikimedia Commons file this app displays must be credited.
 *
 * CM-08 was filed about bytes: product cards shipping 5.58 MB of hotlinked
 * Commons originals. The resize funnel in `lib/images.ts` answered that half.
 * The half it did not answer is that those files are somebody else's
 * photographs, and 53 of the 70 the app references carry
 * `AttributionRequired: true` on Commons — CC BY, CC BY-SA and GFDL all oblige
 * the re-user to name the author and the licence.
 *
 * Measured against the shipped `/credits` list on 2026-08-16:
 *
 *   - 14 referenced files had no credit row at all. 11 were
 *     attribution-required, and 13 of the 14 were `IMAGES.store` product
 *     photos — the exact surface the finding named. Among them
 *     `Rudraksha_mala.jpg` (Janak Bhatta, CC BY-SA 4.0), the 5.58 MB file the
 *     finding was measuring.
 *   - `MKJNTemple.jpg` still had a row after HN-05 removed it from the app,
 *     while its replacement `Night_view_of_Srisailam_Temple_South_Gopuram.jpg`
 *     (Adityamadhav83, CC BY 4.0) arrived with no row — so that earlier fix
 *     swapped a broken image for an uncredited one.
 *
 * Neither drift was detectable, because the credit list was literal JSX and the
 * URL list is a TypeScript object. This file joins them on the Commons file
 * name so the build fails instead.
 *
 * These assertions are deliberately two-directional. A one-way check ("every
 * credit names a real file") passes trivially on an empty list, and a licence
 * obligation that can be satisfied by deleting the register is not a check.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  COMMONS_CREDITS,
  commonsFileFromUrl,
  commonsSourcePage,
  creditForUrl,
  creditLine,
} from '../lib/image-credits';
import {
  IMAGES,
  IMG_W,
  remoteSrcSet,
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

const WEB_ROOT = path.resolve(__dirname, '..');

/**
 * Strip block and line comments before any source-text scan. A guard that reads
 * raw source matches the prose describing the rule, so the comment explaining
 * an attribution becomes the reason the attribution looks present. This has
 * bitten this sweep repeatedly; the register is scanned as code only.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
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
 * Every URL a public getter can hand to an `<img>`, at every slot width and
 * every srcSet candidate. A file reachable only through one getter at one width
 * is still displayed, and still needs its credit.
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
  return out;
}

/**
 * Commons files the DATABASE puts on screen.
 *
 * `lib/images.ts` is not the only route from a Commons URL to an `<img>`. The
 * temple grid never consults it for photographs: `app/temples/page.tsx:43-51,86`
 * paints `imageUrl: firstImageUrl(t.images)` straight off the API's temple rows,
 * and line 169 merges the same API value into the rich cards. Those `images`
 * arrays are written by `apps/api/prisma/seed.ts` and they are Commons
 * hotlinks — 68 distinct files, 55 of which had no credit row until 2026-08-19.
 *
 * Counting them here is what stops the orphan assertion below from rejecting
 * their rows as unreferenced. The forward direction (every seeded file has a
 * row) is asserted with its own diagnostics in
 * `__tests__/cm08-seeded-commons-attribution.test.ts`.
 */
function seededCommonsFiles(): Set<string> {
  const seed = path.resolve(WEB_ROOT, '..', 'api', 'prisma', 'seed.ts');
  const src = stripComments(readFileSync(seed, 'utf8'));
  const files = new Set<string>();
  for (const m of src.matchAll(/https:\/\/upload\.wikimedia\.org\/[^'"`\s)]+/g)) {
    const f = commonsFileFromUrl(m[0]);
    if (f) files.add(f);
  }
  return files;
}

/** Distinct Commons file names the app can put on screen. */
function referencedCommonsFiles(): Set<string> {
  const files = new Set<string>();
  for (const url of allMapUrls()) {
    const f = commonsFileFromUrl(url);
    if (f) files.add(f);
  }
  for (const { url } of allEmittedUrls()) {
    const f = commonsFileFromUrl(url);
    if (f) files.add(f);
  }
  for (const f of seededCommonsFiles()) files.add(f);
  return files;
}

describe('CM-08 — the attribution register covers what the app displays', () => {
  it('every referenced Commons file has a credit row', () => {
    const credited = new Set(COMMONS_CREDITS.map((c) => c.file));
    const uncredited = [...referencedCommonsFiles()].filter((f) => !credited.has(f)).sort();
    expect(uncredited).toEqual([]);
  });

  it('every credit row names a file the app still references', () => {
    // An orphan row is how MKJNTemple.jpg outlived its own removal: the page
    // kept crediting a file nothing displayed, which reads as coverage.
    const referenced = referencedCommonsFiles();
    const orphans = COMMONS_CREDITS.map((c) => c.file)
      .filter((f) => !referenced.has(f))
      .sort();
    expect(orphans).toEqual([]);
  });

  it('the store product photos are credited — the surface CM-08 named', () => {
    // 13 of the 14 originally-missing rows were IMAGES.store entries. Guard the
    // whole group by name so a new product cannot be added uncredited.
    const credited = new Set(COMMONS_CREDITS.map((c) => c.file));
    const uncredited = Object.keys(IMAGES.store)
      .map((slug) => [slug, commonsFileFromUrl(getProductImage(slug, IMG_W.CARD))] as const)
      .filter(([, file]) => file && !credited.has(file))
      .map(([slug, file]) => `${slug} -> ${file}`);
    expect(uncredited).toEqual([]);
  });

  it('no file appears in the register twice', () => {
    const seen = new Set<string>();
    const dupes = COMMONS_CREDITS.filter((c) => (seen.has(c.file) ? true : (seen.add(c.file), false)));
    expect(dupes.map((c) => c.file)).toEqual([]);
  });
});

describe('CM-08 — each row actually discharges the licence', () => {
  it('an attribution-required file names a human author', () => {
    // "" or "Unknown" on a CC BY / CC BY-SA / GFDL file is the licence
    // condition still unmet, just written down.
    const bad = COMMONS_CREDITS.filter(
      (c) => c.attributionRequired && (!c.author.trim() || /^unknown$/i.test(c.author.trim())),
    ).map((c) => `${c.file} (${c.license})`);
    expect(bad).toEqual([]);
  });

  it('an attribution-required file links its licence text', () => {
    const bad = COMMONS_CREDITS.filter(
      (c) => c.attributionRequired && !/^https?:\/\//.test(c.licenseUrl),
    ).map((c) => `${c.file} (${c.license})`);
    expect(bad).toEqual([]);
  });

  it('every row states a licence', () => {
    expect(COMMONS_CREDITS.filter((c) => !c.license.trim()).map((c) => c.file)).toEqual([]);
  });

  it('licence names stay in the vocabulary Commons actually returns', () => {
    // Free-text drift here ("CC-BY 4", "Creative Commons") makes the register
    // impossible to check against the API later.
    const ALLOWED = new Set([
      'Public domain',
      'CC0',
      'CC BY 2.0',
      // Two of the DB-seeded temple photographs (Rath_Yatra_Puri_07-11027.jpg,
      // Akshardham_Delhi_Ricky_W.jpg) are CC BY 2.5. Read from the Commons
      // extmetadata API 2026-08-19 — this widens the vocabulary to what Commons
      // returns, it does not loosen any obligation.
      'CC BY 2.5',
      'CC BY 3.0',
      'CC BY 4.0',
      'CC BY-SA 2.0',
      'CC BY-SA 2.5',
      'CC BY-SA 3.0',
      'CC BY-SA 4.0',
      'GFDL',
    ]);
    const unknown = [...new Set(COMMONS_CREDITS.map((c) => c.license))].filter((l) => !ALLOWED.has(l));
    expect(unknown).toEqual([]);
  });

  it('a public-domain or CC0 file is not marked attribution-required', () => {
    const bad = COMMONS_CREDITS.filter(
      (c) => c.attributionRequired && (c.license === 'Public domain' || c.license === 'CC0'),
    ).map((c) => c.file);
    expect(bad).toEqual([]);
  });

  it('the register is not trivially small', () => {
    // Every assertion above is satisfiable by an empty array.
    expect(COMMONS_CREDITS.length).toBeGreaterThanOrEqual(referencedCommonsFiles().size);
    expect(COMMONS_CREDITS.filter((c) => c.attributionRequired).length).toBeGreaterThanOrEqual(50);
  });
});

describe('CM-08 — the lookup helpers behave', () => {
  it('resolves a bare Commons original to its credit', () => {
    const c = creditForUrl('https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg');
    expect(c?.author).toBe('Janak Bhatta');
    expect(c?.license).toBe('CC BY-SA 4.0');
  });

  it('resolves a /thumb/ URL and a percent-encoded name to the same credit', () => {
    const thumb = creditForUrl(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Japa_mala_%28prayer_beads%29_of_Tulasi_wood_with_108_beads_-_20040101-01.jpg/500px-x.jpg',
    );
    expect(thumb?.file).toBe(
      'Japa_mala_(prayer_beads)_of_Tulasi_wood_with_108_beads_-_20040101-01.jpg',
    );
    expect(thumb?.author).toBe('GourangaUK.');
  });

  it('returns undefined for a non-Commons host rather than guessing', () => {
    expect(creditForUrl('https://images.unsplash.com/photo-1603228254119-e6a4d095dc59')).toBeUndefined();
    expect(commonsFileFromUrl('https://images.darshya.online/priests/x.jpg')).toBeUndefined();
  });

  it('builds the canonical Commons page URL, keeping the File: prefix usable', () => {
    expect(commonsSourcePage('Gir_cow.jpg')).toBe(
      'https://commons.wikimedia.org/wiki/File:Gir_cow.jpg',
    );
    expect(commonsSourcePage('Somanath_mandir_(cropped).jpg')).toContain('Somanath_mandir');
  });

  it('renders a one-line credit naming author and licence', () => {
    const c = creditForUrl('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg')!;
    expect(creditLine(c)).toBe('Kashi Vishwanath — Architkumar1234, CC BY-SA 4.0');
  });
});

describe('CM-08 — the register is the only place credits are declared', () => {
  it('lib/images.ts still hotlinks Commons, so the obligation is live', () => {
    // If the images were ever replaced outright the register could go; until
    // then this records why it must not.
    const src = stripComments(readFileSync(path.join(WEB_ROOT, 'lib', 'images.ts'), 'utf8'));
    expect(src).toContain('upload.wikimedia.org/wikipedia/commons/');
  });
});
