'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import { getTempleHero, getDeityImage, wikiThumb } from '../../lib/images';

export type DeityTypeFilter = 'All' | 'Shiva' | 'Vishnu' | 'Shakti' | 'Ganesha' | 'Sikh' | 'Other';
export type SortMode = 'popularity' | 'alphabetical' | 'state';

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
 total,
}: {
 temples: TempleCardData[];
 total: number;
}) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
 // Debounced mirror of `search` — filter logic reads this, not the raw input.
 // Avoids re-filtering 200+ temples on every keystroke.
 const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? '');
 const [deityType, setDeityType] = useState<DeityTypeFilter>(
  () => (searchParams.get('deity') as DeityTypeFilter) || 'All'
 );
 const [state, setState] = useState<string>(() => searchParams.get('state') || 'All States');
 const [liveOnly, setLiveOnly] = useState(() => searchParams.get('live') === '1');
 const [sort, setSort] = useState<SortMode>(
  () => (searchParams.get('sort') as SortMode) || 'popularity'
 );

 // 200ms debounce on search input
 useEffect(() => {
 const id = setTimeout(() => setDebouncedSearch(search), 200);
 return () => clearTimeout(id);
 }, [search]);

 useEffect(() => {
  const params = new URLSearchParams();
  if (debouncedSearch) params.set('q', debouncedSearch);
  if (deityType !== 'All') params.set('deity', deityType);
  if (state !== 'All States') params.set('state', state);
  if (liveOnly) params.set('live', '1');
  if (sort !== 'popularity') params.set('sort', sort);
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
 }, [debouncedSearch, deityType, state, liveOnly, sort, pathname, router]);

 // Derive state list from data
 const states = useMemo(() => {
 const uniq = Array.from(new Set(temples.map((t) => t.state).filter(Boolean))).sort();
 return ['All States', ...uniq];
 }, [temples]);

 const filtered = useMemo(() => {
 const q = debouncedSearch.trim().toLowerCase();
 const list = temples.filter((t) => {
 if (deityType !== 'All' && t.deityType !== deityType) return false;
 if (state !== 'All States' && t.state !== state) return false;
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

 const hasActiveFilters =
 search !== '' || deityType !== 'All' || state !== 'All States' || liveOnly;

 const resetFilters = () => {
 setSearch('');
 setDebouncedSearch('');
 setDeityType('All');
 setState('All States');
 setLiveOnly(false);
 };

 return (
 <div className="min-h-[100dvh] bg-[color:var(--color-bg,#fbf7f1)]">
 {/* Hero */}
 <section className="bg-[#ede9e3] py-12 md:py-16">
 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
 <h1 className="mb-3 text-3xl font-bold text-surface-800 md:text-4xl">
 Sacred Temples of India
 </h1>
 <p className="max-w-2xl text-lg text-surface-500">
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
 onClick={() => setSearch('')}
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
 onClick={() => setDeityType(f.value)}
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
 value={state}
 onChange={(e) => setState(e.target.value)}
 className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 >
 {states.map((s) => (
 <option key={s} value={s}>{s}</option>
 ))}
 </select>

 {/* Sort */}
 <select
 value={sort}
 onChange={(e) => setSort(e.target.value as SortMode)}
 className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 >
 <option value="popularity">Most Popular</option>
 <option value="alphabetical">A → Z</option>
 <option value="state">By State</option>
 </select>

 {/* Live toggle */}
 <button
 onClick={() => setLiveOnly(!liveOnly)}
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
 onClick={resetFilters}
 className="mt-4 inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-700"
 >
 Clear all filters
 </button>
 </div>
 )}

 {/* Temple Grid */}
 <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
 {filtered.map((t) => (
 <TempleCard key={t.slug} temple={t} />
 ))}
 </div>
 </div>
 </div>
 );
}

function TempleCard({ temple }: { temple: TempleCardData }) {
 return (
 <Link
 href={`/temples/${temple.slug}`}
 className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-md"
 >
 <div className="relative aspect-[16/10] bg-gradient-to-br from-orange-100 to-amber-50">
 <img
 src={wikiThumb(temple.imageUrl ?? getTempleHero(temple.slug) ?? getDeityImage(deityFallbackKey(temple.deityType)), 800)}
 alt={`${temple.name} - ${temple.city}`}
 loading="lazy"
 width={800}
 height={500}
 className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
 decoding="async"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />

 <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
 {temple.liveDarshanEnabled && (
 <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
 <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
 LIVE
 </span>
 )}
 {temple.isJyotirlinga && (
 <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
 <Star className="h-3 w-3" /> Jyotirlinga
 </span>
 )}
 {temple.isShaktiPeetha && (
 <span className="flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
 <Heart className="h-3 w-3" /> Shakti
 </span>
 )}
 {temple.isDivyaDesam && (
 <span className="flex items-center gap-1 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white">
 <Star className="h-3 w-3" /> Divya Desam
 </span>
 )}
 {temple.isVerified && (
 <span className="flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
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
 <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
 <span className="font-semibold text-surface-700">
 {(temple.trustScore / 20).toFixed(1)}
 </span>
 <span className="text-surface-300">•</span>
 <span className="flex items-center gap-1 text-saffron-700">
 <Flame className="h-3.5 w-3.5" /> {temple.deityPrimary}
 </span>
 </div>
 </div>
 </div>
 </Link>
 );
}
