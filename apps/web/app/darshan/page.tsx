import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Play, Radio } from 'lucide-react';
import { getTranslations } from '../../lib/t';
import {
 getLiveDarshan,
 getScheduledDarshan,
 type DarshanStream,
} from '../../lib/api';
import DarshanBrowser from '../../components/DarshanBrowser';
import DarshanScheduleRemindButton from '../../components/DarshanScheduleRemindButton';
import { darshanScheduleRows } from '../../lib/darshan-schedule';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/darshan' },
 title: 'Live Darshan',
 description:
 'Watch live darshan from India’s most sacred temples. Real-time temple ceremonies, aarti, and abhishekam streams from 100+ temples.',
};

// Day-sync ISR: regenerate every 5 min so the live-now list reflects current
// aarti windows (matches /darshan/[id] detail page revalidate cadence).
export const revalidate = 300;

// ─── Fallback data ────────────────────────────────────────────────────────────

const fallbackLiveStreams: DarshanStream[] = [
 {
 id: 'live-1',
 templeId: 't1',
 playbackUrl: 'https://www.youtube.com/embed/RwSHT3yg7MI',
 status: 'live',
 viewerCount: 12450,
 peakViewers: 18200,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Shri Kashi Vishwanath Temple',
 slug: 'kashi-vishwanath',
 city: 'Varanasi',
 deityPrimary: 'Lord Shiva',
 images: [],
 },
 },
 {
 id: 'live-2',
 templeId: 't2',
 playbackUrl: 'https://www.youtube.com/embed/t5nRpg1j98k',
 status: 'live',
 viewerCount: 28300,
 peakViewers: 35000,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Tirumala Venkateswara Temple',
 slug: 'tirupati',
 city: 'Tirumala',
 deityPrimary: 'Lord Venkateswara',
 images: [],
 },
 },
 {
 id: 'live-3',
 templeId: 't3',
 playbackUrl: 'https://www.youtube.com/embed/MNbnux_0U_E',
 status: 'live',
 viewerCount: 8760,
 peakViewers: 12000,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Siddhivinayak Temple',
 slug: 'siddhivinayak',
 city: 'Mumbai',
 deityPrimary: 'Lord Ganesha',
 images: [],
 },
 },
 {
 id: 'live-4',
 templeId: 't4',
 playbackUrl: 'https://www.youtube.com/embed/sJtJdv3ecDc',
 status: 'live',
 viewerCount: 9800,
 peakViewers: 14000,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Mahakaleshwar Temple',
 slug: 'mahakaleshwar',
 city: 'Ujjain',
 deityPrimary: 'Lord Shiva',
 images: [],
 },
 },
 {
 id: 'live-5',
 templeId: 't5',
 playbackUrl: 'https://www.youtube.com/embed/2nUrc1wE6do',
 status: 'live',
 viewerCount: 5420,
 peakViewers: 8000,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Somnath Temple',
 slug: 'somnath',
 city: 'Veraval',
 deityPrimary: 'Lord Shiva',
 images: [],
 },
 },
 {
 id: 'live-6',
 templeId: 't6',
 playbackUrl: 'https://www.youtube.com/embed/iVbl-AzlnOQ',
 status: 'live',
 viewerCount: 15200,
 peakViewers: 22000,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Sri Harmandir Sahib',
 slug: 'golden-temple',
 city: 'Amritsar',
 deityPrimary: 'Guru Granth Sahib',
 images: [],
 },
 },
 {
 id: 'live-7',
 templeId: 't7',
 playbackUrl: 'https://www.youtube.com/embed/B-9kVJ2orYA',
 status: 'live',
 viewerCount: 7100,
 peakViewers: 10000,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Ramanathaswamy Temple',
 slug: 'rameshwaram',
 city: 'Rameshwaram',
 deityPrimary: 'Lord Shiva (Ramanathaswamy)',
 images: [],
 },
 },
 {
 id: 'live-8',
 templeId: 't8',
 playbackUrl: 'https://www.youtube.com/embed/aZf664dsd9k',
 status: 'live',
 viewerCount: 4320,
 peakViewers: 6500,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Mata Vaishno Devi',
 slug: 'vaishno-devi',
 city: 'Katra',
 deityPrimary: 'Goddess Vaishno Devi',
 images: [],
 },
 },
];

const fallbackScheduledStreams: DarshanStream[] = [
 {
 id: 'sched-1',
 templeId: 's1',
 playbackUrl: 'https://www.youtube.com/embed/xwjC9u9Yn5E',
 status: 'scheduled',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: '5:30 AM',
 temple: {
 name: 'Jagannath Temple',
 slug: 'jagannath-puri',
 city: 'Puri',
 deityPrimary: 'Lord Jagannath',
 images: [],
 },
 },
 {
 id: 'sched-2',
 templeId: 's2',
 playbackUrl: 'https://www.youtube.com/embed/wgkX0RE0PWM',
 status: 'scheduled',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: '6:00 AM',
 temple: {
 name: 'Baba Baidyanath Dham',
 slug: 'baidyanath-dham',
 city: 'Kedarnath',
 deityPrimary: 'Lord Shiva',
 images: [],
 },
 },
 {
 id: 'sched-3',
 templeId: 's3',
 playbackUrl: 'https://www.youtube.com/embed/t5nRpg1j98k',
 status: 'scheduled',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: '7:00 AM',
 temple: {
 name: 'Tirumala Tirupati',
 slug: 'tirumala-tirupati',
 city: 'Badrinath',
 deityPrimary: 'Lord Vishnu',
 images: [],
 },
 },
 {
 id: 'sched-4',
 templeId: 's4',
 playbackUrl: 'https://www.youtube.com/embed/iVbl-AzlnOQ',
 status: 'scheduled',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: '7:30 AM',
 temple: {
 name: 'Dwarkadhish Temple',
 slug: 'dwarkadhish',
 city: 'Dwarka',
 deityPrimary: 'Lord Krishna',
 images: [],
 },
 },
];

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchLiveStreams(): Promise<{ streams: DarshanStream[]; upcoming: { templeSlug: string; nextSlot: string; startsInMin: number }[] }> {
 try {
 const res = await getLiveDarshan();
 if (!res || !Array.isArray(res.streams)) return { streams: fallbackLiveStreams, upcoming: [] };
 return {
   streams: res.streams.length > 0 ? res.streams : fallbackLiveStreams,
   upcoming: res.upcoming ?? [],
 };
 } catch {
 return { streams: fallbackLiveStreams, upcoming: [] };
 }
}

async function fetchScheduledStreams(): Promise<DarshanStream[]> {
 try {
 const res = await getScheduledDarshan();
 if (!res || !Array.isArray(res.streams)) return fallbackScheduledStreams;
 return res.streams.length > 0 ? res.streams : fallbackScheduledStreams;
 } catch {
 return fallbackScheduledStreams;
 }
}

async function StreamsBrowserSection() {
 const [live, scheduled] = await Promise.all([fetchLiveStreams(), fetchScheduledStreams()]);
 return <DarshanBrowser liveStreams={live.streams} upcomingNotes={live.upcoming} scheduledStreams={scheduled} />;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function DarshanPage() {
 const t = await getTranslations('darshan');
 const tCommon = await getTranslations('common');
 // TD-02: rows come from the real per-temple aarti data and are graded against
 // the IST clock at render time (page revalidates every 5 min), so LIVE means
 // live and every row links at the temple's own stream.
 const scheduleRows = darshanScheduleRows();
 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* Hero */}
 <section className="bg-[#ede9e3] py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center gap-3 mb-4">
 <div className="flex items-center gap-1.5 bg-red-500/10 text-red-600 text-sm font-semibold px-3 py-1.5 rounded-full border border-red-200/40">
 <Radio className="w-4 h-4" />
 <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
 {tCommon('live')}
 </div>
 <span className="text-surface-500 text-sm">
 {t('liveNow')}
 </span>
 </div>
 <h1 className={`${H1.catalogue} mb-3`}>
 {t('pageTitle')}
 </h1>
 <p className="prose-lead text-surface-500 max-w-2xl">
 {t('pageSubtitle')}
 </p>

 <Suspense
 fallback={
 <div className="mt-8 flex flex-wrap gap-3">
 <div className="h-12 w-64 max-w-md rounded-lg bg-white animate-pulse" />
 <div className="h-12 w-32 rounded-lg bg-white animate-pulse" />
 <div className="h-12 w-32 rounded-lg bg-white animate-pulse" />
 </div>
 }
 >
 <StreamsBrowserSection />
 </Suspense>
 </div>
 </section>

 {/* Daily Schedule */}
 <section className="py-10 border-t border-[var(--color-border)]">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-6">
 {t('scheduleSection')}
 </h2>

 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
 <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[var(--color-border)] text-sm font-semibold text-surface-400">
 <div className="col-span-2">Time</div>
 <div className="col-span-4">Temple</div>
 <div className="col-span-3">Event</div>
 <div className="col-span-2">Status</div>
 <div className="col-span-1"></div>
 </div>

 {scheduleRows.map((row, i) => {
 const reminderId = `schedule:${row.time}:${row.temple}:${row.event}`;
 return (
 <div
 key={i}
 className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 border-b border-[var(--color-border)]/50 last:border-0 text-sm items-center hover:bg-surface-200/30 transition-colors"
 >
 <div className="md:col-span-2 text-surface-500 font-medium">
 <span className="md:hidden text-surface-500 text-xs mr-2">Time:</span>
 {row.time}
 </div>
 <div className="md:col-span-4 text-surface-800 font-medium">
 <span className="md:hidden text-surface-500 text-xs mr-2">Temple:</span>
 {row.temple}
 </div>
 <div className="md:col-span-3 text-surface-400">
 <span className="md:hidden text-surface-500 text-xs mr-2">Event:</span>
 {row.event}
 </div>
 <div className="md:col-span-2">
 {row.status === 'live' ? (
 <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
 <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
 LIVE
 </span>
 ) : row.status === 'completed' ? (
 <span className="text-xs text-surface-600">Completed</span>
 ) : (
 <span className="text-xs text-surface-500">Upcoming</span>
 )}
 </div>
 <div className="md:col-span-1 md:text-right">
 {row.status === 'live' ? (
 <a
 href={row.href}
 className="text-saffron-400 hover:text-saffron-300 inline-flex"
 aria-label={`Watch ${row.temple} ${row.event} now`}
 >
 <Play className="w-4 h-4" />
 </a>
 ) : row.status === 'upcoming' ? (
 <DarshanScheduleRemindButton
 reminderId={reminderId}
 label={`${row.temple} ${row.event}`}
 />
 ) : null}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>
 </div>
 );
}
