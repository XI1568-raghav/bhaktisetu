import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TEMPLE_DETAILS } from '../lib/temple-details';
import { canonicalTempleSlug } from '../lib/temple-slug';
import { dedupeTempleCards } from '../lib/temple-grid';

// TD-03 (prod sweep 2026-08-12): /temples rendered 33 cards for 29 distinct
// temples. Ramanathaswamy appeared three times (two curated entries plus the
// api-seeded slug), Meenakshi Madurai twice — and the two Meenakshi cards
// disagreed about whether the temple was streaming, so picking the wrong one
// told a devotee there was no live darshan at a temple that was live.
//
// The alias table that already resolves one-temple-one-URL for the detail
// route (lib/temple-slug.ts, shipped for SEO-06) was not reaching the grid:
// app/temples/(index)/page.tsx carried its own private slug normaliser that only
// stripped a trailing `<place>` segment, so it could not see that
// `tirumala-tirupati` and `tirupati-balaji` are one temple.

const CURATED = Object.values(TEMPLE_DETAILS).map((t) => ({ slug: t.slug, name: t.name }));

/** The `<name>-<city>` slugs the API seeds, from prisma/seed-temples-only.mjs. */
const API_SLUGS = [
  'tirumala-tirupati',
  'meenakshi-madurai',
  'ramanathaswamy-rameshwaram',
  'kashi-vishwanath-varanasi',
  'somnath-gujarat',
  'akshardham-gandhinagar',
  'iskcon-bangalore',
];

describe('TD-03 — one temple, one card', () => {
  it('the curated catalogue alone still carries a duplicate temple', () => {
    // Guards the premise: rameswaram + rameshwaram are two entries for
    // Ramanathaswamy. If someone deletes one, this test says so instead of the
    // dedupe silently becoming a no-op.
    const canon = CURATED.map((c) => canonicalTempleSlug(c.slug));
    expect(new Set(canon).size).toBeLessThan(CURATED.length);
  });

  it('collapses every curated + api slug onto one card per temple', () => {
    const cards = dedupeTempleCards([
      ...CURATED,
      ...API_SLUGS.map((slug) => ({ slug, name: slug })),
    ]);
    const canon = cards.map((c) => canonicalTempleSlug(c.slug));
    expect(new Set(canon).size).toBe(cards.length);
  });

  it('drops the three duplicates the sweep named', () => {
    const cards = dedupeTempleCards([
      ...CURATED,
      ...API_SLUGS.map((slug) => ({ slug, name: slug })),
    ]);
    const slugs = cards.map((c) => c.slug);
    expect(slugs).not.toContain('tirumala-tirupati');
    expect(slugs).not.toContain('meenakshi-madurai');
    expect(slugs).not.toContain('ramanathaswamy-rameshwaram');
    expect(slugs).not.toContain('rameswaram');
    // …and the survivors are the canonical URLs the detail route 308s onto.
    expect(slugs).toContain('tirupati-balaji');
    expect(slugs).toContain('meenakshi-temple');
    expect(slugs).toContain('rameshwaram');
  });

  it('every surviving card is served at its own canonical URL', () => {
    const cards = dedupeTempleCards([
      ...CURATED,
      ...API_SLUGS.map((slug) => ({ slug, name: slug })),
    ]);
    for (const c of cards) {
      expect(canonicalTempleSlug(c.slug), `${c.slug} would 308 away`).toBe(c.slug);
    }
  });

  it('keeps the canonical entry, not whichever alias was declared first', () => {
    // rameswaram is declared BEFORE rameshwaram in temple-details.ts, so a
    // naive first-wins dedupe would serve the alias entry's prose under the
    // canonical URL.
    const cards = dedupeTempleCards([
      { slug: 'rameswaram', name: 'alias entry' },
      { slug: 'rameshwaram', name: 'canonical entry' },
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.name).toBe('canonical entry');
  });

  it('temples-only distinct temples: no duplicate names survive', () => {
    const cards = dedupeTempleCards(CURATED);
    const names = cards.map((c) => c.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('the temples page routes its grid through the shared canonicaliser', () => {
    const src = fs
      .readFileSync(path.join(__dirname, '../app/temples/(index)/page.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/dedupeTempleCards/);
    // The private normaliser that could not see cross-name aliases is gone.
    expect(src).not.toMatch(/const\s+canon\s*=/);
  });
});
