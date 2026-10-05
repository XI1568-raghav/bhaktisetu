'use client';

import Link from 'next/link';
// DU-03: the one primary-CTA recipe. Layout-only extras in the third slot —
// never h-*, px-*, py-* or rounded-*, which is the invariant every call site holds.
import { buttonClass } from '../ui/button-recipe';
import { H1 } from '../ui/heading-recipe';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
 MapPin,
 Star,
 Video,
 Search,
 Heart,
 Users,
 Shield,
 Flame,
 Filter,
 X,
} from 'lucide-react';
import { getTempleHero, getDeityImage, remoteImage, remoteSrcSet, IMG_W } from '../../lib/images';
import {
 ALL_STATES,
 DEFAULT_TEMPLE_FILTERS,
 buildTempleQuery,
 hasActiveTempleFilters,
 parseTempleFilters,
 type DeityTypeFilter,
 type SortMode,
 type TempleFilters,
} from '../../lib/temple-filters';

export type { DeityTypeFilter, SortMode };

export interface TempleCardData {
 slug: string;
 name: string;
 city: string;
 state: string;
 tradition: string;
 deityPrimary: string;
 deityType: DeityTypeFilter;
 description: string;
 isVerified: boolean;
 trustScore: number;
 liveDarshanEnabled: boolean;
 viewers: number;
 isJyotirlinga: boolean;
 isShaktiPeetha: boolean;
 isDivyaDesam: boolean;
 popularity: number;
 hasRichDetail: boolean;
 imageUrl: string | null;
}

function deityFallbackKey(deityType: DeityTypeFilter): string {
 switch (deityType) {
  case 'Shiva': return 'lord-shiva';
  case 'Vishnu': return 'lord-vishnu';
  case 'Shakti': return 'goddess-durga';
  case 'Ganesha': return 'lord-ganesha';
  default: return 'lord-shiva';
 }
}

/**
 * Base URL for a temple card. `imageUrl` comes off the API row and can be a
 * raw Wikimedia original, so callers must resize it before it reaches an
 * <img>. Returned unresized here so remoteSrcSet can build every candidate
 * from one source.
 */
function templeCardImage(temple: TempleCardData): string {
  return (
    temple.imageUrl ??
    getTempleHero(temple.slug, IMG_W.WIDE) ??
    getDeityImage(deityFallbackKey(temple.deityType), 'portrait', IMG_W.WIDE)
  );
}

const DEITY_FILTERS: { value: DeityTypeFilter; label: string }[] = [
 { value: 'All', label: 'All Deities' },
 { value: 'Shiva', label: 'Lord Shiva' },
 { value: 'Vishnu', label: 'Lord Vishnu' },
 { value: 'Shakti', label: 'Devi / Shakti' },
 { value: 'Ganesha', label: 'Lord Ganesha' },
 { value: 'Sikh', label: 'Sikh' },
];

export function TemplesBrowser({
 temples,
 total: totalProp,
}: {
 temples: TempleCardData[];
 total: number;
}) {
 // The count line divides a subset of `temples` by `total`, so a total below
 // `temples.length` is arithmetically impossible on screen — it renders as
 // "Showing 33 of 22 temples". The caller is where that gets decided (see the
 // note in app/temples/page.tsx); this floor just makes the contradiction
 // unreachable from here regardless of what a caller passes.
 const total = Math.max(totalProp, temples.length);

 const searchParams = useSearchParams();

 // LC-12: the URL is the shareable copy of this state, and it used to never be
 // written. The old effect called `router.replace()`, which in the App Router
 // is a NAVIGATION: every chip click and every debounced keystroke fired
 // `GET /temples?…&_rsc=…`, re-rendering the server component behind the
 // Suspense boundary — including its `getTemples()` call — and the address bar
 // only moved once that round trip committed. On a cold or wedged API (Render
 // free tier spins down) it never committed, so filtering "worked" on screen
 // while the URL sat at /temples forever. `replace` also writes no history
 // entry, so Back could not undo a filter.
 //
 // Every one of these filters runs client-side over an array we already hold,
 // so the server has nothing to contribute. The native History API — which the
 // App Router has synced with usePathname/useSearchParams since 14.1 — writes
 // the URL with no request at all.
 const [filters, setFilters] = useState<TempleFilters>(() =>
  parseTempleFilters(new URLSearchParams(searchParams?.toString() ?? ''))
 );
 // Raw text in the box. `filters.q` is the debounced, committed copy that the
 // filtering and the URL both read, so typing doesn't re-filter 200+ temples
 // (or rewrite the URL) on every keystroke.
 const [search, setSearch] = useState(filters.q);

 // Mirror for `commit`, which must merge onto the freshest filters without
 // taking them as a dependency (and without doing history side effects inside
 // a setState updater, which React re-invokes).
 const filtersRef = useRef(filters);

 const commit = useCallback((next: Partial<TempleFilters>, mode: 'push' | 'replace' = 'push') => {
  const merged = { ...filtersRef.current, ...next };
  filtersRef.current = merged;
  setFilters(merged);
  if (typeof window === 'undefined') return;
  const url = `${window.location.pathname}${buildTempleQuery(merged)}`;
  if (url === `${window.location.pathname}${window.location.search}`) return;
  // push for the discrete controls (Back undoes one filter); replace for the
  // debounced search box, so typing doesn't bury the page under one history
  // entry per keystroke.
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
 }, []);

 // 200ms debounce: raw input -> committed filter + URL.
 useEffect(() => {
  if (search === filters.q) return;
  const id = setTimeout(() => commit({ q: search }, 'replace'), 200);
  return () => clearTimeout(id);
 }, [search, filters.q, commit]);

 // Back/Forward: re-read the URL so the LIST reverts, not just the address bar.
 useEffect(() => {
  const onPop = () => {
   const next = parseTempleFilters(new URLSearchParams(window.location.search));
   filtersRef.current = next;
   setFilters(next);
   setSearch(next.q);
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
 }, []);

 const { deity: deityType, state, live: liveOnly, sort } = filters;
 const debouncedSearch = filters.q;

 // Derive state list from data
 const states = useMemo(() => {
 const uniq = Array.from(new Set(temples.map((t) => t.state).filter(Boolean))).sort();
 return [ALL_STATES, ...uniq];
 }, [temples]);

 const filtered = useMemo(() => {
 const q = debouncedSearch.trim().toLowerCase();
 const list = temples.filter((t) => {
 if (deityType !== 'All' && t.deityType !== deityType) return false;
 if (state !== ALL_STATES && t.state !== state) return false;
 if (liveOnly && !t.liveDarshanEnabled) return false;
 if (q) {
 const hay = `${t.name} ${t.city} ${t.state} ${t.deityPrimary}`.toLowerCase();
 if (!hay.includes(q)) return false;
 }
 return true;
 });

 if (sort === 'alphabetical') {
 list.sort((a, b) => a.name.localeCompare(b.name));
 } else if (sort === 'state') {
 list.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
 } else {
 list.sort((a, b) => b.popularity - a.popularity);
 }
 return list;
 }, [temples, debouncedSearch, deityType, state, liveOnly, sort]);

 const hasActiveFilters = hasActiveTempleFilters(filters) || search.trim() !== '';

 const resetFilters = () => {
 setSearch('');
 commit(DEFAULT_TEMPLE_FILTERS);
 };

 return (
 <div className="min-h-[100dvh] bg-[color:var(--color-bg,#fbf7f1)]">
 {/* Hero */}
 <section className="bg-[#ede9e3] py-12 md:py-16">
 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
 <h1 className={`${H1.catalogue} mb-3`}>
 Sacred Temples of India
 </h1>
 <p className="prose-lead max-w-2xl text-surface-500">
 Explore verified Jyotirlingas, Shakti Peethas and Divya Desams. Watch live darshan,
 book pujas with video proof, and plan your pilgrimage.
 </p>

 <div className="mt-8 max-w-2xl">
 <div className="relative">
 <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by temple name, city or deity..."
 className="w-full rounded-lg border border-[var(--color-border)] bg-white py-3.5 pl-12 pr-12 text-surface-800 shadow-warm-sm placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 {search && (
 <button
 type="button"
 onClick={() => {
  setSearch('');
  commit({ q: '' }, 'replace');
 }}
 className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-surface-400 hover:bg-surface-100"
 aria-label="Clear search"
 >
 <X className="h-4 w-4" />
 </button>
 )}
 </div>
 </div>
 </div>
 </section>

 <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
 {/* Filter Bar */}
 <div className="mb-6 flex flex-wrap items-center gap-3">
 <div className="flex items-center gap-1.5 text-sm font-medium text-surface-600">
 <Filter className="h-4 w-4" /> Filters:
 </div>

 {/* Deity Filter Pills */}
 <div className="flex flex-wrap gap-2">
 {DEITY_FILTERS.map((f) => (
 <button
 key={f.value}
 type="button"
 aria-pressed={deityType === f.value}
 onClick={() => commit({ deity: f.value })}
 className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
 deityType === f.value
 ? 'border-saffron-600 bg-saffron-600 text-white'
 : 'border-[var(--color-border)] bg-white text-surface-600 hover:border-saffron-300'
 }`}
 >
 {f.label}
 </button>
 ))}
 </div>

 {/* State dropdown */}
 <select
 aria-label="Filter by state"
 value={state}
 onChange={(e) => commit({ state: e.target.value })}
 className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 >
 {states.map((s) => (
 <option key={s} value={s}>{s}</option>
 ))}
 </select>

 {/* Sort */}
 <select
 aria-label="Sort temples"
 value={sort}
 onChange={(e) => commit({ sort: e.target.value as SortMode })}
 className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 >
 <option value="popularity">Most Popular</option>
 <option value="alphabetical">A → Z</option>
 <option value="state">By State</option>
 </select>

 {/* Live toggle */}
 <button
 type="button"
 aria-pressed={liveOnly}
 onClick={() => commit({ live: !liveOnly })}
 className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
 liveOnly
 ? 'border-red-300 bg-red-50 text-red-700'
 : 'border-[var(--color-border)] bg-white text-surface-600 hover:border-saffron-300'
 }`}
 >
 <Video className="h-4 w-4 text-red-500" /> Live Darshan
 </button>

 {hasActiveFilters && (
 <button
 type="button"
 onClick={resetFilters}
 className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-surface-500 hover:border-saffron-300 hover:text-saffron-700"
 >
 <X className="h-4 w-4" /> Clear
 </button>
 )}
 </div>

 {/* Result count */}
 <p className="mb-6 text-sm text-surface-500">
 Showing <span className="font-semibold text-surface-700">{filtered.length}</span>
 {filtered.length !== total && (
 <> of <span className="font-semibold text-surface-700">{total}</span></>
 )}{' '}
 temple{filtered.length !== 1 ? 's' : ''}
 </p>

 {/* Empty state */}
 {filtered.length === 0 && (
 <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
 <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-50">
 <Search className="h-5 w-5 text-saffron-600" />
 </div>
 <div className="font-medium text-surface-700">No temples match your filters</div>
 <p className="mt-1 text-sm text-surface-500">Try a different search or clear filters.</p>
 <button
 type="button"
 onClick={resetFilters}
 className={buttonClass('primary', 'md', 'mt-4')}
 >
 Clear all filters
 </button>
 </div>
 )}

 {/* Temple Grid
   DU-08 / A11Y-15: the level sequence was h1 followed by 21 consecutive h3
   card titles with no h2 anywhere. Screen-reader users navigating by
   heading got a flat list of 21 same-level items and no way to jump past
   the grid. The label is visually hidden - the hero above already reads
   "Sacred Temples of India" on screen. */}
 <section aria-labelledby="temples-all">
 <h2 id="temples-all" className="sr-only">
 All temples
 </h2>
 <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
 {filtered.map((t, i) => (
 <TempleCard key={t.slug} temple={t} eager={i < 3} />
 ))}
 </div>
 </section>
 </div>
 </div>
 );
}

/**
 * HN-05 — a dropped upstream fetch must not render as a hole in the grid.
 *
 * On production /temples one of 33 images had `complete === true` with
 * `naturalWidth === 0` and no HTTP status recorded at all: Wikimedia dropping a
 * hotlinked request rather than answering it. A later pass measured 49 of 348
 * temple URLs rate-limiting at 3 concurrent requests, so this is a throughput
 * property of the upstream, not one bad file.
 *
 * Whether to self-host or front the images with a CDN is the owner's decision
 * and is not code. This is: the card degrades to a local vector placeholder.
 *
 * `srcset` is cleared along with `src`. Leaving it would let the browser
 * re-select a Wikimedia candidate on the next layout pass and blank the tile
 * again. `dataset.fellBack` makes the swap idempotent — without it, a
 * placeholder that ever failed would re-trigger onError against itself, which
 * is an infinite request loop on a free-tier box.
 */
const TEMPLE_IMAGE_FALLBACK = '/images/temple-placeholder.svg';

function handleTempleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
 const img = event.currentTarget;
 if (img.dataset.fellBack === '1') return;
 img.dataset.fellBack = '1';
 img.removeAttribute('srcset');
 img.src = TEMPLE_IMAGE_FALLBACK;
}

// CWV-01: the first row is the LCP candidate on /temples; lazy-loading it deferred
// its fetch until after layout (Lighthouse "resource load delay") for no saving.
function TempleCard({ temple, eager = false }: { temple: TempleCardData; eager?: boolean }) {
 return (
 <Link
 href={`/temples/${temple.slug}`}
 className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-md"
 >
 <div className="relative aspect-[16/10] bg-gradient-to-br from-orange-100 to-amber-50">
 <img
 src={remoteImage(templeCardImage(temple), IMG_W.CARD)}
 srcSet={remoteSrcSet(templeCardImage(temple), [IMG_W.THUMB, IMG_W.CARD])}
 sizes="(max-width: 768px) 100vw, 380px"
 alt={`${temple.name} - ${temple.city}`}
 loading={eager ? 'eager' : 'lazy'}
 fetchPriority={eager ? 'high' : undefined}
 width={500}
 height={313}
 className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
 decoding="async"
 onError={handleTempleImageError}
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />

 <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
 {temple.liveDarshanEnabled && (
 <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
 <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
 LIVE
 </span>
 )}
 {temple.isJyotirlinga && (
 <span className="flex items-center gap-1 rounded-full bg-amber-700 px-2 py-0.5 text-xs font-bold text-white">
 <Star className="h-3 w-3" /> Jyotirlinga
 </span>
 )}
 {temple.isShaktiPeetha && (
 <span className="flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
 <Heart className="h-3 w-3" /> Shakti
 </span>
 )}
 {temple.isDivyaDesam && (
 <span className="flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
 <Star className="h-3 w-3" /> Divya Desam
 </span>
 )}
 {temple.isVerified && (
 <span className="flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
 <Shield className="h-3 w-3" /> Verified
 </span>
 )}
 </div>

 {temple.viewers > 0 && (
 <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
 <Users className="h-3 w-3" />
 {temple.viewers.toLocaleString('en-IN')} watching
 </div>
 )}
 </div>

 <div className="p-5">
 <h3 className="mb-1 text-lg font-semibold leading-tight text-surface-800 transition-colors group-hover:text-saffron-700">
 {temple.name}
 </h3>
 <p className="mb-2 flex items-center gap-1 text-sm text-surface-500">
 <MapPin className="h-3.5 w-3.5 shrink-0" />
 {temple.city}, {temple.state}
 </p>
 <p className="mb-3 line-clamp-2 text-sm text-surface-600">{temple.description}</p>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-sm">
 <span className="flex items-center gap-1 text-saffron-700">
 <Flame className="h-3.5 w-3.5" /> {temple.deityPrimary}
 </span>
 </div>
 </div>
 </div>
 </Link>
 );
}
