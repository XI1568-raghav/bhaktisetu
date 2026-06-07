'use client';

import Link from 'next/link';
import type { AccentColor, Category } from '../lib/category-tree';
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
 * Desktop mega-menu panel under a CategoryNav trigger. Pure presentation.
 *
 * Library variant: detects `category.subGroups` → renders 4-col LibraryMegaPanel.
 * Other categories: 2-col items grid + optional featured tile, color per accent.
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
        <p className={`text-[11px] font-semibold uppercase tracking-widest ${a.eyebrow}`}>
          {category.label}
        </p>
        <p className="mt-1 text-sm text-surface-500">{category.tagline}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {category.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            role="menuitem"
            onClick={onItemClick}
            className={`group flex flex-col gap-0.5 px-3 py-3 rounded-lg ${a.itemHoverBg} focus:outline-none focus-visible:ring-2 ${a.focusRing} transition-colors`}
          >
            <span className={`text-sm font-semibold text-surface-800 ${a.itemHoverText} leading-snug`}>
              {item.label}
            </span>
            <span className="text-xs text-surface-500 leading-snug">
              {item.description}
            </span>
          </Link>
        ))}
      </div>

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
