'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '../lib/api-config';

const ROTATING_PLACEHOLDERS = [
  'Search puja, temple, kundli, saint…',
  'Find your kundli…',
  'Look up a saint…',
  'Find an aarti or chalisa…',
  'Search festivals + muhurat…',
  'Find a tirth or pilgrimage…',
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
     setOpen(true);
   };
   window.addEventListener('keydown', onKey);
   return () => window.removeEventListener('keydown', onKey);
 }, [open]);

 // Close on outside click
 useEffect(() => {
 if (!open) return;
 function onClick(e: MouseEvent) {
 if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
 setOpen(false);
 }
 }
 function onEsc(e: KeyboardEvent) {
 if (e.key === 'Escape') setOpen(false);
 }
 window.addEventListener('mousedown', onClick);
 window.addEventListener('keydown', onEsc);
 return () => {
 window.removeEventListener('mousedown', onClick);
 window.removeEventListener('keydown', onEsc);
 };
 }, [open]);

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

 const sections: Array<[string, SearchResult[]]> = data
 ? [
 ['Temples', data.results.temples],
 ['Pujas', data.results.pujas],
 ['Content', data.results.content],
 ].filter(([, list]) => (list as SearchResult[]).length > 0) as Array<[string, SearchResult[]]>
 : [];

 return (
 <div ref={containerRef} className="relative">
 <button
 type="button"
 aria-label="Search"
 onClick={() => setOpen(true)}
 className="hidden md:flex items-center gap-2 w-[260px] lg:w-[320px] px-3 py-2 text-sm text-surface-500 bg-white border border-surface-200 hover:border-saffron-300 hover:text-surface-700 rounded-lg transition-colors"
 >
 <Search className="w-4 h-4 shrink-0" />
 <span className="truncate text-left flex-1">
 {ROTATING_PLACEHOLDERS[placeholderIdx]}
 </span>
 <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-surface-400 bg-surface-100 rounded border border-surface-200">
 /
 </kbd>
 </button>
 <button
 type="button"
 aria-label="Search"
 onClick={() => setOpen(true)}
 className="md:hidden p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-md transition-colors"
 >
 <Search className="w-[18px] h-[18px]" />
 </button>

 {open && (
 <div
 className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[420px] sm:bg-transparent sm:backdrop-blur-none"
 onMouseDown={(e) => {
 // Click on backdrop closes (mobile only)
 if (e.target === e.currentTarget) setOpen(false);
 }}
 >
 <div
 className="bg-white rounded-xl shadow-2xl border border-surface-200 mx-4 mt-16 sm:m-0 overflow-hidden"
 >
 <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-100">
 <Search className="w-4 h-4 text-surface-400 shrink-0" />
 <input
 ref={inputRef}
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search temples, pujas, aartis…"
 className="flex-1 px-1 py-1.5 text-sm bg-transparent outline-none placeholder:text-surface-400"
 />
 {loading && <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />}
 <button
 type="button"
 onClick={() => setOpen(false)}
 className="p-1 text-surface-400 hover:text-surface-600"
 aria-label="Close search"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="max-h-[60vh] overflow-y-auto">
 {query.trim().length >= 2 && data && data.results.total === 0 && !loading && (
 <div className="px-4 py-8 text-center text-sm text-surface-500">
 No matches for &ldquo;{query.trim()}&rdquo;.
 </div>
 )}

 {query.trim().length < 2 && (
 <div className="px-4 py-6 text-xs text-surface-500">
 Try searching for <span className="font-medium text-surface-700">Tirumala</span>,{' '}
 <span className="font-medium text-surface-700">Hanuman Chalisa</span>, or{' '}
 <span className="font-medium text-surface-700">Rudrabhishek</span>.
 </div>
 )}

 {sections.map(([label, items]) => (
 <div key={label} className="py-2">
 <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-saffron-600">
 {label}
 </div>
 {items.map((item) => (
 <Link
 key={`${label}-${item.id}`}
 href={item.href}
 onClick={() => setOpen(false)}
 className="block px-3 py-2 hover:bg-surface-50 transition-colors"
 >
 <div className="text-sm font-medium text-surface-800">{item.name}</div>
 {item.subtitle && (
 <div className="text-xs text-surface-500">{item.subtitle}</div>
 )}
 </Link>
 ))}
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
