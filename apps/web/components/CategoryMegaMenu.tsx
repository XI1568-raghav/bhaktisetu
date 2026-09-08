'use client';

import Link from 'next/link';
import type { AccentColor, Category, CategoryItem } from '../lib/category-tree';
import { LibraryMegaPanel } from './LibraryMegaPanel';

type Props = {
  category: Category;
  onItemClick?: () => void;
  /** id used by aria-labelledby on the panel for the consuming trigger */
  labelledBy?: string;
};

type AccentClasses = {
  eyebrow: string;
  itemHoverBg: string;
  itemHoverText: string;
  focusRing: string;
  featuredBg: string;
  featuredHoverBg: string;
  featuredText: string;
  featuredSub: string;
  featuredArrow: string;
};

const ACCENT: Record<AccentColor, AccentClasses> = {
  saffron: {
    eyebrow: 'text-saffron-600',
    itemHoverBg: 'hover:bg-saffron-50/60 focus:bg-saffron-50/60',
    itemHoverText: 'group-hover:text-saffron-700',
    focusRing: 'focus-visible:ring-saffron-300',
    featuredBg: 'bg-saffron-50',
    featuredHoverBg: 'hover:bg-saffron-100',
    featuredText: 'text-saffron-800',
    featuredSub: 'text-saffron-700/80',
    featuredArrow: 'text-saffron-700',
  },
  indigo: {
    eyebrow: 'text-indigo-700',
    itemHoverBg: 'hover:bg-indigo-50/60 focus:bg-indigo-50/60',
    itemHoverText: 'group-hover:text-indigo-700',
    focusRing: 'focus-visible:ring-indigo-300',
    featuredBg: 'bg-indigo-50',
    featuredHoverBg: 'hover:bg-indigo-100',
    featuredText: 'text-indigo-900',
    featuredSub: 'text-indigo-700/80',
    featuredArrow: 'text-indigo-700',
  },
  emerald: {
    eyebrow: 'text-emerald-700',
    itemHoverBg: 'hover:bg-emerald-50/60 focus:bg-emerald-50/60',
    itemHoverText: 'group-hover:text-emerald-700',
    focusRing: 'focus-visible:ring-emerald-300',
    featuredBg: 'bg-emerald-50',
    featuredHoverBg: 'hover:bg-emerald-100',
    featuredText: 'text-emerald-900',
    featuredSub: 'text-emerald-700/80',
    featuredArrow: 'text-emerald-700',
  },
  amber: {
    eyebrow: 'text-amber-700',
    itemHoverBg: 'hover:bg-amber-50/60 focus:bg-amber-50/60',
    itemHoverText: 'group-hover:text-amber-700',
    focusRing: 'focus-visible:ring-amber-300',
    featuredBg: 'bg-amber-50',
    featuredHoverBg: 'hover:bg-amber-100',
    featuredText: 'text-amber-900',
    featuredSub: 'text-amber-700/80',
    featuredArrow: 'text-amber-700',
  },
};

/**
 * One row of the panel. Extracted so the flat grid and the grouped runs render
 * byte-identical markup — the grouping is a caption, never a different item.
 */
function MegaMenuItem({
  item,
  accent,
  onItemClick,
  dense,
  terse,
}: {
  item: CategoryItem;
  accent: AccentClasses;
  onItemClick?: () => void;
  /**
   * Grouped panels carry captions and inter-group gaps that an ungrouped one
   * does not — roughly 120px of extra chrome. Measured at 1440x900 the grouped
   * Astrology panel came to 720px and hit `max-h`, which put a SCROLLBAR INSIDE
   * THE DROPDOWN. That is the precise failure this whole change exists to avoid:
   * AstroTalk's 23-link Calculators panel scrolls internally and is the clearest
   * example in the category of a panel that has lost. Denser rows buy the ~56px
   * that keeps every link visible without one.
   */
  dense?: boolean;
  /** Suppress the description — see CategoryGroup.terse. */
  terse?: boolean;
}) {
  return (
    <Link
      href={item.href}
      prefetch
      role="menuitem"
      onClick={onItemClick}
      // `title` keeps the description reachable on hover even when the row does
      // not paint it, so terse never means the information is gone.
      title={terse ? item.description : undefined}
      className={`group flex flex-col gap-0.5 px-3 ${dense ? 'py-1.5' : 'py-3'} rounded-lg ${accent.itemHoverBg} focus:outline-none focus-visible:ring-2 ${accent.focusRing} transition-colors`}
    >
      <span className={`text-sm font-semibold text-surface-800 ${accent.itemHoverText} leading-snug`}>
        {item.label}
      </span>
      {!terse && (
        <span className="text-xs text-surface-500 leading-snug">{item.description}</span>
      )}
    </Link>
  );
}

/**
 * Desktop mega-menu panel under a CategoryNav trigger. Pure presentation.
 *
 * Library variant: detects `category.subGroups` → renders LibraryMegaPanel.
 * A category with `groups` renders captioned runs; otherwise a flat 2-col
 * items grid. Both plus an optional featured tile, color per accent.
 */
export function CategoryMegaMenu({ category, onItemClick, labelledBy }: Props) {
  if (category.key === 'library' && category.subGroups && category.subGroups.length) {
    return (
      <div role="menu" aria-labelledby={labelledBy}>
        <LibraryMegaPanel category={category} onItemClick={onItemClick} />
      </div>
    );
  }

  const a = ACCENT[category.accentColor ?? 'saffron'];

  return (
    <div
      role="menu"
      aria-labelledby={labelledBy}
      className="w-full bg-white rounded-xl border border-surface-200/60 shadow-xl shadow-surface-900/10 p-6"
    >
      <div className="mb-5 px-1">
        <p className={`text-xs font-semibold uppercase tracking-widest ${a.eyebrow}`}>
          {category.label}
        </p>
        <p className="mt-1 text-sm text-surface-500">{category.tagline}</p>
      </div>

      {/*
       * NAV-IA (2026-09-05): when a category declares `groups`, the same items
       * render in the same 2-column grid with a caption above each run. Nothing
       * is hidden and nothing moves behind an extra click — Astrology's fourteen
       * rows become four scannable runs, so a devotee can skip three quarters of
       * the panel instead of reading it linearly.
       */}
      {category.groups?.length ? (
        <div className="flex flex-col gap-2.5">
          {category.groups.map((group) => (
            <div key={group.heading}>
              <p className="mb-0.5 px-3 text-xs font-semibold uppercase tracking-wider text-surface-400">
                {group.heading}
              </p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {group.items.map((item) => (
                  <MegaMenuItem
                    key={item.href}
                    item={item}
                    accent={a}
                    onItemClick={onItemClick}
                    dense
                    terse={group.terse}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {category.items.map((item) => (
            <MegaMenuItem key={item.href} item={item} accent={a} onItemClick={onItemClick} />
          ))}
        </div>
      )}

      {category.featured && (
        <div className="mt-5 pt-4 border-t border-surface-100">
          <Link
            href={category.featured.href}
            prefetch
            onClick={onItemClick}
            className={`flex items-center justify-between gap-3 px-3 py-3 rounded-lg ${a.featuredBg} ${a.featuredHoverBg} transition-colors`}
          >
            <span className="flex flex-col">
              <span className={`text-sm font-semibold ${a.featuredText}`}>
                {category.featured.label}
              </span>
              {category.featured.sublabel && (
                <span className={`text-xs ${a.featuredSub} mt-0.5`}>
                  {category.featured.sublabel}
                </span>
              )}
            </span>
            <span aria-hidden="true" className={`${a.featuredArrow} text-sm`}>
              →
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default CategoryMegaMenu;
