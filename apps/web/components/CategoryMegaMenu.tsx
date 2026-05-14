'use client';

import Link from 'next/link';
import type { Category } from '../lib/category-tree';

type Props = {
  category: Category;
  onItemClick?: () => void;
  /** id used by aria-labelledby on the panel for the consuming trigger */
  labelledBy?: string;
};

/**
 * Desktop mega-menu panel rendered under a CategoryNav trigger.
 * Pure presentation — open/close state lives in the parent.
 *
 * Layout: header (label + tagline), 2-col grid of items, optional featured slot.
 * Type-driven hierarchy — no icon column, separation comes from weight + spacing.
 */
export function CategoryMegaMenu({ category, onItemClick, labelledBy }: Props) {
  return (
    <div
      role="menu"
      aria-labelledby={labelledBy}
      className="w-[640px] max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-surface-200/60 shadow-xl shadow-surface-900/10 p-6"
    >
      <div className="mb-5 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-saffron-600">
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
            className="group flex flex-col gap-0.5 px-3 py-3 rounded-lg hover:bg-saffron-50/60 focus:bg-saffron-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-300 transition-colors"
          >
            <span className="text-sm font-semibold text-surface-800 group-hover:text-saffron-700 leading-snug">
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
            className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-saffron-50 hover:bg-saffron-100 transition-colors"
          >
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-saffron-800">
                {category.featured.label}
              </span>
              {category.featured.sublabel && (
                <span className="text-xs text-saffron-700/80 mt-0.5">
                  {category.featured.sublabel}
                </span>
              )}
            </span>
            <span aria-hidden="true" className="text-saffron-700 text-sm">
              →
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default CategoryMegaMenu;
