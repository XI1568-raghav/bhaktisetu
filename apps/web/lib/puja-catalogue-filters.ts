/**
 * DB-04 / PF-02 (prod sweep 2026-08-12) — the /pujas facets were decorative.
 *
 * Four `<select>` elements and a "Sort: Popularity" button sat in a server
 * component with no `name`, no `value`, no `onChange` and no enclosing form.
 * Driving all 36 options programmatically left the card list byte-identical
 * every time, the URL unchanged, and no network request fired: they could not
 * do anything by construction. "Under ₹500" still showed the ₹3,501 Ram Charit
 * Manas Path, which additionally implies the catalogue has no cheap options
 * when ₹451 Hanuman Chalisa Path is right there.
 *
 * The search box directly above them was already converted to a real GET form
 * on `?q=` (S2C-12). This module is the rest of that pattern: pure functions
 * the server component calls, so the whole facet set stays zero-client-JS and
 * every filtered view is a shareable URL.
 *
 * HONESTY NOTE — the "All Occasions" select is gone rather than wired. Nothing
 * in the catalogue carries an occasion: `PujaType` (apps/web/lib/api.ts) has
 * category, deity, duration and price, and no field any of those ten occasion
 * labels could be matched against. Shipping it inert is the defect; inventing
 * an occasion per puja to keep the control would be worse. It comes back when
 * the data does.
 *
 * Sort by popularity is likewise real: it orders on the completed-booking
 * counts from lib/social-proof (a COUNT over puja_bookings), and pujas with no
 * completions simply keep catalogue order rather than being ranked by a
 * fabricated score.
 *
 * WHY THE CATEGORY/DEITY OPTIONS ARE DERIVED, NOT LISTED. The nine category
 * labels the dead control offered ("Abhishekam", "Havan / Homam", "Path /
 * Paath", …) do not exist in the data at all: GET /pujas/types answers
 * `["planetary","special_occasion","health","prosperity","daily","memorial"]`.
 * Six of its eleven deity labels miss too, because the real rows read "Lord
 * Vishnu (Satyanarayan)" and "Navagraha (Nine Planets)". Hard-coding a prettier
 * list would have swapped one set of options that return nothing for another —
 * verified live on 2026-08-13: /pujas?category=abhishekam and
 * /pujas?deity=lord-vishnu each rendered "Showing 0 of 0 pujas". So the facets
 * are built FROM the catalogue that is about to be rendered: every option that
 * appears has at least one puja behind it, by construction, and the control
 * cannot rot when the catalogue changes.
 */

/** The subset of a catalogue card these functions need. */
export interface FilterablePuja {
  slug: string;
  name: string;
  category: string;
  deity: string;
  temple: string;
  description: string;
  /** Advertised base price in INR — the same number the card renders. */
  price: number;
}

export interface PujaSelectOption {
  /** URL token. Empty string means "no filter". */
  value: string;
  label: string;
}

/** Price bands. `max: null` is open-ended. Bounds are inclusive of `min`,
 *  exclusive of `max`, so the bands tile without overlap. */
export interface PujaPriceOption extends PujaSelectOption {
  min: number;
  max: number | null;
}

export type PujaSort = 'popularity' | 'price-asc' | 'price-desc' | 'name-asc';

/**
 * Turn a raw catalogue value into a URL token. Both sides of a facet go
 * through this, so "Lord Vishnu (Satyanarayan)" and its option token can never
 * disagree.
 */
export function facetToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Human label for a snake_case catalogue value ("special_occasion"). */
function humanise(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface PujaFacets {
  categories: PujaSelectOption[];
  deities: PujaSelectOption[];
}

/**
 * Build the category and deity option lists from the catalogue itself. Options
 * are sorted by how many pujas back them, then alphabetically, so the useful
 * ones are near the top of the dropdown.
 */
export function buildPujaFacets<T extends FilterablePuja>(list: T[]): PujaFacets {
  const collect = (
    values: string[],
    allLabel: string,
    label: (raw: string) => string,
  ): PujaSelectOption[] => {
    const counts = new Map<string, { label: string; n: number }>();
    for (const raw of values) {
      const token = facetToken(raw ?? '');
      if (!token) continue;
      const existing = counts.get(token);
      if (existing) existing.n += 1;
      else counts.set(token, { label: label(raw), n: 1 });
    }
    const options = [...counts.entries()]
      .sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label, 'en'))
      .map(([value, { label: l }]) => ({ value, label: l }));
    return [{ value: '', label: allLabel }, ...options];
  };

  return {
    categories: collect(list.map((p) => p.category), 'All Categories', humanise),
    // Deity values are already display strings in the data.
    deities: collect(list.map((p) => p.deity), 'All Deities', (raw) => raw),
  };
}

export const EMPTY_PUJA_FACETS: PujaFacets = {
  categories: [{ value: '', label: 'All Categories' }],
  deities: [{ value: '', label: 'All Deities' }],
};

export const PUJA_PRICE_OPTIONS: PujaPriceOption[] = [
  { value: '', label: 'Any Price', min: 0, max: null },
  { value: 'under-500', label: 'Under ₹500', min: 0, max: 500 },
  { value: '500-1000', label: '₹500 - ₹1,000', min: 500, max: 1000 },
  { value: '1000-2500', label: '₹1,000 - ₹2,500', min: 1000, max: 2500 },
  { value: '2500-5000', label: '₹2,500 - ₹5,000', min: 2500, max: 5000 },
  { value: 'above-5000', label: 'Above ₹5,000', min: 5000, max: null },
];

export const PUJA_SORT_OPTIONS: { value: PujaSort; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export const DEFAULT_PUJA_SORT: PujaSort = 'popularity';

export interface PujaFilters {
  q: string;
  category: string;
  deity: string;
  price: string;
  sort: PujaSort;
}

export const EMPTY_PUJA_FILTERS: PujaFilters = {
  q: '',
  category: '',
  deity: '',
  price: '',
  sort: DEFAULT_PUJA_SORT,
};

/**
 * Read the facets out of the URL. A token that is not among the options the
 * page is about to render falls back to "no filter" rather than to a
 * zero-result page — a hand-edited, bookmarked or stale link must degrade to
 * the full catalogue, never to a blank grid that looks like an outage.
 *
 * `facets` is what buildPujaFacets() derived from this render's catalogue, so
 * the accepted tokens and the rendered <option> values are the same list by
 * construction. Callers with no catalogue (tests, or an API failure) pass
 * EMPTY_PUJA_FACETS and get no category/deity filter at all.
 */
export function parsePujaFilters(
  sp: {
    q?: string;
    category?: string;
    deity?: string;
    price?: string;
    sort?: string;
  },
  facets: PujaFacets = EMPTY_PUJA_FACETS,
): PujaFilters {
  const pick = (raw: string | undefined, options: PujaSelectOption[]): string => {
    const token = (raw ?? '').trim().toLowerCase();
    return options.some((o) => o.value !== '' && o.value === token) ? token : '';
  };
  const sortToken = (sp.sort ?? '').trim().toLowerCase();
  return {
    q: (sp.q ?? '').trim(),
    category: pick(sp.category, facets.categories),
    deity: pick(sp.deity, facets.deities),
    price: pick(sp.price, PUJA_PRICE_OPTIONS),
    sort: PUJA_SORT_OPTIONS.some((o) => o.value === sortToken)
      ? (sortToken as PujaSort)
      : DEFAULT_PUJA_SORT,
  };
}

/** S2C-12's original free-text match, unchanged in behaviour. */
export function matchesQuery(puja: FilterablePuja, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    puja.name.toLowerCase().includes(needle) ||
    puja.deity.toLowerCase().includes(needle) ||
    puja.category.toLowerCase().includes(needle) ||
    puja.temple.toLowerCase().includes(needle) ||
    puja.description.toLowerCase().includes(needle)
  );
}

export function matchesPrice(price: number, token: string): boolean {
  if (!token) return true;
  const band = PUJA_PRICE_OPTIONS.find((o) => o.value === token);
  if (!band) return true;
  if (price < band.min) return false;
  return band.max === null || price < band.max;
}

export function filterPujas<T extends FilterablePuja>(list: T[], filters: PujaFilters): T[] {
  return list.filter((p) => {
    if (filters.q && !matchesQuery(p, filters.q)) return false;
    if (filters.category && facetToken(p.category) !== filters.category) return false;
    if (filters.deity && facetToken(p.deity) !== filters.deity) return false;
    if (!matchesPrice(p.price, filters.price)) return false;
    return true;
  });
}

/**
 * Stable sort. `completions` is the real per-slug completed-booking count from
 * lib/social-proof; a slug with no entry counts as 0 and therefore keeps its
 * catalogue position relative to other zero-count pujas.
 */
export function sortPujas<T extends FilterablePuja>(
  list: T[],
  sort: PujaSort,
  completions: Record<string, number> = {},
): T[] {
  const out = [...list];
  switch (sort) {
    case 'price-asc':
      out.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      out.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      out.sort((a, b) => a.name.localeCompare(b.name, 'en'));
      break;
    case 'popularity':
      out.sort((a, b) => (completions[b.slug] ?? 0) - (completions[a.slug] ?? 0));
      break;
  }
  return out;
}

export function applyPujaCatalogue<T extends FilterablePuja>(
  list: T[],
  filters: PujaFilters,
  completions: Record<string, number> = {},
): T[] {
  return sortPujas(filterPujas(list, filters), filters.sort, completions);
}

/** True when the view is narrowed at all — drives the "Clear filters" control. */
export function hasActivePujaFilters(filters: PujaFilters): boolean {
  return Boolean(filters.q || filters.category || filters.deity || filters.price);
}

/**
 * Build a /pujas URL from the current facets plus overrides. Used for the sort
 * links and for "Load more", which must never silently drop the active facets
 * — that was the bug the pager already had for `?q=`.
 */
export function pujaCatalogueHref(
  filters: PujaFilters,
  overrides: Partial<PujaFilters> & { page?: number } = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set('q', merged.q);
  if (merged.category) params.set('category', merged.category);
  if (merged.deity) params.set('deity', merged.deity);
  if (merged.price) params.set('price', merged.price);
  if (merged.sort && merged.sort !== DEFAULT_PUJA_SORT) params.set('sort', merged.sort);
  if (overrides.page && overrides.page > 1) params.set('page', String(overrides.page));
  const qs = params.toString();
  return qs ? `/pujas?${qs}` : '/pujas';
}
