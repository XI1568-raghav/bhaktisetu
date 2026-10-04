import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { COMMONS_CREDITS, commonsFileFromUrl } from '../lib/image-credits';

/**
 * CM-08 — the Commons files that reach the screen from the DATABASE, not from
 * `lib/images.ts`.
 *
 * `__tests__/cm08-commons-attribution.test.ts` joins the attribution register
 * against `lib/images.ts` and fails when a hardcoded URL has no credit row.
 * That join has a hole the size of the catalogue: the temple grid does not read
 * `lib/images.ts` at all for its photographs. `app/temples/(index)/page.tsx:43-51,86`
 * defines `firstImageUrl(images)` and paints `imageUrl: firstImageUrl(t.images)`
 * straight from the API's temple rows, and `app/temples/(index)/page.tsx:169` merges the
 * same API value into the rich cards. Those `images` arrays are seeded by
 * `apps/api/prisma/seed.ts`, and they are Wikimedia Commons hotlinks.
 *
 * Measured 2026-08-19 against HEAD (47064e6d): `apps/api/prisma/seed.ts`
 * references 68 distinct Commons files. 55 of them had NO row in the register,
 * and 41 of those 55 carry `AttributionRequired: true` on Commons — CC BY,
 * CC BY-SA and CC BY 2.5 all oblige the re-user to name the author and the
 * licence. So the earlier CM-08 fix closed the hardcoded half of the licensing
 * problem and left the database half wide open: /temples was, and until these
 * rows landed still would be, publishing 41 photographs whose licence condition
 * the product does not meet.
 *
 * The register is joined against the SEED because the seed is the only
 * machine-checkable statement of what is in the temples table — production is
 * down (Render billing suspension, 2026-08-17) and there is no live row to
 * query. If an operator later uploads a Commons file through the admin UI this
 * test cannot see it; that residue is recorded in the finding, not papered over
 * here.
 *
 * PROVENANCE for every row added under "Seeded via apps/api/prisma/seed.ts" in
 * `lib/image-credits.ts`: read from the Commons imageinfo/extmetadata API on
 * 2026-08-19 with `iiextmetadatafilter=Artist|Credit|LicenseShortName|
 * LicenseUrl|AttributionRequired`, the same endpoint the register's own header
 * comment mandates. Nothing was inferred from a file name.
 */

const SEED = path.resolve(__dirname, '..', '..', 'api', 'prisma', 'seed.ts');

/**
 * Commons file names hotlinked by the seed.
 *
 * Comments are stripped first. A guard that scans raw source counts the prose
 * describing a URL as a URL, which is how a rule ends up reporting itself as a
 * violation; this repo has been bitten by that six times.
 */
function seededCommonsFiles(): string[] {
  const raw = readFileSync(SEED, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const files = new Set<string>();
  for (const m of src.matchAll(/https:\/\/upload\.wikimedia\.org\/[^'"`\s)]+/g)) {
    const f = commonsFileFromUrl(m[0]);
    if (f) files.add(f);
  }
  return [...files].sort();
}

describe('CM-08 — Commons files the database puts on screen are credited too', () => {
  it('the seed this test reads actually exists', () => {
    // Without this the scan below returns an empty set on a moved file and
    // every assertion here passes by measuring nothing.
    expect(existsSync(SEED), `${SEED} not found — the join has silently gone vacuous`).toBe(true);
  });

  it('the scan finds the hotlinks it is supposed to be checking', () => {
    expect(seededCommonsFiles().length).toBeGreaterThanOrEqual(60);
  });

  it('every Commons file seeded into the database has a credit row', () => {
    const credited = new Set(COMMONS_CREDITS.map((c) => c.file));
    const uncredited = seededCommonsFiles().filter((f) => !credited.has(f));
    expect(
      uncredited,
      'these Wikimedia Commons files are seeded into the temples/puja_types tables and ' +
        'painted by app/temples/(index)/page.tsx, but no row in lib/image-credits.ts names their ' +
        'author or licence. Read each one from the Commons imageinfo/extmetadata API ' +
        '(see the header of lib/image-credits.ts) and add a row — do not guess a name.\n' +
        uncredited.join('\n'),
    ).toEqual([]);
  });

  it('the seeded temple photographs that require attribution name an author', () => {
    const byFile = new Map(COMMONS_CREDITS.map((c) => [c.file, c]));
    const bad = seededCommonsFiles()
      .map((f) => byFile.get(f))
      .filter(
        (c): c is NonNullable<typeof c> =>
          !!c && c.attributionRequired && (!c.author.trim() || /^unknown$/i.test(c.author.trim())),
      )
      .map((c) => `${c.file} (${c.license})`);
    expect(bad).toEqual([]);
  });

  it('the seeded set is not silently a subset of the hardcoded set', () => {
    // If this ever drops to 0 the two registers have merged and this file is
    // redundant — but it must not drop to 0 because the scan broke.
    const files = seededCommonsFiles();
    const inImagesTs = new Set(
      [...readFileSync(path.resolve(__dirname, '..', 'lib', 'images.ts'), 'utf8')
        .matchAll(/https:\/\/upload\.wikimedia\.org\/[^'"`\s)]+/g)]
        .map((m) => commonsFileFromUrl(m[0]))
        .filter((f): f is string => !!f),
    );
    expect(files.filter((f) => !inImagesTs.has(f)).length).toBeGreaterThanOrEqual(50);
  });
});
