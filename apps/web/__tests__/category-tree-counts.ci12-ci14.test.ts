import { describe, it, expect } from 'vitest';
import { CATEGORY_TREE, type CategoryItem } from '../lib/category-tree';
import { UPANISHADS, PRINCIPAL_UPANISHAD_SLUGS } from '../lib/upanishads';
import { JYOTIRLINGAS } from '../lib/jyotirlingas';

// CI-14 / CI-12 — the global nav is rendered on every page, so a wrong number
// in a CategoryItem description is the most-seen wrong number on the site.
//   • /upanishads was advertised as "108 Upanishads" while the catalogue holds
//     forty-eight and names ten principal.
//   • /jyotirlinga was advertised as "12 self-manifested Shiva lingas" while
//     only nine of the twelve carry `swayambhu: true`.
//
// lib/category-tree.ts is imported by four `'use client'` nav components
// (CategoryNav, CategoryMegaMenu, MobileNavV2 and, transitively,
// LibraryMegaPanel). Importing UPANISHADS there to derive the number the way
// app/upanishads/page.tsx does would push 111 KB of encyclopedia prose — plus
// 22 KB of jyotirlingas.ts — into the client bundle of every route, to render
// two integers. So the numbers stay literals in the data file and this test is
// what keeps them honest: it reads the RUNTIME arrays and the RUNTIME nav
// entries, so a dataset that grows or shrinks fails here rather than shipping
// a stale count.

const ITEMS: CategoryItem[] = CATEGORY_TREE.flatMap((c) => [
  ...c.items,
  ...(c.subGroups ?? []).flatMap((g) => g.items),
]);

function item(href: string): CategoryItem {
  const found = ITEMS.filter((i) => i.href === href);
  expect(found, `no nav entry for ${href}`).toHaveLength(1);
  return found[0]!;
}

const SWAYAMBHU_COUNT = JYOTIRLINGAS.filter((j) => j.swayambhu).length;

describe('CI-14 — the nav entry for /upanishads counts the catalogue it links to', () => {
  it('does not repeat the retired "108 Upanishads" claim', () => {
    expect(item('/upanishads').description).not.toMatch(/108/);
  });

  it('states the real catalogue size and the real principal count', () => {
    const { description } = item('/upanishads');
    expect(description).toContain(`${UPANISHADS.length} Upanishads`);
    expect(description).toContain(`${PRINCIPAL_UPANISHAD_SLUGS.length} principal`);
  });

  it('the numbers it states are the ones the dataset actually holds', () => {
    expect(UPANISHADS.length).toBe(48);
    expect(PRINCIPAL_UPANISHAD_SLUGS).toHaveLength(10);
  });
});

describe('CI-12 — the nav entry for /jyotirlinga matches the swayambhu flags', () => {
  it('the data really is split, not unanimous', () => {
    expect(SWAYAMBHU_COUNT).toBeGreaterThan(0);
    expect(SWAYAMBHU_COUNT).toBeLessThan(JYOTIRLINGAS.length);
  });

  it('never calls all twelve self-manifested', () => {
    const { description } = item('/jyotirlinga');
    expect(description).not.toMatch(
      new RegExp(`${JYOTIRLINGAS.length}\\s+s[vw]ayambhu|${JYOTIRLINGAS.length}\\s+self[\\s-]manifest`, 'i'),
    );
  });

  it('states the number the /jyotirlinga badges actually show', () => {
    const { description } = item('/jyotirlinga');
    expect(description).toContain(String(SWAYAMBHU_COUNT));
    expect(description).toContain(String(JYOTIRLINGAS.length));
  });
});
