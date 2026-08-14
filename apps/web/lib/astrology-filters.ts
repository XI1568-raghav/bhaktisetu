/**
 * /astrology list-control state, as a pure URL <-> filters mapping.
 *
 * LC-12 (prod sweep 2026-08-12): AstrologyClient read these four params on
 * mount but never wrote them back, so no filtered directory was linkable,
 * bookmarkable or indexable, and Back exited the page instead of clearing the
 * filter. This is the /astrology twin of lib/temple-filters.ts, and it exists
 * for the same reason: keeping the parse and the build side in ONE module makes
 * a param the UI can write but the page cannot read (or the reverse) impossible
 * to ship, which is exactly the half-finished contract that produced the bug.
 *
 * Param names are the ones the old read path already accepted — `filter`,
 * `sort`, `rashi`, `online` — so links shared before this fix keep resolving.
 */

export type AstrologySort = '' | 'rating' | 'price' | 'experience';

export interface AstrologyFilters {
  /** Specialization pill. 'All' is the no-filter state. */
  spec: string;
  sort: AstrologySort;
  /** Rashi selected in the Daily Horoscope picker, or null for none. */
  rashi: string | null;
  online: boolean;
}

export const ASTROLOGY_SPECIALIZATIONS = [
  'All',
  'Vedic Astrology',
  'Tarot Reading',
  'Numerology',
  'Vastu',
  'KP Astrology',
  'Palmistry',
  'Nadi Astrology',
] as const;

export const ASTROLOGY_SORT_VALUES: AstrologySort[] = ['', 'rating', 'price', 'experience'];

export const RASHI_KEYS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

export const DEFAULT_ASTROLOGY_FILTERS: AstrologyFilters = {
  spec: 'All',
  sort: '',
  rashi: null,
  online: false,
};

/**
 * Read filters out of a querystring. Every unknown value falls back to its
 * default — a hand-typed or stale param must not filter the directory down to
 * an empty grid that looks like "no astrologers are available".
 */
export function parseAstrologyFilters(sp: URLSearchParams): AstrologyFilters {
  const spec = sp.get('filter') ?? '';
  const sort = (sp.get('sort') ?? '') as AstrologySort;
  const rashi = (sp.get('rashi') ?? '').toLowerCase();
  return {
    spec: (ASTROLOGY_SPECIALIZATIONS as readonly string[]).includes(spec) ? spec : 'All',
    sort: ASTROLOGY_SORT_VALUES.includes(sort) ? sort : '',
    rashi: (RASHI_KEYS as readonly string[]).includes(rashi) ? rashi : null,
    online: sp.get('online') === '1',
  };
}

/** Build the querystring for a filter set, omitting every default. */
export function buildAstrologyQuery(f: AstrologyFilters): string {
  const p = new URLSearchParams();
  if (f.spec && f.spec !== 'All') p.set('filter', f.spec);
  if (f.sort) p.set('sort', f.sort);
  if (f.online) p.set('online', '1');
  if (f.rashi) p.set('rashi', f.rashi);
  const s = p.toString();
  return s ? `?${s}` : '';
}
