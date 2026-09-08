import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Category } from '../lib/category-tree';

type Props = {
  category: Category;
  onItemClick?: () => void;
};

/**
 * Library mega-panel.
 *
 * WHAT CHANGED (HOME-IA, 2026-09-04) AND WHY.
 * This used to paint every `subGroups` item: four columns, 41 links, plus four
 * hub links and a browse-all — 46 destinations in a panel measured live at
 * 1120x655px. On a 900px viewport that panel covered two thirds of the screen,
 * including the hero it is supposed to be navigating away from, and it made
 * Library the one panel in the nav that looked nothing like the other four.
 *
 * A mega-menu is not an index. The index already exists and is better:
 * /discover carries 156 links and every one of these destinations bar /shlokas,
 * with the #scriptures / #practice / #saints / #cosmology anchors this panel
 * points at. So the panel now offers what a nav should — the eight most-wanted
 * destinations, four doors into the areas, and one honest way to see the rest —
 * and /discover carries the long tail it was always carrying.
 *
 * 46 links -> 12, in the same 2-column item shape CategoryMegaMenu renders for
 * Worship / Astrology / Yatra / Shop, so Library stops being a visual outlier.
 *
 * `subGroups` IS STILL THE SOURCE OF TRUTH and must not be deleted from
 * lib/category-tree.ts. Its `heading` / `hubHref` / `hubLabel` drive the area
 * doors below, and __tests__/category-tree-counts.ci12-ci14.test.ts asserts
 * over its flattened items that nav labels state counts the datasets actually
 * hold ("Upanishads (48 · 10 principal)", "Jyotirlinga (12 · 9 swayambhu)").
 * Removing the data would delete those guarantees along with the markup.
 */
export function LibraryMegaPanel({ category, onItemClick }: Props) {
  const groups = category.subGroups ?? [];

  /**
   * items[0] is "Discover All Guides" -> /discover, which is also the featured
   * tile and the browse-all strip at the foot of this panel. Three controls,
   * one destination, inside 655px was the clearest symptom of the panel having
   * no editorial layer at all. Filtered here rather than in the tree: `items`
   * is shared with the mobile drawer, where there is no browse-all strip to
   * duplicate.
   */
  const items = category.items.filter((it) => it.href !== '/discover');

  return (
    <div className="w-full rounded-xl bg-white p-5 shadow-xl ring-1 ring-surface-200">
      <div className="mb-3 px-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
          {category.label}
        </p>
        <p className="mt-0.5 text-sm text-surface-500">{category.tagline}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            role="menuitem"
            onClick={onItemClick}
            className="group flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-indigo-50/60 focus:bg-indigo-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 transition-colors"
          >
            <span className="text-sm font-semibold text-surface-800 group-hover:text-indigo-700 leading-snug">
              {it.label}
            </span>
            <span className="text-xs text-surface-500 leading-snug">
              {it.description}
            </span>
          </Link>
        ))}
      </div>

      {/*
       * The four area doors are one line of text links, not a grid of tiles.
       * As tiles they cost two rows and read as four more first-class choices
       * competing with the seven above — which is the overload this panel is
       * being cut to fix. They are a fallback route, so they look like one.
       */}
      {groups.length > 0 && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-surface-100 px-1 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
            By area
          </span>
          {groups.map((g) => (
            <Link
              key={g.hubHref}
              href={g.hubHref}
              role="menuitem"
              onClick={onItemClick}
              className="rounded-sm text-xs text-surface-600 underline-offset-2 hover:text-indigo-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {g.heading}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-surface-100 pt-3">
        <Link
          href="/discover"
          role="menuitem"
          onClick={onItemClick}
          className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <span>Browse all 500+ guides</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default LibraryMegaPanel;
