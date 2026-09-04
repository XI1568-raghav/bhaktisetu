import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * TC-01 (P0, trust) — the largest single copy of the 80G promise: the raster.
 *
 * `apps/web/public/og/default.png` is the `og:image` this site shares itself
 * with. It carried a feature pill reading "80G Receipts", and it is the one
 * surface no text search in this repository could ever have found:
 *
 *   - `__tests__/tc01-80g-repo-wide-gate.test.tsx` walks `apps/web` with
 *     `EXTS = ['.ts', '.tsx', '.json']`. A `.png` is not in that list, and the
 *     generator that produces it — `scripts/build-og-default.mjs` — is `.mjs`
 *     at the repo root, outside `WEB_ROOT` entirely.
 *   - `apps/api/.../api-80g-repo-wide-gate.tc01.test.ts` walks `apps/api`.
 *   - `apps/mobile/lib/__tests__/eighty-g-and-nri-premium.tc01-tc03.test.ts`
 *     walks `apps/mobile`.
 *
 * So four waves of "the 80G gate is wired" were all true and all blind to it.
 *
 * Measured on production 2026-09-01, before this change:
 *
 *   $ curl -s -o prod.png -w '%{http_code} %{size_download}\n' \
 *       https://darshya.online/og/default.png
 *   200 62645
 *   $ md5sum prod.png apps/web/public/og/default.png
 *   5aa9a58985cd948b8c3b4480192bbd2c  prod.png
 *   5aa9a58985cd948b8c3b4480192bbd2c  apps/web/public/og/default.png
 *
 * Byte-identical: the committed raster WAS the live one, and rendering it
 * showed the pill.
 *
 * Why the claim is false, in code rather than in policy: `lib/company.ts`
 * `donationLegal.HAS_80G_VERIFIED` is `false` with `pan` and `eightyGNumber`
 * both `null`, and `apps/api/src/lib/pdf-receipt.ts` `is80GEligible()` requires
 * BOTH a donee 80G registration number AND a donee PAN, read from
 * `gaushala_profiles.regn_80g` / `.pan` — SELECTed in exactly one place
 * (`apps/api/src/routes/donations.ts`) and written by no route in the
 * repository. `is80GEligible()` is therefore false for every donation, always.
 *
 * A raster cannot be grepped, which is what makes the two obvious guards
 * useless here: a test on the generator's source would pass while a stale PNG
 * shipped, and a test on the PNG's bytes can read nothing but pixels. The
 * generator therefore writes `scripts/og-default.build.json` recording the
 * pills it rendered and the SHA-256 of the bytes they produced, and the
 * decisive case below re-hashes the shipped file against it. Against the tree
 * as it stood, that manifest did not exist and every case here fails; had the
 * source been fixed without re-rendering, the hash case alone fails.
 */

const WEB_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');

const PNG = path.join(WEB_ROOT, 'public/og/default.png');
const MANIFEST = path.join(REPO_ROOT, 'scripts/og-default.build.json');
const GENERATOR = path.join(REPO_ROOT, 'scripts/build-og-default.mjs');
const COMPANY = path.join(WEB_ROOT, 'lib/company.ts');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
  has80G: boolean;
  pills: string[];
  output: string;
  bytes: number;
  sha256: string;
};

const png = readFileSync(PNG);
const generatorSrc = readFileSync(GENERATOR, 'utf8');
const companySrc = readFileSync(COMPANY, 'utf8');

/** Case-sensitive on the G — `weight: '80g'` elsewhere is 80 grams of prasad. */
const EIGHTY_G = /80\s?G/;

function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('TC-01 — the premise still holds', () => {
  it('the owner has not registered under Section 80G', () => {
    expect(companySrc).toMatch(/HAS_80G_VERIFIED:\s*false/);
    expect(companySrc).toMatch(/eightyGNumber:\s*null/);
  });

  it('this card really is the site-wide share image', () => {
    // Measured here rather than quoted: count the route files that hard-code
    // the path. Many are [slug] routes, so the page count is far higher.
    const files: string[] = [];
    const skip = new Set(['node_modules', '.next', '.turbo', 'coverage', '__tests__']);
    (function walk(dir: string) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (skip.has(e.name)) continue;
          walk(path.join(dir, e.name));
        } else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) {
          files.push(path.join(dir, e.name));
        }
      }
    })(path.join(WEB_ROOT, 'app'));
    expect(files.length).toBeGreaterThan(300);
    const referencing = files.filter((f) => readFileSync(f, 'utf8').includes('/og/default.png'));
    // 61 under app/ when this was written; a floor, not an equality.
    expect(referencing.length).toBeGreaterThanOrEqual(50);
  });
});

describe('TC-01 — the shipped raster is the one the gated pills produced', () => {
  it('the manifest agrees with the owner flag', () => {
    const flag = /HAS_80G_VERIFIED:\s*(true|false)/.exec(companySrc)?.[1];
    expect(flag).toBeDefined();
    expect(manifest.has80G).toBe(flag === 'true');
  });

  it('no pill promises a deduction while the registration is missing', () => {
    expect(manifest.pills.length).toBe(4);
    expect(manifest.has80G).toBe(false);
    for (const p of manifest.pills) {
      expect(EIGHTY_G.test(p), `pill "${p}" still promises 80G`).toBe(false);
      expect(p).not.toMatch(/tax[- ]deductible/i);
    }
    // The receipt is still promised — this is a correction, not a cut.
    expect(manifest.pills).toContain('Numbered Receipts');
  });

  it('the PNG on disk hashes to exactly what those pills rendered', () => {
    // THE decisive case. A source-only fix that never re-ran the generator
    // leaves the old raster here and fails on this line.
    expect(createHash('sha256').update(png).digest('hex')).toBe(manifest.sha256);
    expect(png.length).toBe(manifest.bytes);
  });

  it('the manifest points at the file that is actually served', () => {
    expect(manifest.output).toBe('apps/web/public/og/default.png');
    expect(existsSync(PNG)).toBe(true);
  });
});

describe('TC-01 — re-rendering did not undo PERF-05', () => {
  it('is still 1200x630, the summary_large_image aspect every scraper wants', () => {
    expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
  });

  it('is still under the 100 KB budget PERF-05 pinned', () => {
    expect(png.length).toBeLessThanOrEqual(100 * 1024);
  });

  it('is still a PNG at that exact path, because ~60 route files hard-code it', () => {
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(generatorSrc).toMatch(/palette:\s*true/);
  });
});

describe('TC-01 — the generator is a gate, not a deletion', () => {
  it('reads the flag out of company.ts instead of mirroring it', () => {
    expect(generatorSrc).toMatch(/apps\/web\/lib\/company\.ts/);
    expect(generatorSrc).toMatch(/HAS_80G_VERIFIED:\\s\*\(true\|false\)/);
  });

  it('refuses to render at all if the flag cannot be found', () => {
    expect(generatorSrc).toMatch(/refusing to render an OG card/);
  });

  it('names "80G Receipts" only on the HAS_80G branch', () => {
    // Strip the comment block that has to quote the removed pill to explain it.
    const live = generatorSrc
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^[ \t]*\/\/.*$/gm, '');
    const occurrences = live.match(/80G Receipts/g) ?? [];
    expect(occurrences.length).toBe(1);
    expect(live).toMatch(/HAS_80G\s*\?\s*'80G Receipts'\s*:\s*'Numbered Receipts'/);
  });
});
