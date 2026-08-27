import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { VED_ARTICLE_TO_UPANISHAD, canonicalUpanishadUrl } from '../lib/upanishads';

// CI-08 (rendering half) — upanishad-route-family-canonical.ci08.test.ts locks
// down the MAPPING (lib/upanishads.ts). Nothing consumed it: every
// /ved/<slug> page still declared itself canonical, so the fourteen Upanishads
// that /upanishads also publishes each shipped two self-canonical URLs.
//
// This file asserts the CONSUMPTION — that app/ved/[slug]/page.tsx's
// generateMetadata actually points an overlapping article at the surviving
// /upanishads page, and leaves every non-overlapping article alone.

const PAGE = path.resolve(__dirname, '../app/ved/[slug]/page.tsx');

type Meta = { alternates?: { canonical?: string | URL | null } };

async function canonicalFor(slug: string): Promise<string> {
  const mod = await import('../app/ved/[slug]/page');
  const meta = (await mod.generateMetadata({
    params: Promise.resolve({ slug }),
  })) as Meta;
  return String(meta.alternates?.canonical ?? '');
}

describe('CI-08 — /ved defers to /upanishads for the fourteen it republishes', () => {
  it('an overlapping article canonicalises to its /upanishads twin', async () => {
    expect(await canonicalFor('katha-upanishad')).toBe(
      'https://darshya.online/upanishads/katha-upanishad',
    );
  });

  it('the two transliteration variants both land on the surviving slug', async () => {
    expect(await canonicalFor('ishavasya-upanishad')).toBe(
      'https://darshya.online/upanishads/isha-upanishad',
    );
    expect(await canonicalFor('shvetashvatara-upanishad')).toBe(
      'https://darshya.online/upanishads/svetasvatara-upanishad',
    );
  });

  it('every mapped /ved article emits the mapped URL, not its own', async () => {
    for (const [from, to] of Object.entries(VED_ARTICLE_TO_UPANISHAD)) {
      const got = await canonicalFor(from);
      expect(got, from).toBe(`https://darshya.online/upanishads/${to}`);
      expect(got, from).not.toBe(`https://darshya.online/ved/${from}`);
    }
  });

  // REWRITTEN 2026-08-28. This case used `rigveda-overview` as its example of
  // "an article nobody else publishes". That was true of the /upanishads
  // family and false of the site: /vedas/rigveda is the same subject, curated
  // and richer, and it is the OTHER half of CI-08 — the four Vedas were
  // duplicated exactly as the fourteen Upanishads were. `rigveda-overview` now
  // defers to /vedas/rigveda (see ved-veda-canonical.ci08.test.ts), so keeping
  // the old expectation would have pinned the bug in place.
  //
  // The case itself is still worth having, so it keeps its meaning and swaps
  // in articles that genuinely have no twin in either family.
  it('a /ved article that no other family publishes still claims itself', async () => {
    for (const slug of ['purusha-sukta', 'aranyakas-overview', 'rigveda-structure']) {
      expect(canonicalUpanishadUrl(slug), slug).toBeUndefined();
      expect(await canonicalFor(slug), slug).toBe(`https://darshya.online/ved/${slug}`);
    }
  });

  it('and the four Vedas now defer to the curated /vedas pages', async () => {
    expect(await canonicalFor('rigveda-overview')).toBe('https://darshya.online/vedas/rigveda');
  });

  it('the page derives the canonical from the helper, not a second copy of the table', () => {
    // Comments stripped first: a mapping described in prose is not a mapping
    // the route uses.
    const src = fs
      .readFileSync(PAGE, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(src).toMatch(/canonicalUpanishadUrl/);
    // A hand-copied slug table in the route would drift from lib/upanishads.ts.
    expect(src).not.toMatch(/svetasvatara-upanishad/);
  });
});
