/**
 * /temples list-control state, as a pure URL <-> filters mapping.
 *
 * LC-12 (prod sweep 2026-08-12): the browser read these params correctly on
 * mount (/temples?deity=Vishnu rendered 9 temples) but never wrote them back,
 * so no filtered view was linkable, bookmarkable or indexable and Back could
 * not undo a filter. Keeping the parse and the build side in ONE module is the
 * point: a param the UI can write but the page cannot read (or the reverse) is
 * exactly the half-shipped contract that produced the bug.
 */

export type DeityTypeFilter = 'All' | 'Shiva' | 'Vishnu' | 'Shakti' | 'Ganesha' | 'Sikh' | 'Other';
export type SortMode = 'popularity' | 'alphabetical' | 'state';

export interface TempleFilters {
  q: string;
  deity: DeityTypeFilter;
  state: string;
  live: boolean;
  sort: SortMode;
}

export const ALL_STATES = 'All States';

export const DEFAULT_TEMPLE_FILTERS: TempleFilters = {
  q: '',
  deity: 'All',
  state: ALL_STATES,
  live: false,
  sort: 'popularity',
};

const DEITY_VALUES: DeityTypeFilter[] = [
  'All',
  'Shiva',
  'Vishnu',
  'Shakti',
  'Ganesha',
  'Sikh',
  'Other',
];
const SORT_VALUES: SortMode[] = ['popularity', 'alphabetical', 'state'];

/** Read filters out of a querystring. Unknown values fall back to the default. */
export function parseTempleFilters(sp: URLSearchParams): TempleFilters {
  const deity = (sp.get('deity') ?? '') as DeityTypeFilter;
  const sort = (sp.get('sort') ?? '') as SortMode;
  return {
    q: (sp.get('q') ?? '').slice(0, 80),
    deity: DEITY_VALUES.includes(deity) ? deity : 'All',
    state: sp.get('state') || ALL_STATES,
    live: sp.get('live') === '1',
    sort: SORT_VALUES.includes(sort) ? sort : 'popularity',
  };
}

/** Build the querystring for a filter set, omitting every default. */
export function buildTempleQuery(f: TempleFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.deity !== 'All') p.set('deity', f.deity);
  if (f.state !== ALL_STATES) p.set('state', f.state);
  if (f.live) p.set('live', '1');
  if (f.sort !== 'popularity') p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/**
 * Whether anything is applied. Sort counts: a page left on "A → Z" is not in
 * its default state, and without this the Clear affordance never appears for a
 * sort-only change (and Clear would leave the sort behind while claiming the
 * filters were reset).
 */
export function hasActiveTempleFilters(f: TempleFilters): boolean {
  return (
    f.q.trim() !== '' ||
    f.deity !== 'All' ||
    f.state !== ALL_STATES ||
    f.live ||
    f.sort !== 'popularity'
  );
}
