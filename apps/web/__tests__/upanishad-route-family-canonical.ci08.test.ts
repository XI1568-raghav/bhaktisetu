import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  UPANISHADS,
  VED_ARTICLE_TO_UPANISHAD,
  canonicalUpanishadUrl,
} from '../lib/upanishads';

// CI-08 — the same Upanishad is published twice, under two route families that
// each declare themselves canonical: the curated /upanishads/[slug] pages and
// the MDX articles under content/ved served at /ved/[slug]. Fourteen subjects
// overlap. Twelve collide on the identical slug; the other two differ only in
// transliteration (ishavasya/isha, shvetashvatara/svetasvatara) — and
// ishavasya-upanishad means /ved publishes Isha twice on its own.
//
// The curated family is the richer one (mantra counts, mahavakyas, famous
// verse, key concepts), so it is the survivor. This table is the half that
// needs domain knowledge; app/ved/[slug]/page.tsx still has to consume it.

const VED_DIR = path.resolve(__dirname, '../content/ved');

function vedUpanishadSlugs(): string[] {
  return fs
    .readdirSync(VED_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
    .filter((s) => s.includes('upanishad'));
}

describe('CI-08 — one Upanishad, one canonical URL', () => {
  it('the duplication is real: /ved republishes fourteen Upanishads', () => {
    expect(vedUpanishadSlugs()).toHaveLength(14);
  });

  it('every /ved Upanishad article is accounted for', () => {
    const mapped = new Set(Object.keys(VED_ARTICLE_TO_UPANISHAD));
    for (const slug of vedUpanishadSlugs()) {
      expect(mapped.has(slug), `${slug} has no canonical target`).toBe(true);
    }
    expect(mapped.size).toBe(14);
  });

  it('every target is a real /upanishads page', () => {
    const slugs = new Set(UPANISHADS.map((u) => u.slug));
    for (const [from, to] of Object.entries(VED_ARTICLE_TO_UPANISHAD)) {
      expect(slugs.has(to), `${from} -> ${to} points at nothing`).toBe(true);
    }
  });

  it('collapses the two transliteration variants onto one page each', () => {
    expect(VED_ARTICLE_TO_UPANISHAD['ishavasya-upanishad']).toBe('isha-upanishad');
    expect(VED_ARTICLE_TO_UPANISHAD['shvetashvatara-upanishad']).toBe('svetasvatara-upanishad');
    // /ved's own two Isha articles land on the same canonical URL.
    expect(canonicalUpanishadUrl('ishavasya-upanishad')).toBe(
      canonicalUpanishadUrl('isha-upanishad'),
    );
  });

  it('returns a full path, and nothing for a non-Upanishad article', () => {
    expect(canonicalUpanishadUrl('katha-upanishad')).toBe('/upanishads/katha-upanishad');
    expect(canonicalUpanishadUrl('rigveda-overview')).toBeUndefined();
  });
});
