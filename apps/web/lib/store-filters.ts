/**
 * Store listing filter/sort predicate.
 *
 * S-04 (prod sweep 2026-08-12): every control on /store was decorative. The
 * page is a React Server Component (it exports `metadata`, no 'use client'),
 * so the search `<input>` had no value/onChange, both `<select>`s had no
 * value/onChange, the category pills had no onClick, and the active pill was
 * hardcoded to `i === 0`. A shopper could not sort, filter or search the
 * catalogue under any circumstance — the UI pretended to work.
 *
 * The state now lives in the URL, so the server component can do the filtering
 * (and the result is shareable + crawlable). This module is the pure core.
 */

/**
 * LEG-17: 'rating-desc' is gone from this union.
 *
 * The star average and review tally it sorted on were fabricated on BOTH
 * catalogue paths — 24 seed rows hardcoded 4.4-4.9 with 145-2,100 reviews
 * each, and lib/medusa gave every real product 4.5 stars from zero reviews.
 * Removing the star from the product card while leaving a "Rating: High to
 * Low" control in place would not have fixed anything: the invented number
 * would still decide what a shopper sees first, it would just stop being
 * visible enough to challenge. Both fields are now null at the source, so
 * there is nothing left to order by. Restore the option when the grid is
 * joined to the `Review` table in apps/api.
 */
export type StoreSort = 'popular' | 'price-asc' | 'price-desc' | 'newest';
export type StorePriceBand = 'any' | 'under-500' | '500-1000' | '1000-2500' | 'above-2500';

export interface StoreFilters {
  q: string;
  category: string;
  price: StorePriceBand;
  sort: StoreSort;
  freeDelivery: boolean;
}

export const DEFAULT_STORE_FILTERS: StoreFilters = {
  q: '',
  category: 'all',
  price: 'any',
  sort: 'popular',
  freeDelivery: false,
};

const SORTS: StoreSort[] = ['popular', 'price-asc', 'price-desc', 'newest'];
const BANDS: StorePriceBand[] = ['any', 'under-500', '500-1000', '1000-2500', 'above-2500'];

export const PRICE_BAND_LABEL: Record<StorePriceBand, string> = {
  any: 'Any Price',
  'under-500': 'Under ₹500',
  '500-1000': '₹500 - ₹1,000',
  '1000-2500': '₹1,000 - ₹2,500',
  'above-2500': 'Above ₹2,500',
};

export const SORT_LABEL: Record<StoreSort, string> = {
  popular: 'Sort: Popular',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  newest: 'Newest First',
};

/** Parse (and sanitise) filters out of a Next `searchParams` object. */
export function parseStoreFilters(
  sp: Record<string, string | string[] | undefined> | undefined,
): StoreFilters {
  const one = (key: string): string => {
    const v = sp?.[key];
    return (Array.isArray(v) ? v[0] : v) ?? '';
  };
  const sort = one('sort') as StoreSort;
  const price = one('price') as StorePriceBand;
  return {
    q: one('q').slice(0, 80),
    category: one('category') || 'all',
    price: BANDS.includes(price) ? price : 'any',
    sort: SORTS.includes(sort) ? sort : 'popular',
    // A bookmarked ?rating=4plus or ?sort=rating-desc URL from before LEG-17
    // degrades to the unfiltered grid rather than 404ing: `SORTS.includes`
    // already rejects the dead sort, and the dead `rating` param is simply not
    // read.
    freeDelivery: one('delivery') === 'free',
  };
}

function inBand(price: number, band: StorePriceBand): boolean {
  switch (band) {
    case 'under-500':
      return price < 500;
    case '500-1000':
      return price >= 500 && price <= 1000;
    case '1000-2500':
      return price > 1000 && price <= 2500;
    case 'above-2500':
      return price > 2500;
    default:
      return true;
  }
}

export interface FilterableProduct {
  title: string;
  description?: string;
  category?: string;
  collection?: string;
  price: number;
  freeDelivery?: boolean;
  tag?: string | null;
}

export function filterAndSortProducts<T extends FilterableProduct>(
  products: T[],
  filters: StoreFilters,
): T[] {
  const q = filters.q.trim().toLowerCase();
  const out = products.filter((p) => {
    if (filters.category !== 'all' && p.collection !== filters.category) return false;
    if (!inBand(p.price, filters.price)) return false;
    if (filters.freeDelivery && !p.freeDelivery) return false;
    if (q) {
      const haystack = `${p.title} ${p.description ?? ''} ${p.category ?? ''} ${p.tag ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  switch (filters.sort) {
    case 'price-asc':
      return out.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return out.sort((a, b) => b.price - a.price);
    case 'newest':
      // No createdAt on the catalogue — newest is the reverse of listing order,
      // which is the order products were added. Honest about what it can do.
      return out.reverse();
    default:
      // LEG-17: "Popular" used to be `reviewCount` descending. That made the
      // INVENTED review tally the default ordering of the whole shelf — the
      // ranking every first-time visitor saw, without touching a control.
      // Until there is a real popularity signal (orders placed, or the
      // `Review` table), popular is curator order: the catalogue is authored
      // in a deliberate sequence, which is an honest editorial choice rather
      // than a fabricated measurement.
      return out;
  }
}

/** Build the querystring for a filter set, omitting defaults. */
export function buildStoreQuery(filters: StoreFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.price !== 'any') params.set('price', filters.price);
  if (filters.sort !== 'popular') params.set('sort', filters.sort);
  if (filters.freeDelivery) params.set('delivery', 'free');
  const s = params.toString();
  return s ? `?${s}` : '';
}
