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
// NOTIF-15: the real, server-registered reminder. See the section below.
import AartiOptIn from '../../components/AartiOptIn';
import { darshanScheduleRows } from '../../lib/darshan-schedule';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/darshan' },
 title: 'Live Darshan',
 description:
 'Watch live darshan from India’s most sacred temples. Temple aarti and ceremony streams, free, following each temple’s own schedule.',
};

// Day-sync ISR: regenerate every 5 min so the live-now list reflects current
// aarti windows (matches /darshan/[id] detail page revalidate cadence).
export const revalidate = 300;

// ─── Fallback data ────────────────────────────────────────────────────────────

// DF-10 (2026-08-24): every `viewerCount`/`peakViewers` below is pinned to 0.
// They used to carry invented audiences (12450 for Kashi, 28300 for Tirupati —
// the same figures the 2026-05-02 content audit deleted from the homepage, see
// docs/content-audit-2026-05-02.md:31). Nothing here counts viewers: no
// analytics client is mounted, and the YouTube embeds expose no viewer API to
// us. Per lib/platform-stats.ts:5-24 an uncounted number must lose its digits
// rather than fall back to a literal, and the LIVE pill already makes the
// liveness claim without one.
//
// 0 rather than a deleted field because DarshanStream requires both as `number`
// (lib/api.ts:370-371), and 0 is how the rest of this codebase says "not
// counted" — DarshanPlayer renders its counter only when the value is positive
// (components/DarshanPlayer.tsx:225). See the note in fetchLiveStreams below
// for the one consumer that does NOT yet guard on that.
const fallbackLiveStreams: DarshanStream[] = [
 {
 id: 'live-1',
 templeId: 't1',
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCdMj2twWfMHXrWgX5oVdoyA',
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
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
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCS2Y83GD-fc7qqgNW5uj41g',
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
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
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCF9FdiMBENIbM6jb44zWmCQ',
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
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
 viewerCount: 0,
 peakViewers: 0,
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
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCT1egsvA08YcdMLiEu1DTRg',
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
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
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCYn6UEtQ771a_OWSiNBoG8w',
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
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
 viewerCount: 0,
 peakViewers: 0,
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
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCFYQr1l7ereS27SrLJ8bBtw',
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
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
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCstacpPsNLSiGcYe7qbF14Q',
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
 playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCS2Y83GD-fc7qqgNW5uj41g',
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

// DF-10 follow-up, NOT fixable from this file: DarshanBrowser prints the count
// unconditionally (components/DarshanBrowser.tsx:282-285 —
// `stream.viewerCount.toLocaleString('en-IN')` beside an Eye icon, with no
// `> 0` guard the way DarshanPlayer has at components/DarshanPlayer.tsx:225).
// So the zeroed fallbacks above surface as a literal "0" on each card until
// that badge gains the same guard or is removed. "0 watching" is still an
// unmeasured claim, just a discouraging one — it is not the end state.
//
// The same invented figures also live in the API fallback table
// (apps/api/src/routes/darshan.ts:20-124), which is what these local fallbacks
// stand in for when the API is unreachable. Zeroing one side does not zero the
// other.
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

 {/*
   NOTIF-15 — the reminder that actually reaches a server.

   The bell on each row below writes to localStorage and nothing else: no
   fetch, no push subscription, no scheduled row, and there is no
   DarshanReminder model for it to write to. An earlier pass made that
   control HONEST — it is a bookmark icon now, it says "Saved on this
   device", and it no longer claims a reminder was set — but honest is
   not the same as delivered, and the page still offered no way to be
   told about an aarti at all.

   `AartiOptIn` is the other half, and it already existed: it requests
   notification permission, subscribes through PushManager and POSTs the
   endpoint to /notifications/register-token with `aartiOptIn: true`, so
   the server knows and the aarti job has something to read. It was
   imported by NOTHING in app/ — a working control nobody could reach.
   Mounted here, at the top of the schedule the finding is about, the
   page finally offers a reminder that leaves the browser.

   The per-row bookmarks stay: they are a useful device-local shortlist
   and they no longer lie about what they are.
 */}
 <div className="mb-6 max-w-xl">
 <AartiOptIn />
 </div>

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
