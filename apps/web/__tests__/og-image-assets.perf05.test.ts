import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * PERF-05 — the two Open Graph cards this site shares itself with.
 *
 * Measured on prod: `/images/golden-temple-og.jpg` was 376,900 B at 1280x853
 * (1.50:1) and `/og/default.png` was 261,150 B, the latter referenced as
 * og:image by 647 of the 1,785 prerendered pages. Facebook, X, LinkedIn and
 * WhatsApp all specify 1.91:1 (1200x630) for `summary_large_image`, so the
 * 1.50:1 card was centre-cropped by every scraper, and WhatsApp — the dominant
 * sharing channel for this audience — drops preview images that are too large
 * rather than resizing them, so the card can render with no image at all.
 *
 * ONE DEVIATION FROM THE FINDING, DELIBERATE. The finding says to convert
 * `og/default.png` to JPEG "(a photographic OG card should never be PNG)".
 * That card is not photographic: it is a flat orange gradient with a white
 * wordmark, three pill labels and a large translucent Om glyph. JPEG is the
 * wrong codec for exactly that content — ringing on the type, banding in the
 * gradient — and, more concretely, the `.png` path is hard-coded as the
 * og:image in ~100 route files, so changing the extension would 404 the OG
 * card on all 647 pages at once. A 256-colour quantised PNG gets the same
 * saving the finding wanted (261 KB -> 63 KB) with a measured mean channel
 * deviation of 0.267/255 and no reference churn. Hence the guard below that
 * the file stays a PNG.
 */

const WEB_ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(WEB_ROOT, 'public');

/** Facebook/X/LinkedIn/WhatsApp summary_large_image. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function pngSize(buf: Buffer): { width: number; height: number } {
  // IHDR is always the first chunk: 8-byte signature, 4 length, 4 type, then w/h.
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf: Buffer): { width: number; height: number } {
  expect(buf.readUInt16BE(0)).toBe(0xffd8);
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1]!;
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error('no SOF marker — not a JPEG this parser understands');
}

function measure(rel: string) {
  const full = path.join(PUBLIC, rel);
  const buf = readFileSync(full);
  const size = statSync(full).size;
  const dims = rel.endsWith('.png') ? pngSize(buf) : jpegSize(buf);
  return { ...dims, bytes: size, aspect: dims.width / dims.height };
}

describe('PERF-05 — Open Graph cards are 1200x630 and small enough to survive a scraper', () => {
  it('golden-temple-og.jpg is exactly 1200x630', () => {
    const m = measure('images/golden-temple-og.jpg');
    expect({ width: m.width, height: m.height }).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
    expect(m.aspect).toBeCloseTo(1.91, 1);
  });

  it('golden-temple-og.jpg is under 150 KB', () => {
    expect(measure('images/golden-temple-og.jpg').bytes).toBeLessThanOrEqual(150 * 1024);
  });

  it('og/default.png is exactly 1200x630', () => {
    const m = measure('og/default.png');
    expect({ width: m.width, height: m.height }).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
  });

  it('og/default.png is under 100 KB — it is the og:image on 647 pages', () => {
    expect(measure('og/default.png').bytes).toBeLessThanOrEqual(100 * 1024);
  });

  it('og/default.png stays a PNG at that exact path', () => {
    // ~100 route files hard-code '/og/default.png'. Re-encoding it as JPEG
    // under a .jpg name would 404 the OG card on every one of them.
    expect(existsSync(path.join(PUBLIC, 'og', 'default.png'))).toBe(true);
    expect(readFileSync(path.join(PUBLIC, 'og', 'default.png')).subarray(1, 4).toString('ascii')).toBe(
      'PNG',
    );
  });

  it('no asset in public/og is oversized for a share card', () => {
    const oversized = readdirSync(path.join(PUBLIC, 'og'))
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
      .map((f) => [f, statSync(path.join(PUBLIC, 'og', f)).size] as const)
      .filter(([, b]) => b > 150 * 1024)
      .map(([f, b]) => `${f} (${b} B)`);
    expect(oversized).toEqual([]);
  });

  it('every /og/ path the app names resolves to a file that exists', () => {
    // A rename that silently 404s the card is indistinguishable from a correct
    // deploy until someone shares a link. /og/nri-premium.jpg was exactly that
    // — declared as the og:image on /nri and /nri/ca, the two landing pages for
    // the highest-value cohort on the site, with no such file in public/.
    const missing = [...referencedLocalAssets()]
      .filter((p) => p.startsWith('/og/'))
      .filter((p) => !existsSync(path.join(PUBLIC, p)));
    expect(missing).toEqual([]);
  });

  it('no NEW dead /images/ reference appears beyond the two already recorded', () => {
    /*
     * Scoped deliberately, not weakened. Two `/images/content/*.jpg` paths are
     * dead in `app/content/page.tsx` and `app/content/[slug]/page.tsx`, and the
     * right repair is not to invent two photographs: 20 of the 22 items in the
     * same fallback array set `imageUrl: null` and take the real Wikimedia
     * photo that `getContentImage()` returns. These two should do the same.
     * That is a one-line data change in two page files, which this pass does
     * not own. Recording them here keeps the debt visible and still fails the
     * moment a THIRD dead path is added.
     */
    const KNOWN_DEAD = [
      '/images/content/hanuman-chalisa.jpg',
      '/images/content/om-jai-jagdish.jpg',
    ];
    const missing = [...referencedLocalAssets()]
      .filter((p) => p.startsWith('/images/'))
      .filter((p) => !existsSync(path.join(PUBLIC, p)));
    expect(missing.sort()).toEqual(KNOWN_DEAD.sort());
  });
});

/** Every `/og/…` or `/images/…` asset path hard-coded in app/ or components/. */
function referencedLocalAssets(): Set<string> {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) {
        for (const m of readFileSync(full, 'utf8').matchAll(
          /['"`](\/(?:og|images)\/[^'"`]+\.(?:png|jpe?g|webp|svg))['"`]/g,
        )) {
          found.add(m[1]!);
        }
      }
    }
  };
  walk(path.join(WEB_ROOT, 'app'));
  walk(path.join(WEB_ROOT, 'components'));
  expect(found.size).toBeGreaterThan(0);
  return found;
}
