import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Category } from '../lib/category-tree';

type Props = {
  category: Category;
  onItemClick?: () => void;
};

/**
 * 4-column mega-panel for Library. Renders subGroups when present, falls back
 * to flat items grid. Each column has a heading + 6-9 items + "Browse all →"
 * hub link. Bottom strip: "Browse all 500+ guides →" to /discover.
 *
 * Width: 960px desktop (vs 640px default CategoryMegaMenu).
 */
export function LibraryMegaPanel({ category, onItemClick }: Props) {
  const groups = category.subGroups ?? [];

  return (
    <div className="w-[960px] max-w-[calc(100vw-2rem)] rounded-xl bg-white p-6 shadow-xl ring-1 ring-surface-200">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-700">
          {category.label}
        </p>
        <p className="text-sm text-surface-600">{category.tagline}</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {groups.map((g) => (
          <div key={g.heading} className="flex flex-col">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-900">
              {g.heading}
            </h3>
            <ul className="flex-1 space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onItemClick}
                    className="block rounded-md px-2 py-1.5 text-[13px] text-surface-700 hover:bg-indigo-50 hover:text-indigo-900"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={g.hubHref}
              onClick={onItemClick}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
            >
              {g.hubLabel}
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-surface-100 pt-3">
        <Link
          href="/discover"
          onClick={onItemClick}
          className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900 hover:bg-indigo-100"
        >
          <span>Browse all 500+ guides</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default LibraryMegaPanel;
