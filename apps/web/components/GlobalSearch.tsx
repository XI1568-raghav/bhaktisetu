'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '../lib/api-config';
import { contentSubtitleLabel, pujaSubtitleLabel } from './SearchSubtitle';

/**
 * CM-12: every string here is a promise about what the box can answer, and
 * three of them were false. Behind this box are exactly four corpora — the
 * API's temples / pujaTypes / contentItems / storeProducts — plus the 120-entry
 * Sanskrit/Veda/Sanatan article index on /search. None of them holds a kundli,
 * a saint (the 14 live only in lib/bhakti-saints.ts, routed at
 * /bhakti-saint/<slug>) or a tirth/yatra (11 packages in lib/yatra-data.ts).
 * Inviting those queries produced a guaranteed "No matches" on the first thing
 * a devotee typed. Guarded by __tests__/search-store-products.cm12.test.tsx,
 * which re-checks each claim against the corpora rather than against a list.
 */
const ROTATING_PLACEHOLDERS = [
  'Search a puja, temple or aarti…',
  'Find an aarti or chalisa…',
  'Search puja samagri…',
  'Look up a temple by city…',
  'Search festivals + muhurat…',
  'Find a puja to book…',
];

interface SearchResult {
 id: string;
 slug: string;
 name: string;
 subtitle?: string;
 href: string;
}

interface SearchResponse {
 query: string;
 results: {
 temples: SearchResult[];
 pujas: SearchResult[];
 content: SearchResult[];
 /**
  * CM-12: the store bucket. Optional because an older API build does not send
  * it — an absent key must read as "the server did not say", not as an error.
  */
 products?: SearchResult[];
 total: number;
 };
}

export function GlobalSearch() {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const [data, setData] = useState<SearchResponse | null>(null);
 const [loading, setLoading] = useState(false);
 const [placeholderIdx, setPlaceholderIdx] = useState(0);
 const inputRef = useRef<HTMLInputElement>(null);
 const containerRef = useRef<HTMLDivElement>(null);
 const panelRef = useRef<HTMLDivElement>(null);
 /**
  * A11Y-12: the element focus must return to when the overlay closes. Without
  * it Escape dropped focus on <body> and the next Tab restarted at the skip
  * link. Set from the trigger that opened the overlay, or from whatever had
  * focus when the "/" shortcut fired.
  */
 const returnFocusRef = useRef<HTMLElement | null>(null);

 function openSearch(from?: HTMLElement | null) {
   returnFocusRef.current =
     from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
   setOpen(true);
 }

 function closeSearch() {
   setOpen(false);
   const target = returnFocusRef.current;
   returnFocusRef.current = null;
   target?.focus();
 }

 useEffect(() => {
   const id = setInterval(() => {
     setPlaceholderIdx((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
   }, 3500);
   return () => clearInterval(id);
 }, []);

 useEffect(() => {
   if (open) return;
   const onKey = (e: KeyboardEvent) => {
     if (e.key !== '/') return;
     const tgt = e.target as HTMLElement | null;
     if (tgt && /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName)) return;
     if (tgt?.isContentEditable) return;
     e.preventDefault();
     openSearch();
   };
   window.addEventListener('keydown', onKey);
   return () => window.removeEventListener('keydown', onKey);
 }, [open]);

 // Close on outside click
 useEffect(() => {
 if (!open) return;
 function onClick(e: MouseEvent) {
 if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
 closeSearch();
 }
 }
 function onEsc(e: KeyboardEvent) {
 if (e.key === 'Escape') closeSearch();
 }
 window.addEventListener('mousedown', onClick);
 window.addEventListener('keydown', onEsc);
 return () => {
 window.removeEventListener('mousedown', onClick);
 window.removeEventListener('keydown', onEsc);
 };
 }, [open]);

 // A11Y-12: a dialog that declares aria-modal must actually take the page out
 // of play — lock body scroll while it is open, restore the previous value on
 // close (never hard-code "visible", which would clobber a page-level lock).
 useEffect(() => {
 if (!open) return;
 const previous = document.body.style.overflow;
 document.body.style.overflow = 'hidden';
 return () => {
 document.body.style.overflow = previous;
 };
 }, [open]);

 // A11Y-12: keep Tab inside the dialog, mirroring components/MobileNavV2.tsx.
 function onPanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
 if (e.key !== 'Tab') return;
 const panel = panelRef.current;
 if (!panel) return;
 const items = Array.from(
 panel.querySelectorAll<HTMLElement>(
 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
 ),
 );
 if (items.length === 0) return;
 const first = items[0]!;
 const last = items[items.length - 1]!;
 if (e.shiftKey && document.activeElement === first) {
 e.preventDefault();
 last.focus();
 } else if (!e.shiftKey && document.activeElement === last) {
 e.preventDefault();
 first.focus();
 }
 }

 // Focus input when dropdown opens
 useEffect(() => {
 if (open) inputRef.current?.focus();
 }, [open]);

 // Debounced fetch
 useEffect(() => {
 const trimmed = query.trim();
 if (trimmed.length < 2) {
 setData(null);
 return;
 }
 const timer = setTimeout(async () => {
 setLoading(true);
 try {
 const res = await fetch(
 `${API_BASE_URL}/search?q=${encodeURIComponent(trimmed)}&limit=5`,
 );
 if (res.ok) {
 setData(await res.json());
 }
 } catch {
 // network failure — leave previous results
 } finally {
 setLoading(false);
 }
 }, 200);
 return () => clearTimeout(timer);
 }, [query]);

 /**
  * CM-12: pujas lead. They are the only results a devotee can act on with
  * money, and temples — which used to lead — is the branch CM-14 measured as
  * 75% dead (15 of 20 temples carry zero offerings). /search already orders it
  * this way; the overlay is what people actually type into.
  *
  * CM-10: `format` strips the enum out of the API's composed subtitle before
  * it reaches the DOM. See components/SearchSubtitle.ts.
  */
 type Section = {
   label: string;
   items: SearchResult[];
   format: (subtitle?: string | null) => string;
 };

 const sections: Section[] = data
 ? (
 [
 { label: 'Pujas', items: data.results.pujas, format: pujaSubtitleLabel },
 { label: 'Temples', items: data.results.temples, format: (s) => (s ?? '').trim() },
 { label: 'Content', items: data.results.content, format: contentSubtitleLabel },
 {
 label: 'Puja samagri & store',
 items: data.results.products ?? [],
 format: (s) => (s ?? '').trim(),
 },
 ] as Section[]
 ).filter((s) => s.items.length > 0)
 : [];

 const trimmedQuery = query.trim();
 const noMatches = trimmedQuery.length >= 2 && !!data && data.results.total === 0 && !loading;

 return (
 <div ref={containerRef} className="relative">
 {/* Pill — only at xl+ (1280px+). Below xl uses icon-only to fit right cluster. */}
 <button
 type="button"
 aria-label="Search"
 aria-haspopup="dialog"
 aria-expanded={open}
 onClick={(e) => openSearch(e.currentTarget)}
 className="hidden xl:flex items-center gap-2 w-[240px] 2xl:w-[300px] h-9 px-3 text-sm text-surface-500 bg-white border border-surface-200 hover:border-saffron-300 hover:text-surface-700 rounded-md transition-colors"
 >
 <Search className="w-4 h-4 shrink-0" />
 <span className="truncate text-left flex-1">
 {ROTATING_PLACEHOLDERS[placeholderIdx]}
 </span>
 <kbd className="inline-flex px-1.5 py-0.5 text-xs font-mono text-surface-400 bg-surface-100 rounded border border-surface-200">
 /
 </kbd>
 </button>
 {/* Icon-only — below xl (covers md + lg + mobile). */}
 <button
 type="button"
 aria-label="Search"
 title="Search"
 aria-haspopup="dialog"
 aria-expanded={open}
 onClick={(e) => openSearch(e.currentTarget)}
 // HN-12: h-9 w-9 is 36x36, under the 44px floor on the surface where it
 // matters most — this is the only search affordance a phone gets.
 className="xl:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors"
 >
 <Search className="w-4 h-4" />
 </button>

 {open && (
 <div
 className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[420px] sm:bg-transparent sm:backdrop-blur-none"
 onMouseDown={(e) => {
 // Click on backdrop closes (mobile only)
 if (e.target === e.currentTarget) closeSearch();
 }}
 >
 <div
 ref={panelRef}
 role="dialog"
 aria-modal="true"
 aria-label="Search Darshya"
 onKeyDown={onPanelKeyDown}
 className="bg-white rounded-xl shadow-2xl border border-surface-200 mx-4 mt-16 sm:m-0 overflow-hidden"
 >
 <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-100">
 <Search className="w-4 h-4 text-surface-400 shrink-0" />
 <input
 ref={inputRef}
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 aria-label="Search temples, pujas and aartis"
 placeholder="Search temples, pujas, aartis…"
 className="flex-1 px-1 py-1.5 text-sm bg-transparent outline-none placeholder:text-surface-400"
 />
 {loading && <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />}
 <button
 type="button"
 onClick={closeSearch}
 className="p-1 text-surface-400 hover:text-surface-600"
 aria-label="Close search"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="max-h-[60vh] overflow-y-auto">
 {/*
   CM-12: this used to be the complete zero-result state — one sentence, no
   links. The finding names it exactly: "no route back into the catalogue at
   the moment the user has proven both intent and a willingness to type".
   /search got its recovery links; the overlay did not, and on a phone the
   overlay is the ONLY search affordance the site offers (see HN-12 above).
   The typed term is carried into /search so nobody has to type it twice.
 */}
 {noMatches && (
 <div className="px-4 py-6 text-sm">
 <p className="text-surface-600">
 No matches for &ldquo;{trimmedQuery}&rdquo;.
 </p>
 <p className="mt-1 text-xs text-surface-500">
 Try a shorter term, or start from a catalogue:
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
 <Link
 href="/pujas"
 onClick={closeSearch}
 className="inline-flex min-h-[44px] items-center rounded-lg bg-saffron-600 px-4 text-sm font-semibold text-white hover:bg-saffron-700"
 >
 Browse all pujas
 </Link>
 <Link
 href="/temples"
 onClick={closeSearch}
 className="inline-flex min-h-[44px] items-center rounded-lg border border-surface-200 px-4 text-sm font-semibold text-surface-700 hover:border-saffron-400"
 >
 Browse temples
 </Link>
 </div>
 <Link
 href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
 onClick={closeSearch}
 className="mt-3 inline-flex min-h-[44px] items-center text-xs font-medium text-saffron-700 underline underline-offset-4"
 >
 Search the whole library for &ldquo;{trimmedQuery}&rdquo;
 </Link>
 </div>
 )}

 {query.trim().length < 2 && (
 <div className="px-4 py-6 text-xs text-surface-500">
 Try searching for <span className="font-medium text-surface-700">Tirumala</span>,{' '}
 <span className="font-medium text-surface-700">Hanuman Chalisa</span>, or{' '}
 <span className="font-medium text-surface-700">Rudrabhishek</span>.
 </div>
 )}

 {sections.map(({ label, items, format }) => (
 <div key={label} className="py-2">
 <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-saffron-600">
 {label}
 </div>
 {items.map((item) => {
 const subtitle = format(item.subtitle);
 return (
 <Link
 key={`${label}-${item.id}`}
 href={item.href}
 onClick={() => setOpen(false)}
 className="block px-3 py-2 hover:bg-surface-50 transition-colors"
 >
 <div className="text-sm font-medium text-surface-800">{item.name}</div>
 {subtitle && (
 <div className="text-xs text-surface-500">{subtitle}</div>
 )}
 </Link>
 );
 })}
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
