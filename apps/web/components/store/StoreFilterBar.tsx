'use client';

/**
 * S-04 (prod sweep 2026-08-12): the /store filter bar was decorative markup on
 * a server component — the search input had no value/onChange, both selects had
 * no value/onChange, category pills had no onClick, and the active pill was
 * hardcoded to `i === 0`. This is the interactive half: it owns nothing but the
 * search text (debounced), pushing every change into the URL so the server
 * component can do the actual filtering and the result stays shareable.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, Truck, X } from 'lucide-react';
import {
  buildStoreQuery,
  PRICE_BAND_LABEL,
  SORT_LABEL,
  type StoreFilters,
  type StorePriceBand,
  type StoreSort,
} from '../../lib/store-filters';

interface Category {
  name: string;
  slug: string;
  count: number;
}

interface Props {
  filters: StoreFilters;
  categories: Category[];
  resultCount: number;
  searchPlaceholder: string;
}

export default function StoreFilterBar({
  filters,
  categories,
  resultCount,
  searchPlaceholder,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync when the URL changes underneath us (back button,
  // "clear filters").
  useEffect(() => {
    setQuery(filters.q);
  }, [filters.q]);

  function go(next: Partial<StoreFilters>) {
    router.push(`/store${buildStoreQuery({ ...filters, ...next })}`, { scroll: false });
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => go({ q: value }), 300);
  }

  const isFiltered =
    filters.q.trim() !== '' ||
    filters.category !== 'all' ||
    filters.price !== 'any' ||
    filters.sort !== 'popular' ||
    filters.freeDelivery;

  return (
    <>
      {/* Search */}
      <div className="mt-8 max-w-2xl">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (debounce.current) clearTimeout(debounce.current);
            go({ q: query });
          }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="search"
            name="q"
            aria-label={searchPlaceholder}
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[var(--color-border)] bg-white text-surface-800 placeholder:text-surface-500 shadow-warm-sm focus:outline-none focus:ring-2 focus:ring-saffron-300"
          />
        </form>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide mt-8">
        {categories.map((cat) => {
          const active = filters.category === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              aria-pressed={active}
              onClick={() => go({ category: cat.slug })}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-saffron-600 text-white'
                  : 'bg-white text-surface-600 border border-surface-200 hover:border-saffron-300 hover:text-saffron-600'
              }`}
            >
              {cat.name}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-saffron-600 text-saffron-100' : 'bg-surface-100 text-surface-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative">
          <select
            aria-label="Sort products"
            value={filters.sort}
            onChange={(e) => go({ sort: e.target.value as StoreSort })}
            className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
          >
            {(Object.keys(SORT_LABEL) as StoreSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            aria-label="Filter by price"
            value={filters.price}
            onChange={(e) => go({ price: e.target.value as StorePriceBand })}
            className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
          >
            {(Object.keys(PRICE_BAND_LABEL) as StorePriceBand[]).map((b) => (
              <option key={b} value={b}>
                {PRICE_BAND_LABEL[b]}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>

        <button
          type="button"
          aria-pressed={filters.freeDelivery}
          onClick={() => go({ freeDelivery: !filters.freeDelivery })}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
            filters.freeDelivery
              ? 'bg-saffron-600 text-white border-saffron-600'
              : 'bg-white text-surface-600 border-surface-200 hover:border-saffron-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          Free Delivery
        </button>

        {/* LEG-17: a "4+ Rating" toggle stood here, and the sort <select>
            above still lists every SORT_LABEL key — which is why the
            "Rating: High to Low" option disappeared from it the moment that
            key left lib/store-filters. Both controls filtered and ordered the
            grid on a star average that was hardcoded on all 24 seed rows and
            synthesised as 4.5-from-zero-reviews for every real product. A
            control that acts on an invented number is not a smaller problem
            than printing it; it is the same number, steering the shelf out of
            sight. */}

        {isFiltered && (
          <button
            type="button"
            onClick={() => router.push('/store', { scroll: false })}
            className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-saffron-600"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}

        <span className="text-sm text-surface-500 ml-auto" aria-live="polite">
          <span className="font-semibold text-surface-600">{resultCount}</span> products
        </span>
      </div>
    </>
  );
}
