import { describe, it, expect } from 'vitest';
import { AARTIS } from '../lib/aartis';
import { CHALISAS } from '../lib/chalisas';
import { CHANTS } from '../lib/chants';
import { DEITIES } from '../lib/deities';
import { FESTIVALS } from '../lib/festivals';
import { MUHURATS } from '../lib/muhurats';
import { SHLOKAS } from '../lib/shlokas';
import { TIRTHAS } from '../lib/tirthas';
import { UPANISHADS } from '../lib/upanishads';
import { VRATS } from '../lib/vrats';
import { CIRCUITS } from '../lib/pilgrimage-circuits';
import { JYOTIRLINGAS } from '../lib/jyotirlingas';

// CI-02 — every one of these arrays backs a `/<route>/[slug]` page whose
// lookup is `arr.find((x) => x.slug === slug)`. A second record carrying an
// already-used slug is therefore UNREACHABLE: it never renders, but it still
// occupies a card on the index grid, so the grid shows two cards pointing at
// one URL with contradictory facts behind them.
//
// This assertion runs against the RUNTIME arrays, not the source text, so it
// cannot be fooled by a comment that happens to mention a slug.

/** Extra records beyond the first for each slug, i.e. the unreachable ones. */
function unreachable(rows: readonly { slug: string }[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const r of rows) {
    if (seen.has(r.slug)) dupes.push(r.slug);
    else seen.add(r.slug);
  }
  return dupes;
}

/**
 * Datasets whose files are owned by this lane. These must stay at zero — a new
 * duplicate here is a test failure, not a silently dropped page.
 */
const OWNED: Record<string, readonly { slug: string }[]> = {
  FESTIVALS,
  TIRTHAS,
  UPANISHADS,
  JYOTIRLINGAS,
};

/**
 * Datasets in files this lane may not edit. Pinned at the count measured on
 * 2026-08-20 so that (a) a NEW duplicate fails immediately and (b) whoever
 * removes one has to lower the number here, which is how the ratchet closes.
 * Every one of these should end at 0.
 */
const RATCHET: Record<string, { rows: readonly { slug: string }[]; extras: number }> = {
  AARTIS: { rows: AARTIS, extras: 5 },
  CHALISAS: { rows: CHALISAS, extras: 7 },
  CHANTS: { rows: CHANTS, extras: 1 },
  DEITIES: { rows: DEITIES, extras: 14 },
  MUHURATS: { rows: MUHURATS, extras: 4 },
  SHLOKAS: { rows: SHLOKAS, extras: 2 },
  VRATS: { rows: VRATS, extras: 9 },
  CIRCUITS: { rows: CIRCUITS, extras: 1 },
};

describe('CI-02 — no encyclopedia record is unreachable behind a duplicate slug', () => {
  for (const [name, rows] of Object.entries(OWNED)) {
    it(`${name} has no duplicate slug`, () => {
      expect(unreachable(rows)).toEqual([]);
    });
  }

  it('every owned dataset renders one card per URL', () => {
    for (const [name, rows] of Object.entries(OWNED)) {
      expect(new Set(rows.map((r) => r.slug)).size, name).toBe(rows.length);
    }
  });

  for (const [name, { rows, extras }] of Object.entries(RATCHET)) {
    it(`${name} carries no MORE than its ${extras} known duplicates`, () => {
      const found = unreachable(rows);
      // Not `toBe` — going DOWN is the goal. Only an increase fails.
      expect(found.length, `${name} duplicates: ${found.join(', ')}`).toBeLessThanOrEqual(extras);
      if (found.length < extras) {
        throw new Error(
          `${name} is now at ${found.length} duplicate slugs (was ${extras}). ` +
            `Lower the RATCHET entry in this file to ${found.length} so it cannot regress.`,
        );
      }
    });
  }
});
