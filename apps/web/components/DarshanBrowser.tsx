'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
 Bell,
 Calendar,
 Clock,
 Eye,
 MapPin,
 Play,
 Search,
 ChevronDown,
 Wifi,
} from 'lucide-react';
import type { DarshanStream, TempleImage } from '../lib/api';
import { getTempleHero, getDeityImage, wikiThumb } from '../lib/images';

function firstImageUrl(images: TempleImage[] | undefined): string | null {
 if (!images || images.length === 0) return null;
 const first = images[0];
 if (typeof first === 'string') return first;
 if (first && typeof first === 'object' && 'url' in first && typeof first.url === 'string') {
  return first.url;
 }
 return null;
}

function templeImageThumb(url: string): string {
 return wikiThumb(url, 800);
}

function deityFallback(deityPrimary: string): string {
 const d = deityPrimary.toLowerCase();
 if (d.includes('shiva')) return getDeityImage('lord-shiva');
 if (d.includes('vishnu') || d.includes('venkateswara') || d.includes('balaji') || d.includes('jagannath') || d.includes('krishna') || d.includes('rama')) return getDeityImage('lord-vishnu');
 if (d.includes('ganesha') || d.includes('vinayak') || d.includes('ganapati')) return getDeityImage('lord-ganesha');
 if (d.includes('durga') || d.includes('kali') || d.includes('devi')) return getDeityImage('goddess-durga');
 if (d.includes('lakshmi')) return getDeityImage('goddess-lakshmi');
 if (d.includes('hanuman')) return getDeityImage('lord-hanuman');
 return getDeityImage('lord-shiva');
}

function templeImageFor(stream: DarshanStream): string {
 return templeImageThumb(firstImageUrl(stream.temple.images) ?? getTempleHero(stream.temple.slug) ?? deityFallback(stream.temple.deityPrimary));
}

const REMINDERS_KEY = 'poojly_darshan_reminders';

const DEITY_OPTIONS = [
 'All Deities',
 'Lord Shiva',
 'Lord Vishnu',
 'Lord Krishna',
 'Lord Ganesha',
 'Goddess Durga',
];

const REGION_OPTIONS = ['All Regions', 'North India', 'South India', 'East India', 'West India'];

const REGION_CITIES: Record<string, string[]> = {
 'North India': [
  'varanasi', 'amritsar', 'katra', 'haridwar', 'rishikesh', 'mathura', 'vrindavan',
  'agra', 'delhi', 'lucknow', 'kedarnath', 'badrinath',
 ],
 'South India': [
  'tirumala', 'tirupati', 'rameshwaram', 'madurai', 'chennai', 'bangalore',
  'mysore', 'thanjavur', 'thiruvananthapuram', 'kanchipuram',
 ],
 'East India': ['puri', 'kolkata', 'bhubaneswar', 'guwahati', 'gangtok'],
 'West India': ['mumbai', 'ujjain', 'veraval', 'dwarka', 'somnath', 'pune', 'ahmedabad'],
};

function readReminders(): string[] {
 if (typeof window === 'undefined') return [];
 try {
  const raw = window.localStorage.getItem(REMINDERS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
 } catch {
  return [];
 }
}

function writeReminders(ids: string[]) {
 try {
  window.localStorage.setItem(REMINDERS_KEY, JSON.stringify(ids));
 } catch {
  /* no-op */
 }
}

function matchesDeity(stream: DarshanStream, deity: string): boolean {
 if (deity === 'All Deities') return true;
 const d = stream.temple.deityPrimary.toLowerCase();
 return d.includes(deity.toLowerCase().replace('lord ', '').replace('goddess ', ''));
}

function matchesRegion(stream: DarshanStream, region: string): boolean {
 if (region === 'All Regions') return true;
 const cities = REGION_CITIES[region];
 if (!cities) return true;
 return cities.includes(stream.temple.city.toLowerCase());
}

function matchesQuery(stream: DarshanStream, q: string): boolean {
 if (!q.trim()) return true;
 const needle = q.trim().toLowerCase();
 return (
  stream.temple.name.toLowerCase().includes(needle) ||
  stream.temple.city.toLowerCase().includes(needle) ||
  stream.temple.deityPrimary.toLowerCase().includes(needle)
 );
}

function streamHref(stream: DarshanStream): string {
 // Prefer temple slug when available; fall back to stream id
 const slug = stream.temple.slug?.trim();
 return slug ? `/darshan/${slug}` : `/darshan/${stream.id}`;
}

function formatStartsIn(min: number): string {
 if (min < 60) return `${min}m`;
 const h = Math.floor(min / 60);
 const m = min % 60;
 return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function DarshanBrowser({
 liveStreams,
 scheduledStreams,
 upcomingNotes = [],
}: {
 liveStreams: DarshanStream[];
 scheduledStreams: DarshanStream[];
 upcomingNotes?: { templeSlug: string; nextSlot: string; startsInMin: number }[];
}) {
 const [query, setQuery] = useState('');
 const [deity, setDeity] = useState(DEITY_OPTIONS[0]!);
 const [region, setRegion] = useState(REGION_OPTIONS[0]!);
 const [reminders, setReminders] = useState<string[]>([]);
 const [toast, setToast] = useState<string | null>(null);

 useEffect(() => {
  setReminders(readReminders());
 }, []);

 useEffect(() => {
  if (!toast) return;
  const t = setTimeout(() => setToast(null), 3000);
  return () => clearTimeout(t);
 }, [toast]);

 const filteredLive = useMemo(
  () =>
   liveStreams.filter(
    (s) => matchesQuery(s, query) && matchesDeity(s, deity) && matchesRegion(s, region),
   ),
  [liveStreams, query, deity, region],
 );

 const filteredScheduled = useMemo(
  () =>
   scheduledStreams.filter(
    (s) => matchesQuery(s, query) && matchesDeity(s, deity) && matchesRegion(s, region),
   ),
  [scheduledStreams, query, deity, region],
 );

 function toggleReminder(id: string, templeName: string) {
  const current = readReminders();
  const next = current.includes(id)
   ? current.filter((s) => s !== id)
   : [...current, id];
  writeReminders(next);
  setReminders(next);
  setToast(
   next.includes(id)
    ? `Reminder set for ${templeName}`
    : `Reminder cleared for ${templeName}`,
  );
 }

 return (
  <>
   {/* Filters */}
   <div className="mt-8 flex flex-wrap gap-3">
    <div className="relative flex-1 min-w-64 max-w-md">
     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
     <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search temples..."
      aria-label="Search temples"
      className="w-full pl-12 pr-4 py-3 rounded-lg bg-white text-surface-800 placeholder:text-surface-400 border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-saffron-300"
     />
    </div>
    <div className="relative">
     <select
      value={deity}
      onChange={(e) => setDeity(e.target.value)}
      aria-label="Filter by deity"
      className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-3 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
     >
      {DEITY_OPTIONS.map((d) => (
       <option key={d} value={d}>{d}</option>
      ))}
     </select>
     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
    </div>
    <div className="relative">
     <select
      value={region}
      onChange={(e) => setRegion(e.target.value)}
      aria-label="Filter by region"
      className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-3 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
     >
      {REGION_OPTIONS.map((r) => (
       <option key={r} value={r}>{r}</option>
      ))}
     </select>
     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
    </div>
   </div>

   {/* Live Now */}
   <section className="py-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
     <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
      <Wifi className="w-5 h-5 text-red-500" />
      Live Now
      <span className="text-sm font-normal text-surface-500 ml-2">
       {filteredLive.length} stream{filteredLive.length !== 1 ? 's' : ''}
      </span>
     </h2>

     {filteredLive.length === 0 ? (
      <p className="text-sm text-surface-500">No live streams match your filters.</p>
     ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
       {filteredLive.map((stream) => {
        const templeImage = templeImageFor(stream);
        return (
         <Link
          key={stream.id}
          href={streamHref(stream)}
          className="group rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-surface-200 hover:shadow-lg transition-all duration-300"
         >
          <div className="relative aspect-video bg-surface-200">
           <img
            src={templeImage}
            alt={stream.temple.name}
            loading="lazy"
            width={800}
            height={450}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
           />
           <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all">
             <Play className="w-6 h-6 text-white ml-0.5" />
            </div>
           </div>
           <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
           </div>
           <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded backdrop-blur-sm">
            HD
           </div>
           <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
            <Eye className="w-3 h-3" />
            {stream.viewerCount.toLocaleString('en-IN')}
           </div>
          </div>
          <div className="p-4">
           <h3 className="font-semibold text-surface-800 group-hover:text-saffron-600 transition-colors truncate">
            {stream.temple.name}
           </h3>
           <p className="text-sm text-surface-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {stream.temple.city}
           </p>
           <p className="text-xs text-surface-600 mt-1">
            {stream.temple.deityPrimary}
           </p>
           {stream.currentSlot && (
            <p className="text-xs font-medium text-saffron-700 mt-1.5 flex items-center gap-1">
             <Wifi className="w-3 h-3" />
             {stream.currentSlot}
             {typeof stream.endsInMin === 'number' && stream.endsInMin > 0 && (
              <span className="text-surface-500 font-normal">• ends in {formatStartsIn(stream.endsInMin)}</span>
             )}
            </p>
           )}
          </div>
         </Link>
        );
       })}
      </div>
     )}
    </div>
   </section>

   {/* Next aarti today — scheduled per Temple.timingInfo */}
   {upcomingNotes.length > 0 && (
    <section className="py-8 border-t border-[var(--color-border)]">
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
       <Clock className="w-5 h-5 text-saffron-500" />
       Next Aarti
       <span className="text-sm font-normal text-surface-500 ml-2">
        {upcomingNotes.length} temple{upcomingNotes.length !== 1 ? 's' : ''} scheduled
       </span>
      </h2>
      <div className="flex flex-wrap gap-2">
       {upcomingNotes
        .slice()
        .sort((a, b) => a.startsInMin - b.startsInMin)
        .slice(0, 12)
        .map((note) => (
        <Link
         key={note.templeSlug}
         href={`/darshan/${note.templeSlug}`}
         className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs text-surface-700 hover:border-saffron-300 hover:text-saffron-700 transition-colors"
        >
         <span className="font-medium">{note.nextSlot}</span>
         <span className="text-surface-400 mx-1.5">•</span>
         <span className="text-surface-500">in {formatStartsIn(note.startsInMin)}</span>
        </Link>
       ))}
      </div>
     </div>
    </section>
   )}

   {/* Upcoming */}
   <section className="py-10 border-t border-[var(--color-border)]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
     <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-6 flex items-center gap-2">
      <Calendar className="w-5 h-5 text-saffron-400" />
      Upcoming Streams
     </h2>

     {filteredScheduled.length === 0 ? (
      <p className="text-sm text-surface-500">No upcoming streams match your filters.</p>
     ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
       {filteredScheduled.map((stream) => {
        const reminded = reminders.includes(stream.id);
        return (
         <div
          key={stream.id}
          className="group rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-surface-200 transition-all"
         >
          <Link href={streamHref(stream)} className="block">
           <div className="relative aspect-video bg-surface-200">
            <img
             src={templeImageFor(stream)}
             alt={`${stream.temple.name} - Upcoming stream`}
             loading="lazy"
             width={800}
             height={450}
             decoding="async"
             className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-center">
              <Clock className="w-8 h-8 text-surface-400 mx-auto mb-1" />
              <span className="text-sm text-surface-400">Upcoming</span>
             </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-surface-600 text-surface-500 text-xs font-bold px-2.5 py-1 rounded-full">
             <Clock className="w-3 h-3" />
             {stream.scheduledStart ?? 'TBD'}
            </div>
           </div>
          </Link>
          <div className="p-4">
           <h3 className="font-semibold text-surface-800 truncate">
            {stream.temple.name}
           </h3>
           <p className="text-sm text-surface-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {stream.temple.city}
           </p>
           <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-saffron-400 font-medium">
             {stream.temple.deityPrimary}
            </span>
            <button
             type="button"
             onClick={() => toggleReminder(stream.id, stream.temple.name)}
             aria-pressed={reminded}
             className={`flex items-center gap-1 text-xs transition-colors ${
              reminded
               ? 'text-saffron-600 hover:text-saffron-700'
               : 'text-surface-400 hover:text-saffron-600'
             }`}
            >
             <Bell className={`w-3.5 h-3.5 ${reminded ? 'fill-saffron-500' : ''}`} />
             {reminded ? 'Reminder set' : 'Remind Me'}
            </button>
           </div>
          </div>
         </div>
        );
       })}
      </div>
     )}
    </div>
   </section>

   {toast && (
    <div
     role="status"
     aria-live="polite"
     className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-surface-800/95 px-4 py-2 text-sm font-medium text-white shadow-warm-md"
    >
     {toast}
    </div>
   )}
  </>
 );
}
