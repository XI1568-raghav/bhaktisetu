// Unknown slugs render on-demand (ISR) instead of 404-ing into the global
// loading-flash not-found page. Page component detects unknown slugs and
// renders an honest "Coming soon" panel rather than silently falling back
// to Kashi Vishwanath content.
export const dynamicParams = true;
// No `revalidate`: this page is prerendered once and never re-rendered by the Cloudflare
// Worker (free plan: 10 ms CPU, and its asset cache cannot revalidate, so an expiring page
// is rendered per request, error 1102). Anything clock- or broadcast-dependent (current
// aarti slot, on-air probe) is resolved in the browser by DarshanAartiSchedule and
// DarshanChannelPlayerLive. Stream lists are read once at build time.
export function generateStaticParams() {
  return [
    'somnath-gujarat', 'somnath', 'tirumala-tirupati', 'tirupati',
    'golden-temple-amritsar', 'golden-temple', 'shirdi-sai-baba', 'shirdi',
    'kashi-vishwanath-varanasi', 'kashi-vishwanath',
    'siddhivinayak-mumbai', 'siddhivinayak',
    'mahakaleshwar-ujjain', 'mahakaleshwar',
    'vaishno-devi', 'jagannath-puri',
    // P0-18 (2026-06-15 audit) — temples linked from the /darshan browse page
    // (Ramanathaswamy, Baba Baidyanath Dham, Dwarkadhish) that have no live
    // stream yet. Prerendered here so /darshan/<slug> resolves to the honest
    // "Coming soon" panel (200) instead of 404 under @cloudflare/next-on-pages.
    'rameshwaram', 'baidyanath-dham', 'dwarkadhish',
  ].map((id) => ({ id }));
}
import type { Metadata } from 'next';
import {
 MapPin,
 Clock,
 Users,
 ChevronRight,
 Home,
 MessageCircle,
 ExternalLink,
 Star,
 Video,
} from 'lucide-react';
import {
 getLiveDarshan,
 getScheduledDarshan,
 type DarshanStream,
} from '../../../lib/api';
import DarshanPlayer from '../../../components/DarshanPlayer';
import YouTubeDarshanPlayer from '../../../components/YouTubeDarshanPlayer';
import DarshanChannelPlayerLive from '../../../components/DarshanChannelPlayerLive';
import DarshanAartiSchedule from '../../../components/DarshanAartiSchedule';
import { channelIdFromUrl, liveEmbedUrl, resolveDarshanUploads } from '../../../lib/youtube-darshan';
import AdSlot from '../../../components/AdSlot';
import { getTempleHero } from '../../../lib/images';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { canonicalTempleSlug } from '../../../lib/temple-slug';

// ─── YouTube stream URL lookup for fallback ──────────────────────────────────
// Channel IDs verified 2026-05-02 against YouTube RSS feed (200 = real, 404 = dead).
// Mirrors apps/api/src/routes/darshan.ts TEMPLE_LIVE_STREAMS — keep in sync.
// Lookup keys are accepted as both the canonical temple slug AND short alias.

function ytEmbed(channelId: string): string {
 return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1`;
}

// Slug → official YouTube channel ID. Used by resolveLivePlaybackUrl() at request
// time to probe the channel's RSS feed and pick latest VOD when no live stream is on.
const CHANNEL_BY_SLUG: Record<string, string> = {
 'somnath-gujarat': 'UCT1egsvA08YcdMLiEu1DTRg',
 'somnath': 'UCT1egsvA08YcdMLiEu1DTRg',
 'tirumala-tirupati': 'UCS2Y83GD-fc7qqgNW5uj41g',
 'tirupati': 'UCS2Y83GD-fc7qqgNW5uj41g',
 'golden-temple-amritsar': 'UCYn6UEtQ771a_OWSiNBoG8w',
 'golden-temple': 'UCYn6UEtQ771a_OWSiNBoG8w',
 'shirdi-sai-baba': 'UCKGvJDh7g_Kzocbwy7aKicA',
 'shirdi': 'UCKGvJDh7g_Kzocbwy7aKicA',
 'kashi-vishwanath-varanasi': 'UCdMj2twWfMHXrWgX5oVdoyA',
 'kashi-vishwanath': 'UCdMj2twWfMHXrWgX5oVdoyA',
 'siddhivinayak-mumbai': 'UCF9FdiMBENIbM6jb44zWmCQ',
 'siddhivinayak': 'UCF9FdiMBENIbM6jb44zWmCQ',
 'vaishno-devi': 'UCFYQr1l7ereS27SrLJ8bBtw',
 'vaishno-devi-katra': 'UCFYQr1l7ereS27SrLJ8bBtw',
 'jagannath-puri': 'UCstacpPsNLSiGcYe7qbF14Q',
};

const YOUTUBE_STREAMS: Record<string, string> = {
 'somnath-gujarat': ytEmbed('UCT1egsvA08YcdMLiEu1DTRg'),
 'somnath': ytEmbed('UCT1egsvA08YcdMLiEu1DTRg'),
 'tirumala-tirupati': ytEmbed('UCS2Y83GD-fc7qqgNW5uj41g'),
 'tirupati': ytEmbed('UCS2Y83GD-fc7qqgNW5uj41g'),
 'golden-temple-amritsar': ytEmbed('UCYn6UEtQ771a_OWSiNBoG8w'),
 'golden-temple': ytEmbed('UCYn6UEtQ771a_OWSiNBoG8w'),
 'shirdi-sai-baba': ytEmbed('UCKGvJDh7g_Kzocbwy7aKicA'),
 'shirdi': ytEmbed('UCKGvJDh7g_Kzocbwy7aKicA'),
 'kashi-vishwanath-varanasi': ytEmbed('UCdMj2twWfMHXrWgX5oVdoyA'),
 'kashi-vishwanath': ytEmbed('UCdMj2twWfMHXrWgX5oVdoyA'),
 'siddhivinayak-mumbai': ytEmbed('UCF9FdiMBENIbM6jb44zWmCQ'),
 'siddhivinayak': ytEmbed('UCF9FdiMBENIbM6jb44zWmCQ'),
 'vaishno-devi': ytEmbed('UCFYQr1l7ereS27SrLJ8bBtw'),
 'jagannath-puri': ytEmbed('UCstacpPsNLSiGcYe7qbF14Q'),
 // Bonus extras for related-temples links
 // ISKCON Vrindavan — UCAA6IsLVfbHrP1I_lzxv09Q (verified 2026-05-02, daily "Live Darshan" + SB classes).
 // Replaced UCvjJr9LuZcvKMGldK7e631Q which had only 1 video from June 2025.
 'iskcon-vrindavan': ytEmbed('UCAA6IsLVfbHrP1I_lzxv09Q'),
};

// DF-10 (2026-08-24): `viewerCount`/`peakViewers` are pinned to 0 throughout
// this library. They previously carried invented audiences — 12450/24000 for
// Kashi, 28300/52000 for Tirupati — which is the same figure the 2026-05-02
// content audit deleted from the homepage (docs/content-audit-2026-05-02.md:31)
// and which then went on shipping here. Nothing on this page counts an
// audience; the DF-10 note at the stream-info block below already says why the
// "{viewerCount} watching" line was removed, and the numbers feeding it are now
// removed too so a future edit cannot resurrect the line from live-looking data.
//
// Kept as 0 rather than deleted because DarshanStream requires both fields as
// `number` (lib/api.ts:370-371); 0 is this codebase's "not counted" and it is
// what suppresses the player badge (components/DarshanPlayer.tsx:225).
const FALLBACK_TEMPLE_LIBRARY: Record<string, DarshanStream> = {
 'kashi-vishwanath': {
 id: 'live-kashi',
 templeId: 'temple-kashi',
 playbackUrl: ytEmbed('UCdMj2twWfMHXrWgX5oVdoyA'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Shri Kashi Vishwanath Temple',
 slug: 'kashi-vishwanath-varanasi',
 city: 'Varanasi',
 deityPrimary: 'Lord Shiva',
 images: [],
 },
 },
 'somnath': {
 id: 'live-somnath',
 templeId: 'temple-somnath',
 playbackUrl: ytEmbed('UCT1egsvA08YcdMLiEu1DTRg'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Somnath Temple',
 slug: 'somnath-gujarat',
 city: 'Veraval',
 deityPrimary: 'Lord Shiva',
 images: [],
 },
 },
 'tirupati': {
 id: 'live-ttd',
 templeId: 'temple-ttd',
 playbackUrl: ytEmbed('UCS2Y83GD-fc7qqgNW5uj41g'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Tirumala Venkateswara Temple (SVBC)',
 slug: 'tirumala-tirupati',
 city: 'Tirupati',
 deityPrimary: 'Lord Venkateswara',
 images: [],
 },
 },
 'golden-temple': {
 id: 'live-golden-temple',
 templeId: 'temple-golden',
 playbackUrl: ytEmbed('UCYn6UEtQ771a_OWSiNBoG8w'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Golden Temple (Harmandir Sahib)',
 slug: 'golden-temple-amritsar',
 city: 'Amritsar',
 deityPrimary: 'Guru Granth Sahib',
 images: [],
 },
 },
 'shirdi': {
 id: 'live-shirdi',
 templeId: 'temple-shirdi',
 playbackUrl: ytEmbed('UCKGvJDh7g_Kzocbwy7aKicA'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Shri Sai Baba Sansthan Temple',
 slug: 'shirdi-sai-baba',
 city: 'Shirdi',
 deityPrimary: 'Sai Baba',
 images: [],
 },
 },
 'siddhivinayak': {
 id: 'live-siddhivinayak',
 templeId: 'temple-siddhi',
 playbackUrl: ytEmbed('UCF9FdiMBENIbM6jb44zWmCQ'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Shree Siddhivinayak Temple',
 slug: 'siddhivinayak-mumbai',
 city: 'Mumbai',
 deityPrimary: 'Lord Ganesha',
 images: [],
 },
 },
 'vaishno-devi': {
 id: 'live-vaishno-devi',
 templeId: 'temple-vaishno',
 playbackUrl: ytEmbed('UCFYQr1l7ereS27SrLJ8bBtw'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Shri Mata Vaishno Devi Temple',
 slug: 'vaishno-devi',
 city: 'Katra',
 deityPrimary: 'Goddess Vaishno Devi',
 images: [],
 },
 },
 'jagannath-puri': {
 id: 'live-jagannath',
 templeId: 'temple-jagannath',
 playbackUrl: ytEmbed('UCstacpPsNLSiGcYe7qbF14Q'),
 status: 'live',
 viewerCount: 0,
 peakViewers: 0,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Jagannath Temple',
 slug: 'jagannath-puri',
 city: 'Puri',
 deityPrimary: 'Lord Jagannath',
 images: [],
 },
 },
};

const FALLBACK_KEY_BY_SLUG: Record<string, keyof typeof FALLBACK_TEMPLE_LIBRARY> = {
 'kashi-vishwanath': 'kashi-vishwanath',
 'kashi-vishwanath-varanasi': 'kashi-vishwanath',
 'somnath': 'somnath',
 'somnath-gujarat': 'somnath',
 'tirumala-tirupati': 'tirupati',
 'tirupati': 'tirupati',
 'golden-temple': 'golden-temple',
 'golden-temple-amritsar': 'golden-temple',
 'shirdi': 'shirdi',
 'shirdi-sai-baba': 'shirdi',
 'siddhivinayak': 'siddhivinayak',
 'siddhivinayak-mumbai': 'siddhivinayak',
 'vaishno-devi': 'vaishno-devi',
 'jagannath-puri': 'jagannath-puri',
};

const fallbackSchedule = [
 { time: '3:00 AM', event: 'Mangala Aarti', status: 'completed' },
 { time: '4:00 AM', event: 'Shringar Aarti', status: 'completed' },
 { time: '5:00 AM', event: 'Abhishek Darshan', status: 'live' },
 { time: '11:30 AM', event: 'Bhog Aarti', status: 'upcoming' },
 { time: '12:00 PM', event: 'Afternoon Shringar', status: 'upcoming' },
 { time: '7:00 PM', event: 'Sandhya Aarti', status: 'upcoming' },
 { time: '9:00 PM', event: 'Shayan Aarti', status: 'upcoming' },
];

// DF-10: the `viewers` key is gone from these rows (9800 / 5420 / 0 — invented,
// and 0 for Kedarnath was no better sourced than the other two). The Related
// Temples list only ever rendered `isLive` as a digit-free LIVE pill, so the
// numbers were dead weight that any future edit could have wired to the screen.
const fallbackRelatedTemples = [
 {
 name: 'Mahakaleshwar Temple',
 city: 'Ujjain',
 deity: 'Lord Shiva',
 slug: 'mahakaleshwar',
 isLive: false,
 },
 {
 name: 'Somnath Temple',
 city: 'Veraval',
 deity: 'Lord Shiva',
 slug: 'somnath',
 isLive: true,
 },
 {
 name: 'Kedarnath Temple',
 city: 'Kedarnath',
 deity: 'Lord Shiva',
 slug: 'kedarnath',
 isLive: false,
 },
];

// ─── Data fetching ────────────────────────────────────────────────────────────

// `idOrSlug` accepts either the stream id (e.g. live-somnath) or the temple slug
// (e.g. somnath-gujarat). DarshanBrowser links to /darshan/<slug>, so slug is the hot path.
// Returns null when neither the API nor the static fallback library knows the slug —
// the page renders a "Coming soon" panel for that case rather than silently serving
// Kashi Vishwanath content under another temple's URL.
async function getStreamById(idOrSlug: string): Promise<DarshanStream | null> {
 try {
 const [liveRes, scheduledRes] = await Promise.all([
 getLiveDarshan({ buildTime: true }),
 getScheduledDarshan({ buildTime: true }),
 ]);
 const allStreams = [...liveRes.streams, ...scheduledRes.streams];
 const found =
 allStreams.find((s) => s.id === idOrSlug) ||
 allStreams.find((s) => s.temple.slug === idOrSlug);
 if (found) return found;
 } catch {
 // API unavailable, fall through to static library
 }
 const fallbackKey = FALLBACK_KEY_BY_SLUG[idOrSlug];
 if (fallbackKey) {
 const entry = FALLBACK_TEMPLE_LIBRARY[fallbackKey];
 if (entry) return entry;
 }
 return null;
}

function humanizeSlug(slug: string): string {
 return slug
 .split('-')
 .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
 .join(' ');
}

async function getRelatedStreams(
 currentId: string
): Promise<DarshanStream[]> {
 try {
 const res = await getLiveDarshan({ buildTime: true });
 return res.streams.filter((s) => s.id !== currentId).slice(0, 4);
 } catch {
 return [];
 }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
 params,
}: {
 params: Promise<{ id: string }>;
}): Promise<Metadata> {
 const { id } = await params;
 const stream = await getStreamById(id);
 if (!stream) {
 const name = humanizeSlug(id);
 return {
 title: `${name} — Live Darshan Coming Soon`,
 description: `Live darshan from ${name} is not yet available on Darshya. Browse 16 active temple streams or request this temple.`,
 robots: { index: false, follow: true },
 };
 }
 const title = `Live Darshan — ${stream.temple.name}, ${stream.temple.city}`;
 const description = `Watch live darshan from ${stream.temple.name} in ${stream.temple.city}. Daily aarti & continuous live stream from the official temple channel. ${stream.temple.deityPrimary}.`;
 const url = `https://darshya.online/darshan/${stream.temple.slug}`;
 return {
 title,
 description,
 alternates: { canonical: url },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title,
 description,
 url,
 type: 'website',
 siteName: 'Darshya',
 },
 twitter: {
 card: 'summary_large_image',
 title,
 description,
 },
 };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function DarshanDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const stream = await getStreamById(id);

 // Unknown slug: render honest "Coming soon" panel instead of silently
 // falling back to a different temple's live stream.
 if (!stream) {
 const name = humanizeSlug(id);
 const activeRelated = await getRelatedStreams(id);
 const browseList = activeRelated.length > 0
 ? activeRelated.slice(0, 6)
 : Object.values(FALLBACK_TEMPLE_LIBRARY).slice(0, 6);
 return (
 <div className="min-h-[100dvh] bg-[#2a2520]">
 <div className="border-b border-surface-700">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
 <nav className="flex items-center gap-1.5 text-sm text-surface-500">
 <a href="/" className="hover:text-saffron-400 transition-colors flex items-center gap-1">
 <Home className="w-3.5 h-3.5" />
 Home
 </a>
 <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
 <a href="/darshan" className="hover:text-saffron-400 transition-colors">Live Darshan</a>
 <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
 <span className="text-surface-300 font-medium truncate max-w-[200px]">{name}</span>
 </nav>
 </div>
 </div>
 <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
 <div className="bg-surface-800 border border-surface-700 rounded-2xl p-8 text-center">
 <Video className="w-12 h-12 text-saffron-400 mx-auto mb-4 opacity-80" />
 <h1 className={`${H1.portalInverse} mb-2`}>{name}</h1>
 <p className="text-surface-400 mb-1">Live darshan coming soon</p>
 <p className="prose-meta text-surface-500 max-w-md mx-auto mb-6">
 We don&rsquo;t have an active live stream for this temple yet. Browse the temples
 streaming right now below, or visit our full directory.
 </p>
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <a
 href="/darshan"
 className={buttonClass('primary', 'md')}
 >
 Browse All Live Streams
 <ChevronRight className="w-4 h-4" />
 </a>
 <a
 href="/temples"
 className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 border border-surface-600 text-surface-200 font-semibold text-sm rounded-lg hover:border-saffron-400 hover:text-saffron-300 transition-colors"
 >
 Temple Directory
 </a>
 </div>
 </div>

 <div className="mt-10">
 <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
 Streaming Right Now
 </h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {browseList.map((s) => (
 <a
 key={s.id}
 href={`/darshan/${s.temple.slug}`}
 className="group flex items-start gap-3 p-4 bg-surface-800 border border-surface-700 rounded-xl hover:border-saffron-400 transition-colors"
 >
 <div className="w-12 h-12 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
 <Video className="w-5 h-5 text-surface-500" />
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-semibold text-white truncate group-hover:text-saffron-400 transition-colors">
 {s.temple.name}
 </h3>
 <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
 <MapPin className="w-3 h-3" />
 {s.temple.city}
 </p>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-xs text-surface-600">{s.temple.deityPrimary}</span>
 {s.status === 'live' && (
 <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
 <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
 LIVE
 </span>
 )}
 </div>
 </div>
 </a>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 }

 const relatedStreams = await getRelatedStreams(id);
 const isLive = stream.status === 'live';
 const firstImg = stream.temple.images?.[0];
 const templeImage =
 typeof firstImg === 'string'
 ? firstImg
 : firstImg && typeof firstImg === 'object' && 'url' in firstImg
 ? firstImg.url
 : getTempleHero(stream.temple.slug);

 // Channel first: the API's youtubeChannelId (DB row or fallback table), then
 // the static slug map, then a channel= param inside the stored playbackUrl. A
 // channel gets the live_stream embed, else its newest upload (never a pinned
 // video id, which goes dead once that broadcast is withdrawn).
 const channelId =
 stream.youtubeChannelId ??
 CHANNEL_BY_SLUG[stream.temple.slug] ??
 CHANNEL_BY_SLUG[id] ??
 channelIdFromUrl(stream.playbackUrl) ??
 null;
 const uploads = channelId ? await resolveDarshanUploads(channelId) : null;
 const playbackUrl = channelId
 ? liveEmbedUrl(channelId)
 : (stream.playbackUrl || YOUTUBE_STREAMS[stream.temple.slug] || null);

 return (
 <div className="min-h-[100dvh] bg-[#2a2520]">
 {/* Breadcrumb */}
 <div className="border-b border-surface-700">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
 <nav className="flex items-center gap-1.5 text-sm text-surface-500">
 <a
 href="/"
 className="hover:text-saffron-400 transition-colors flex items-center gap-1"
 >
 <Home className="w-3.5 h-3.5" />
 Home
 </a>
 <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
 <a
 href="/darshan"
 className="hover:text-saffron-400 transition-colors"
 >
 Live Darshan
 </a>
 <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
 <span className="text-surface-300 font-medium truncate max-w-[200px]">
 {stream.temple.name}
 </span>
 </nav>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Main — Video Player */}
 <div className="lg:col-span-2 space-y-6">
 <AdSlot slotId="DARSHAN_BANNER" format="horizontal" label="Sponsored" />
 {/* Player */}
 {channelId ? (
 <DarshanChannelPlayerLive
 channelId={channelId}
 templeName={stream.temple.name}
 streamKey={stream.temple.slug}
 initialUploads={uploads ?? []}
 attribution={stream.attribution}
 />
 ) : stream.streamProvider === 'YOUTUBE' ? (
 <YouTubeDarshanPlayer
 videoId={stream.youtubeVideoId}
 channelId={stream.youtubeChannelId}
 attribution={stream.attribution}
 />
 ) : stream.streamProvider === 'EXTERNAL_RTMP' ? (
 <div className="aspect-video bg-surface-100 flex items-center justify-center text-surface-400 rounded-xl">
 Stream offline
 </div>
 ) : (
 <DarshanPlayer
 streamUrl={playbackUrl}
 templeName={stream.temple.name}
 templeSlug={stream.temple.slug}
 isLive={isLive}
 // DF-10: 0 rather than the fabricated fallback figure. The player
 // renders its counter only when the count is positive, so this hides
 // the badge instead of printing a zero.
 viewerCount={0}
 isPremium={stream.isPremium}
 currentEvent={isLive ? 'Live Darshan' : undefined}
 scheduledStart={stream.scheduledStart}
 templeCity={stream.temple.city}
 templeDeity={stream.temple.deityPrimary}
 templeImage={templeImage}
 />
 )}

 {/* Stream info */}
 <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
 <div className="flex items-start justify-between">
 <div>
 <h1 className={H1.portalInverse}>
 {stream.temple.name}
 </h1>
 <div className="flex items-center gap-3 mt-2 text-sm text-surface-400">
 <span className="flex items-center gap-1">
 <MapPin className="w-4 h-4" />
 {stream.temple.city}
 </span>
 <span>{stream.temple.deityPrimary}</span>
 {/* DF-10 (prod sweep 2026-08-12): this printed
   "{viewerCount} watching" from a literal in the fallback library
   below — 12,450 for Kashi. Nothing on this page measures the
   audience; the YouTube embed exposes no viewer API to us, and the
   real count is visible inside the player itself, where anyone can
   read it and see it disagree. Restore when the YouTube Data API is
   wired and the number is sourced. */}
 </div>
 </div>
 <div className="hidden sm:flex items-center gap-4 shrink-0">
 {(() => {
 const cid =
 stream.youtubeChannelId ||
 (playbackUrl?.match(/channel=(UC[A-Za-z0-9_-]{22})/)?.[1] ?? null);
 return cid ? (
 <a
 href={`https://www.youtube.com/channel/${cid}/live`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 text-sm text-saffron-400 font-semibold hover:text-saffron-300 transition-colors"
 >
 Watch on YouTube
 <ExternalLink className="w-4 h-4" />
 </a>
 ) : null;
 })()}
 <a
 href={`/temples/${canonicalTempleSlug(stream.temple.slug)}`}
 className="inline-flex items-center gap-1.5 text-sm text-saffron-400 font-semibold hover:text-saffron-300 transition-colors"
 >
 Temple Page
 <ExternalLink className="w-4 h-4" />
 </a>
 </div>
 </div>

 {/* Quick stats */}
 <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-surface-700">
 <div>
 <div className="text-xs text-surface-500 font-medium uppercase">
 Status
 </div>
 <div className="mt-1">
 {isLive ? (
 <span className="inline-flex items-center gap-1 text-sm font-bold text-red-400">
 <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
 LIVE
 </span>
 ) : (
 <span className="text-sm text-surface-400">Scheduled</span>
 )}
 </div>
 </div>
 {/* DF-10: "PEAK VIEWERS 24,000" and "QUALITY HD 1080p" were both
   literals. Neither is measured anywhere — the stream's resolution is
   whatever the temple's own broadcast is, which this page never reads. */}
 </div>
 </div>

 {/* Today's Schedule — IST aarti slots per temple, graded against the clock in the browser */}
 <DarshanAartiSchedule
 templeSlugs={[stream.temple.slug, id]}
 fallbackSchedule={fallbackSchedule}
 />

 {/* Chat / Prayer request placeholder */}
 <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
 <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 <MessageCircle className="w-5 h-5 text-saffron-400" />
 Live Chat & Prayer Requests
 </h2>
 <div className="bg-surface-700/50 rounded-xl p-8 text-center">
 <MessageCircle className="w-10 h-10 text-surface-600 mx-auto mb-3" />
 <p className="text-surface-400 text-sm mb-4">
 Join the community chat and submit prayer requests during live
 darshan.
 </p>
 <button className={buttonClass('primary', 'md')}>
 <MessageCircle className="w-4 h-4" />
 Join Chat
 </button>
 </div>
 </div>
 </div>

 {/* Sidebar */}
 <div className="space-y-6">
 {/* Temple info card */}
 <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
 <h3 className="font-bold text-white mb-4">Temple Information</h3>
 <div className="space-y-4">
 <div>
 <div className="text-xs text-surface-500 font-medium uppercase mb-1">
 Name
 </div>
 <div className="text-white font-semibold">
 {stream.temple.name}
 </div>
 </div>
 <div>
 <div className="text-xs text-surface-500 font-medium uppercase mb-1">
 Primary Deity
 </div>
 <div className="text-surface-300">
 {stream.temple.deityPrimary}
 </div>
 </div>
 <div>
 <div className="text-xs text-surface-500 font-medium uppercase mb-1">
 Location
 </div>
 <div className="text-surface-300 flex items-center gap-1">
 <MapPin className="w-3.5 h-3.5" />
 {stream.temple.city}
 </div>
 </div>
 </div>
 <a
 href={`/temples/${canonicalTempleSlug(stream.temple.slug)}`}
 className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors"
 >
 View Temple Details
 <ExternalLink className="w-4 h-4" />
 </a>
 </div>

 {/* Related Temples */}
 <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
 <h3 className="font-bold text-white mb-4">
 Related Temples
 </h3>
 <div className="space-y-4">
 {(relatedStreams.length > 0
 ? relatedStreams.map((s) => ({
 name: s.temple.name,
 city: s.temple.city,
 deity: s.temple.deityPrimary,
 slug: s.temple.slug,
 isLive: s.status === 'live',
 streamId: s.id,
 }))
 : fallbackRelatedTemples.map((t) => ({
 ...t,
 streamId: t.slug,
 }))
 ).map((temple) => (
 <a
 key={temple.name}
 href={`/darshan/${temple.streamId}`}
 className="group flex items-start gap-3 pb-4 border-b border-surface-700/50 last:border-0 last:pb-0"
 >
 <div className="w-12 h-12 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
 <Video className="w-5 h-5 text-surface-600" />
 </div>
 <div className="min-w-0">
 <h4 className="text-sm font-semibold text-white truncate group-hover:text-saffron-400 transition-colors">
 {temple.name}
 </h4>
 <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
 <MapPin className="w-3 h-3" />
 {temple.city}
 </p>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-xs text-surface-600">
 {temple.deity}
 </span>
 {temple.isLive && (
 <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
 <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
 LIVE
 </span>
 )}
 </div>
 </div>
 </a>
 ))}
 </div>
 </div>

 {/* Book Puja CTA */}
 <div className="bg-gradient-to-br from-saffron-600 to-temple-gold rounded-xl p-6 text-white">
 <Star className="w-8 h-8 mb-3 opacity-80" />
 <h3 className="font-bold text-lg mb-2">Book a Puja</h3>
 <p className="text-sm text-saffron-100 mb-4">
 Book a special puja at {stream.temple.name} performed by
 pandits with video proof.
 </p>
 <a
 href={`/temples/${canonicalTempleSlug(stream.temple.slug)}`}
 className="block w-full py-2.5 bg-white text-saffron-700 font-semibold text-sm rounded-xl hover:bg-saffron-50 transition-colors text-center"
 >
 Browse Pujas
 </a>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
