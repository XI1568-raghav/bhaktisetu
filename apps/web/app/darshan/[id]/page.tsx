export const runtime = 'edge';
import type { Metadata } from 'next';
import {
 MapPin,
 Clock,
 Calendar,
 Users,
 ChevronRight,
 Home,
 MessageCircle,
 Bell,
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
import AdSlot from '../../../components/AdSlot';
import { getTempleHero } from '../../../lib/images';

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
 'mahakaleshwar-ujjain': 'UC7q12ONY2mvuq066rreluhQ',
 'mahakaleshwar': 'UC7q12ONY2mvuq066rreluhQ',
 'vaishno-devi': 'UCziZy6xAlJWPzgIY4duxAeQ',
 'jagannath-puri': 'UCstacpPsNLSiGcYe7qbF14Q',
};

/**
 * Server-side resolver: try the channel's live_stream embed; if the channel
 * has no current broadcast (live_stream HEAD returns 200 but the rendered
 * iframe is "video unavailable"), fall back to the latest VOD from the
 * channel's RSS feed. RSS has no auth + no quota cost.
 *
 * Live detection heuristic: parse the public RSS feed and look for a recent
 * entry whose <title> contains "live" / "लाइव" / "लाइव्ह" — temple channels
 * almost always title their broadcasts that way. If found, prefer the live
 * entry videoId over live_stream. Otherwise fall back to latest non-live VOD.
 */
async function resolveLivePlaybackUrl(channelId: string): Promise<string | null> {
 try {
   const xml = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
     headers: { 'User-Agent': 'Mozilla/5.0 (Darshya/1.0)' },
     next: { revalidate: 300 }, // 5-min ISR cache
   }).then((r) => (r.ok ? r.text() : null));
   if (!xml) return null;

   // Pick the entry whose title looks live-ish first; else latest entry.
   const entries = [...xml.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>/g)];
   // Empty feed → channel has no public videos. Don't render a broken iframe.
   if (entries.length === 0) return null;

   const liveEntry = entries.find(([, , title]) => /\b(live|लाइव|थेट|प्रसारण)\b/i.test(title!));
   const pick = liveEntry ?? entries[0]!;
   const videoId = pick[1]!;
   return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0`;
 } catch {
   return null;
 }
}

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
 'mahakaleshwar-ujjain': ytEmbed('UC7q12ONY2mvuq066rreluhQ'),
 'mahakaleshwar': ytEmbed('UC7q12ONY2mvuq066rreluhQ'),
 'vaishno-devi': ytEmbed('UCziZy6xAlJWPzgIY4duxAeQ'),
 'jagannath-puri': ytEmbed('UCstacpPsNLSiGcYe7qbF14Q'),
 // Bonus extras for related-temples links
 // ISKCON Vrindavan — UCAA6IsLVfbHrP1I_lzxv09Q (verified 2026-05-02, daily "Live Darshan" + SB classes).
 // Replaced UCvjJr9LuZcvKMGldK7e631Q which had only 1 video from June 2025.
 'iskcon-vrindavan': ytEmbed('UCAA6IsLVfbHrP1I_lzxv09Q'),
};

const FALLBACK_TEMPLE_LIBRARY: Record<string, DarshanStream> = {
 'kashi-vishwanath': {
 id: 'live-kashi',
 templeId: 'temple-kashi',
 playbackUrl: ytEmbed('UCdMj2twWfMHXrWgX5oVdoyA'),
 status: 'live',
 viewerCount: 12450,
 peakViewers: 24000,
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
 viewerCount: 8450,
 peakViewers: 15200,
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
 viewerCount: 28300,
 peakViewers: 52000,
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
 viewerCount: 15600,
 peakViewers: 32000,
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
 viewerCount: 6200,
 peakViewers: 18000,
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
 viewerCount: 8760,
 peakViewers: 14000,
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
 'mahakaleshwar': {
 id: 'live-mahakaleshwar',
 templeId: 'temple-mahakal',
 playbackUrl: ytEmbed('UC7q12ONY2mvuq066rreluhQ'),
 status: 'live',
 viewerCount: 9400,
 peakViewers: 22000,
 isPremium: false,
 scheduledStart: null,
 temple: {
 name: 'Mahakaleshwar Temple',
 slug: 'mahakaleshwar-ujjain',
 city: 'Ujjain',
 deityPrimary: 'Lord Shiva',
 images: [],
 },
 },
 'vaishno-devi': {
 id: 'live-vaishno-devi',
 templeId: 'temple-vaishno',
 playbackUrl: ytEmbed('UCziZy6xAlJWPzgIY4duxAeQ'),
 status: 'live',
 viewerCount: 5800,
 peakViewers: 16000,
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
 viewerCount: 7300,
 peakViewers: 45000,
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
 'mahakaleshwar': 'mahakaleshwar',
 'mahakaleshwar-ujjain': 'mahakaleshwar',
 'vaishno-devi': 'vaishno-devi',
 'jagannath-puri': 'jagannath-puri',
};

// Default-of-defaults if even the slug map fails. Non-null since the key is hardcoded above.
const fallbackStream: DarshanStream = FALLBACK_TEMPLE_LIBRARY['kashi-vishwanath']!;

const fallbackSchedule = [
 { time: '3:00 AM', event: 'Mangala Aarti', status: 'completed' },
 { time: '4:00 AM', event: 'Shringar Aarti', status: 'completed' },
 { time: '5:00 AM', event: 'Abhishek Darshan', status: 'live' },
 { time: '11:30 AM', event: 'Bhog Aarti', status: 'upcoming' },
 { time: '12:00 PM', event: 'Afternoon Shringar', status: 'upcoming' },
 { time: '7:00 PM', event: 'Sandhya Aarti', status: 'upcoming' },
 { time: '9:00 PM', event: 'Shayan Aarti', status: 'upcoming' },
];

const fallbackRelatedTemples = [
 {
 name: 'Mahakaleshwar Temple',
 city: 'Ujjain',
 deity: 'Lord Shiva',
 slug: 'mahakaleshwar',
 isLive: true,
 viewers: 9800,
 },
 {
 name: 'Somnath Temple',
 city: 'Veraval',
 deity: 'Lord Shiva',
 slug: 'somnath',
 isLive: true,
 viewers: 5420,
 },
 {
 name: 'Kedarnath Temple',
 city: 'Kedarnath',
 deity: 'Lord Shiva',
 slug: 'kedarnath',
 isLive: false,
 viewers: 0,
 },
];

// ─── Data fetching ────────────────────────────────────────────────────────────

// `idOrSlug` accepts either the stream id (e.g. live-somnath) or the temple slug
// (e.g. somnath-gujarat). DarshanBrowser links to /darshan/<slug>, so slug is the hot path.
async function getStreamById(idOrSlug: string): Promise<DarshanStream> {
 try {
 const [liveRes, scheduledRes] = await Promise.all([
 getLiveDarshan(),
 getScheduledDarshan(),
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
 return fallbackStream;
}

async function getRelatedStreams(
 currentId: string
): Promise<DarshanStream[]> {
 try {
 const res = await getLiveDarshan();
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
 const title = `Live Darshan — ${stream.temple.name}, ${stream.temple.city}`;
 const description = `Watch live darshan from ${stream.temple.name} in ${stream.temple.city}. Daily aarti & continuous live stream from the official temple channel. ${stream.temple.deityPrimary}.`;
 const url = `https://darshya.online/darshan/${stream.temple.slug}`;
 return {
 title,
 description,
 alternates: { canonical: url },
 openGraph: {
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
 const relatedStreams = await getRelatedStreams(id);

 const isLive = stream.status === 'live';
 const firstImg = stream.temple.images?.[0];
 const templeImage =
 typeof firstImg === 'string'
 ? firstImg
 : firstImg && typeof firstImg === 'object' && 'url' in firstImg
 ? firstImg.url
 : getTempleHero(stream.temple.slug);

 // Resolve the playback URL. Tier 1: live_stream (active broadcast).
 // Tier 2: latest VOD via RSS — keeps the player useful 24/7. The
 // resolveLivePlaybackUrl() picks live entry from RSS first, else latest VOD.
 const channelId = CHANNEL_BY_SLUG[stream.temple.slug] ?? CHANNEL_BY_SLUG[id] ?? null;
 const playbackUrl = channelId
 ? await resolveLivePlaybackUrl(channelId)
 : (stream.playbackUrl || YOUTUBE_STREAMS[stream.temple.slug] || null);

 return (
 <div className="min-h-screen bg-[#2a2520]">
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
 {stream.streamProvider === 'YOUTUBE' ? (
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
 viewerCount={stream.viewerCount}
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
 <h1 className="text-xl sm:text-2xl font-bold text-white">
 {stream.temple.name}
 </h1>
 <div className="flex items-center gap-3 mt-2 text-sm text-surface-400">
 <span className="flex items-center gap-1">
 <MapPin className="w-4 h-4" />
 {stream.temple.city}
 </span>
 <span>{stream.temple.deityPrimary}</span>
 {isLive && (
 <span className="flex items-center gap-1 text-red-400">
 <Users className="w-4 h-4" />
 {stream.viewerCount.toLocaleString('en-IN')} watching
 </span>
 )}
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
 href={`/temples/${stream.temple.slug}`}
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
 <div>
 <div className="text-xs text-surface-500 font-medium uppercase">
 Peak Viewers
 </div>
 <div className="text-sm font-semibold text-white mt-1">
 {stream.peakViewers.toLocaleString('en-IN')}
 </div>
 </div>
 <div>
 <div className="text-xs text-surface-500 font-medium uppercase">
 Quality
 </div>
 <div className="text-sm font-semibold text-white mt-1">
 HD 1080p
 </div>
 </div>
 </div>
 </div>

 {/* Today's Schedule */}
 <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
 <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-saffron-400" />
 Today&rsquo;s Schedule
 </h2>
 <div className="space-y-0">
 {fallbackSchedule.map((item, i) => (
 <div
 key={i}
 className="flex items-center gap-4 py-3 border-b border-surface-700/50 last:border-0"
 >
 <span className="text-sm text-surface-400 font-medium w-20 shrink-0">
 {item.time}
 </span>
 <span className="text-sm text-white flex-1">
 {item.event}
 </span>
 <div>
 {item.status === 'live' ? (
 <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
 <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
 LIVE
 </span>
 ) : item.status === 'completed' ? (
 <span className="text-xs text-surface-600">
 Completed
 </span>
 ) : (
 <button className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-saffron-400 transition-colors">
 <Bell className="w-3.5 h-3.5" />
 Remind
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

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
 <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors">
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
 href={`/temples/${stream.temple.slug}`}
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
 viewers: s.viewerCount,
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
 <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
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
 verified pandits with video proof.
 </p>
 <a
 href={`/temples/${stream.temple.slug}`}
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
