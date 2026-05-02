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
