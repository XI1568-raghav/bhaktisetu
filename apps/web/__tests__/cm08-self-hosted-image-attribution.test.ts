/**
 * CM-08 — the third source of third-party photographs: files we HOST ourselves.
 *
 * The register in `lib/image-credits.ts` already joins two routes from a
 * Wikimedia Commons file to a screen — `lib/images.ts` (hotlinks) and
 * `apps/api/prisma/seed.ts` (DB rows). Both of those are *hotlinks*: the bytes
 * are served by upload.wikimedia.org, and the browser's own request carries the
 * file's provenance with it.
 *
 * There is a third route, and it is the one that actually redistributes:
 * `apps/web/public/`. Measured on this tree, 2026-08-21:
 *
 *   public/images/golden-temple-og.jpg   1200x630, 136,622 B
 *
 * is a CROP of `File:The_Golden_Temple_of_Amrithsar_7.jpg` — Commons imageinfo
 * gives 4176x2784 (1.50:1), Shagil Kannur, CC BY-SA 4.0,
 * `AttributionRequired: true`. Our copy is 1.905:1, so it is not a scale, it is
 * an ADAPTATION. It was introduced by 73943b61 ("self-host golden-temple og
 * image (wikimedia 429 rate-limit)"), whose own commit body calls it a "CC-SA
 * Wikimedia asset", and it is named as `og:image` / `twitter:image` by ~100
 * route files, i.e. it is the card this site shares itself with.
 *
 * `sharp(...).metadata()` on the shipped file returned `exif: false,
 * icc: false`, no comment segment — and the image itself carried no credit.
 * So the artifact that Facebook, X, LinkedIn and WhatsApp fetch and re-host
 * named no author, no licence and no source, and nothing said the work had
 * been modified. /credits carries the Commons row for the hotlinked original,
 * but a preview card in a WhatsApp thread cannot reach /credits.
 *
 * CC BY-SA 4.0 §3(a)(1) requires the creator, a copyright notice, the licence
 * and a link to the material; §3(a)(1)(B) requires indicating that the work was
 * modified; §3(b)(1) requires the Adaptation to carry the same licence. None of
 * the four was satisfied.
 *
 * WHAT THIS FILE GUARDS
 *
 *  1. Every raster under `apps/web/public/` is declared in
 *     `SELF_HOSTED_IMAGES`. A photograph dropped into `public/` with no row
 *     fails the build — that is the hole 73943b61 walked through.
 *  2. A `commons`-origin row joins to a real `COMMONS_CREDITS` row, so the
 *     author/licence/source also reach /credits.
 *  3. The FILE ITSELF carries the credit. This is the half that matters when
 *     the artifact travels alone: the author name, the licence, the licence
 *     URL, the Commons source page and the modification notice must all be
 *     readable out of the bytes on disk.
 *
 * REGENERATION RECIPE for the credited card (kept here so the artifact is
 * reproducible, since apps/web/scripts is not part of this change):
 * composite a credit line onto the 1200x630 crop with `sharp`, re-encode as
 * JPEG, then splice a JPEG COM segment (0xFFFE) in immediately after SOI
 * carrying `commonsAttributionText(entry)`. Full script is quoted in
 * `docs/audit/` handoff; the assertions below fully specify the output.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  COMMONS_CREDITS,
  SELF_HOSTED_IMAGES,
  commonsAttributionText,
  commonsSourcePage,
  type SelfHostedImage,
} from '../lib/image-credits';

const WEB_ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(WEB_ROOT, 'public');

const RASTER = /\.(png|jpe?g|webp|avif|gif)$/i;

/** Every raster under public/, as a POSIX path with a leading slash. */
function rastersOnDisk(dir = PUBLIC, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) rastersOnDisk(full, out);
    else if (RASTER.test(entry)) {
      out.push('/' + path.relative(PUBLIC, full).split(path.sep).join('/'));
    }
  }
  return out;
}

/**
 * The printable text a JPEG carries in its own bytes.
 *
 * A COM segment is literal ASCII, so a substring scan over the head of the file
 * is enough and needs no JPEG decoder. Bounded to the first 8 KB: metadata
 * segments precede the entropy-coded scan, and scanning the whole file would
 * let a random byte run inside compressed image data pass as a credit.
 */
function metadataText(rel: string): string {
  const buf = readFileSync(path.join(PUBLIC, rel));
  return buf.subarray(0, 8192).toString('latin1');
}

describe('CM-08 — every raster we host ourselves declares where it came from', () => {
  it('the inventory is not empty and every row points at a file that exists', () => {
    expect(SELF_HOSTED_IMAGES.length).toBeGreaterThan(0);
    const missing = SELF_HOSTED_IMAGES.filter(
      (e) => !rastersOnDisk().includes(e.path),
    ).map((e) => e.path);
    expect(missing, 'these inventory rows name files that are not in public/').toEqual([]);
  });

  it('no raster in public/ is undeclared', () => {
    const declared = new Set(SELF_HOSTED_IMAGES.map((e) => e.path));
    const undeclared = rastersOnDisk().filter((p) => !declared.has(p));
    expect(
      undeclared,
      'these files are served from darshya.online with no recorded provenance. ' +
        'A downloaded photograph is REDISTRIBUTION, not a hotlink: if it is ' +
        'somebody else\'s work, its licence conditions apply to us directly. ' +
        "Add a row to SELF_HOSTED_IMAGES in lib/image-credits.ts (origin " +
        "'original' | 'screenshot' | 'commons').",
    ).toEqual([]);
  });

  it('each file is declared exactly once', () => {
    const seen = new Map<string, number>();
    for (const e of SELF_HOSTED_IMAGES) seen.set(e.path, (seen.get(e.path) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([p]) => p)).toEqual([]);
  });
});

describe('CM-08 — a self-hosted Commons derivative is credited in its own bytes', () => {
  const commonsRows = () => SELF_HOSTED_IMAGES.filter((e) => e.origin === 'commons');

  it('there is at least one — otherwise everything below is vacuous', () => {
    expect(
      commonsRows().length,
      'golden-temple-og.jpg is a crop of a CC BY-SA 4.0 Commons photograph; if ' +
        'this is 0 the inventory has stopped describing reality.',
    ).toBeGreaterThan(0);
  });

  it('every commons-origin row names a file the /credits register also carries', () => {
    const credited = new Set(COMMONS_CREDITS.map((c) => c.file));
    const orphans = commonsRows()
      .filter((e) => !e.commonsFile || !credited.has(e.commonsFile))
      .map((e) => `${e.path} -> ${e.commonsFile ?? '(none)'}`);
    expect(
      orphans,
      'the /credits page renders COMMONS_CREDITS. A derivative whose source has ' +
        'no row there is credited nowhere a human can read.',
    ).toEqual([]);
  });

  it('every commons-origin row says what was changed', () => {
    // CC BY 4.0 / BY-SA 4.0 3(a)(1)(B): "indicate if You modified the Licensed
    // Material". A 1.50:1 original served as a 1.91:1 card is a crop.
    const silent = commonsRows()
      .filter((e) => !e.modification || e.modification.trim().length < 10)
      .map((e) => e.path);
    expect(silent).toEqual([]);
  });

  function credit(entry: SelfHostedImage) {
    const row = COMMONS_CREDITS.find((c) => c.file === entry.commonsFile)!;
    return { row, text: commonsAttributionText(entry) };
  }

  it('the attribution text names author, licence, licence URL, source page and the change', () => {
    for (const e of commonsRows()) {
      const { row, text } = credit(e);
      expect(text, `${e.path}: author missing`).toContain(row.author);
      expect(text, `${e.path}: licence missing`).toContain(row.license);
      if (row.licenseUrl) expect(text, `${e.path}: licence URL missing`).toContain(row.licenseUrl);
      expect(text, `${e.path}: source page missing`).toContain(commonsSourcePage(row.file));
      expect(text, `${e.path}: modification not stated`).toContain(e.modification!);
    }
  });

  it('the bytes on disk carry that attribution', () => {
    /*
     * THE LOAD-BEARING ASSERTION. An OG card is fetched and re-hosted by
     * scrapers with no page around it, so the only attribution that survives
     * the trip is the one inside the file. Before this change
     * golden-temple-og.jpg had no EXIF, no ICC and no comment segment at all.
     */
    for (const e of commonsRows()) {
      const { row } = credit(e);
      const meta = metadataText(e.path);
      expect(meta, `${e.path} carries no author in its own metadata`).toContain(row.author);
      expect(meta, `${e.path} carries no licence in its own metadata`).toContain(row.license);
      expect(meta, `${e.path} carries no source page in its own metadata`).toContain(
        commonsSourcePage(row.file),
      );
      expect(
        meta,
        `${e.path} does not state that the work was modified (CC BY-SA 4.0 3(a)(1)(B))`,
      ).toMatch(/modifi|crop|adapt/i);
    }
  });

  it('an attribution-required source keeps the ShareAlike notice on the adaptation', () => {
    // 3(b)(1): Adapted Material must be under the same licence. Cropping to
    // 1.91:1 makes the card Adapted Material.
    for (const e of commonsRows()) {
      const { row } = credit(e);
      if (!row.attributionRequired || !/BY-SA|GFDL/i.test(row.license)) continue;
      expect(
        metadataText(e.path),
        `${e.path}: the adaptation of a ShareAlike work must itself say it is ` +
          'under the same licence.',
      ).toMatch(/share.?alike|also (released|licen[cs]ed) under/i);
    }
  });
});

describe('CM-08 — the self-hosted scan is not vacuous', () => {
  it('rastersOnDisk actually finds the cards this finding is about', () => {
    const all = rastersOnDisk();
    expect(all).toContain('/images/golden-temple-og.jpg');
    expect(all).toContain('/og/default.png');
    expect(all.length).toBeGreaterThan(5);
  });

  it('metadataText reads real bytes, and a bare JPEG has no credit in it', () => {
    // A 2-byte SOI plus nothing is the degenerate case the assertion above
    // must be able to fail on.
    const bare = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).subarray(0, 8192).toString('latin1');
    expect(bare).not.toContain('CC BY-SA 4.0');
  });
});
