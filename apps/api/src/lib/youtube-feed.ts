/**
 * YouTube channel feed helper.
 *
 * Problem: `https://www.youtube.com/embed/live_stream?channel=<id>&autoplay=1`
 * only renders WHEN that channel has a current live broadcast. Off-air, the
 * iframe shows "This video is unavailable". For most temple channels which
 * stream only during aarti windows, this means the player breaks for 90% of
 * the day.
 *
 * Fix: query the channel's public RSS feed (no auth required, no quota cost)
 * and pick the latest video. Embed THAT as the fallback. The user always sees
 * recent darshan content even when no live stream is on.
 *
 * Strategy:
 *   1. fetchLatestVideoId(channelId) → reads
 *      https://www.youtube.com/feeds/videos.xml?channel_id=<id>, parses
 *      `<yt:videoId>...</yt:videoId>`, returns the first one.
 *   2. In-memory 5-min cache so we don't refetch per request.
 *
 * The /api/v1/darshan/<slug>/stream endpoint can return:
 *   { mode: 'live', playbackUrl: '.../embed/live_stream?channel=...' }
 *   OR
 *   { mode: 'recent', playbackUrl: '.../embed/<videoId>...', latestTitle: '...' }
 *
 * Frontend renders the same iframe either way; UI badge differs.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  videoId: string | null;
  title: string | null;
  hasLive: boolean;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();

function nowMs(): number {
  return Date.now();
}

async function readFeed(channelId: string): Promise<string | null> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Darshya/1.0)' } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseLatest(xml: string): { videoId: string | null; title: string | null } {
  const idMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
  const titleMatch = xml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);
  return {
    videoId: idMatch ? idMatch[1]! : null,
    title: titleMatch ? titleMatch[1]! : null,
  };
}

/**
 * Best-effort live-broadcast probe. RSS doesn't expose isLive directly, so we
 * heuristically check the latest video title for "live" markers + whether the
 * embed/live_stream endpoint returns 200 vs an offline placeholder.
 *
 * For now we just return false (unknown) and let the frontend always try the
 * embed/live_stream URL first; on failure the frontend can request the
 * /effective endpoint for the recent-VOD fallback.
 */
export async function getChannelEmbedInfo(channelId: string): Promise<{
  videoId: string | null;
  title: string | null;
  hasVideos: boolean;
}> {
  const cached = cache.get(channelId);
  if (cached && nowMs() - cached.fetchedAt < CACHE_TTL_MS) {
    return { videoId: cached.videoId, title: cached.title, hasVideos: !!cached.videoId };
  }

  const xml = await readFeed(channelId);
  if (!xml) {
    cache.set(channelId, { videoId: null, title: null, hasLive: false, fetchedAt: nowMs() });
    return { videoId: null, title: null, hasVideos: false };
  }
  const { videoId, title } = parseLatest(xml);
  cache.set(channelId, { videoId, title, hasLive: false, fetchedAt: nowMs() });
  return { videoId, title, hasVideos: !!videoId };
}

export function liveStreamUrl(channelId: string): string {
  return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&mute=1&playsinline=1`;
}

export function videoEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0`;
}

// ---------------------------------------------------------------------------
// Playback resolution (2026-10): live channel embed first, newest upload next.
// ---------------------------------------------------------------------------

export interface ChannelUpload {
  videoId: string;
  title: string;
  publishedAt: string;
}

export type LiveProbe = 'live' | 'offline' | 'unknown';

export type ChannelPlayback = {
  mode: 'live' | 'recent' | 'none';
  liveProbe: LiveProbe;
  /** Durable channel live embed; shows the current broadcast whenever there is one. */
  liveEmbedUrl: string;
  latest: (ChannelUpload & { embedUrl: string }) | null;
  /** Newest-first uploads (max 5) so a client can step past an unplayable one. */
  uploads: ChannelUpload[];
};

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Pure: parse a YouTube Atom feed into newest-first uploads. */
export function parseFeedEntries(xml: string): ChannelUpload[] {
  const out: ChannelUpload[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const body = m[1]!;
    const videoId = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1];
    const publishedAt = body.match(/<published>([^<]+)<\/published>/)?.[1];
    if (videoId && publishedAt) out.push({ videoId, title: decodeEntities(title ?? ''), publishedAt });
  }
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/**
 * Pure: read the /channel/<id>/live page. A live channel's canonical link is the
 * watch URL of the broadcast; an offline one keeps the channel URL. Anything
 * else (consent wall, "undefined", redesign) is "unknown", never "offline".
 */
export function parseLiveProbe(html: string): LiveProbe {
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (!canonical) return 'unknown';
  if (/youtube\.com\/watch\?v=[\w-]{11}/.test(canonical)) return 'live';
  if (/youtube\.com\/channel\/UC[\w-]{22}/.test(canonical)) return 'offline';
  return 'unknown';
}

const LIVE_PROBE_TTL_MS = 60 * 1000;
const probeCache = new Map<string, { at: number; value: LiveProbe }>();

export async function probeChannelLive(channelId: string): Promise<LiveProbe> {
  const hit = probeCache.get(channelId);
  if (hit && nowMs() - hit.at < LIVE_PROBE_TTL_MS) return hit.value;
  let value: LiveProbe = 'unknown';
  try {
    const res = await fetch(`https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Darshya/1.0)', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) value = parseLiveProbe(await res.text());
  } catch {
    value = 'unknown';
  }
  probeCache.set(channelId, { at: nowMs(), value });
  return value;
}

export async function fetchChannelUploads(channelId: string): Promise<ChannelUpload[]> {
  const xml = await readFeed(channelId);
  return xml ? parseFeedEntries(xml) : [];
}

/** Pure decision, split out so it is testable without the network. */
export function buildChannelPlayback(channelId: string, liveProbe: LiveProbe, allUploads: ChannelUpload[]): ChannelPlayback {
  const uploads = allUploads.slice(0, 5);
  const first = uploads[0];
  const latest = first ? { ...first, embedUrl: videoEmbedUrl(first.videoId) } : null;
  // 'unknown' still tries the live embed first; the client steps to `uploads` on a player error.
  const mode = liveProbe !== 'offline' ? 'live' : latest ? 'recent' : 'none';
  return { mode, liveProbe, liveEmbedUrl: liveStreamUrl(channelId), latest, uploads };
}

export async function resolveChannelPlayback(channelId: string): Promise<ChannelPlayback> {
  const [liveProbe, uploads] = await Promise.all([probeChannelLive(channelId), fetchChannelUploads(channelId)]);
  return buildChannelPlayback(channelId, liveProbe, uploads);
}

export function channelIdFromUrl(url: string | null | undefined): string | null {
  return url?.match(/[?&]channel=(UC[\w-]{22})/)?.[1] ?? null;
}
