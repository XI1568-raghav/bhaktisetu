import { describe, it, expect } from 'vitest';
import { CATEGORY_TREE, type CategoryItem } from '../lib/category-tree';
import { TIRTHAS } from '../lib/tirthas';
import { dedupeTirthas } from '../lib/tirtha-slug';
import { FESTIVALS } from '../lib/festivals';
import { VRATS } from '../lib/vrats';

// CI-14 (second pass, 2026-08-23) — __tests__/category-tree-counts.ci12-ci14.test.ts
// pinned the two counts the finding named (/upanishads and /jyotirlinga) but
// nothing pinned the rest of the nav. Auditing the whole of lib/category-tree.ts
// against the datasets turned up three more of the SAME defect, each on a route
// whose index page derives its own heading from the array at runtime, so the nav
// and the page it links to disagreed on screen:
//
//   /tirth     nav said "62 single-destination pilgrim guides"
//              app/tirth/page.tsx renders dedupeTirthas(TIRTHAS) — 72
//   /festival  nav said "30 Hindu festivals" and "Festivals (30)"
//              app/festival/page.tsx renders FESTIVALS.length — 56
//   /vrat      nav said "Vrat (10)"
//              app/vrat/page.tsx renders every VRATS record — 72 distinct guides
//
// Counts stay LITERALS in lib/category-tree.ts on purpose: that module is pulled
// into four 'use client' nav components, so importing these arrays there to
// derive the numbers would ship the whole encyclopedia into every route's client
// bundle. This test is the substitute — it reads the RUNTIME arrays and the
// RUNTIME nav entries, so a dataset that grows or shrinks fails here rather than
// shipping a stale number on every page of the site.

const ITEMS: CategoryItem[] = CATEGORY_TREE.flatMap((c) => [
  ...c.items,
  ...(c.subGroups ?? []).flatMap((g) => g.items),
]);

/** Every nav entry pointing at a route — /festival has two. */
function entries(href: string): CategoryItem[] {
  const found = ITEMS.filter((i) => i.href === href);
  expect(found.length, `no nav entry for ${href}`).toBeGreaterThan(0);
  return found;
}

/** Standalone integers in an entry's visible text, label and description alike. */
function numbersIn(item: CategoryItem): number[] {
  const text = `${item.label} ${item.description ?? ''}`;
  return [...text.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
}

/**
 * Distinct URLs a route publishes. A duplicate slug is a card that links to
 * another record's page, so it is not a guide the reader can reach — the honest
 * number for a nav label is the count of reachable pages. Using it also keeps
 * this test stable while CI-02 removes duplicates elsewhere in the tree.
 */
function published(rows: readonly { slug: string }[]): number {
  return new Set(rows.map((r) => r.slug)).size;
}

const ROUTES: { href: string; count: number; what: string }[] = [
  { href: '/tirth', count: dedupeTirthas(TIRTHAS).length, what: 'tirtha guides' },
  { href: '/festival', count: published(FESTIVALS), what: 'festivals' },
  { href: '/vrat', count: published(VRATS), what: 'vrat guides' },
];

describe('CI-14 — every dataset-backed count in the global nav matches its dataset', () => {
  for (const { href, count, what } of ROUTES) {
    it(`the nav entry for ${href} states no number other than the ${count} ${what} it links to`, () => {
      for (const item of entries(href)) {
        for (const n of numbersIn(item)) {
          expect(
            n,
            `nav entry "${item.label}" / "${item.description ?? ''}" states ${n}, but ${href} publishes ${count} ${what}`,
          ).toBe(count);
        }
      }
    });

    it(`the nav entry for ${href} states the count at all`, () => {
      const stated = entries(href).flatMap(numbersIn);
      expect(stated, `no count in the nav entry for ${href}`).toContain(count);
    });
  }

  it('the counts these assertions rest on are the ones the index pages render', () => {
    // Guards the test itself: if a deduper or dataset is swapped out, the
    // numbers above must move with it rather than silently going vacuous.
    expect(TIRTHAS.length).toBeGreaterThan(dedupeTirthas(TIRTHAS).length);
    expect(dedupeTirthas(TIRTHAS).length).toBe(72);
    expect(FESTIVALS.length).toBe(56);
    expect(published(FESTIVALS)).toBe(FESTIVALS.length);
    expect(published(VRATS)).toBe(72);
  });
});
