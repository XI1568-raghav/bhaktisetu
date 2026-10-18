/**
 * Channel-based darshan playback for the /darshan/[id] page (server side).
 *
 * A pinned video id of a past live stream goes dead ("This live stream
 * recording is not available"). The durable form is the channel live embed;
 * when the channel is not broadcasting, the newest upload from its public RSS
 * feed is the fallback. Mirrors apps/api/src/lib/youtube-feed.ts.
 */

export interface ChannelUpload {
  videoId: string;
  title: string;
  publishedAt: string;
}

export type LiveProbe = 'live' | 'offline' | 'unknown';

export interface DarshanSource {
  channelId: string;
  liveProbe: LiveProbe;
  liveEmbedUrl: string;
  /** Newest first, at most 5. */
  uploads: ChannelUpload[];
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function parseFeedEntries(xml: string): ChannelUpload[] {
  const out: ChannelUpload[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const body = m[1]!;
    const videoId = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1];
    const publishedAt = body.match(/<published>([^<]+)<\/published>/)?.[1];
    if (videoId && publishedAt) out.push({ videoId, title: decode(title ?? ''), publishedAt });
  }
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** Canonical link is the watch URL while live, the channel URL while off air. */
export function parseLiveProbe(html: string): LiveProbe {
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (!canonical) return 'unknown';
  if (/youtube\.com\/watch\?v=[\w-]{11}/.test(canonical)) return 'live';
  if (/youtube\.com\/channel\/UC[\w-]{22}/.test(canonical)) return 'offline';
  return 'unknown';
}

export function liveEmbedUrl(channelId: string): string {
  return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&mute=1&playsinline=1&enablejsapi=1`;
}

export function videoEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`;
}

export function channelIdFromUrl(url: string | null | undefined): string | null {
  return url?.match(/[?&]channel=(UC[\w-]{22})/)?.[1] ?? null;
}

export function formatPublished(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
}

export async function resolveDarshanSource(channelId: string): Promise<DarshanSource> {
  const [uploads, liveProbe] = await Promise.all([
    fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Darshya/1.0)' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => (r.ok ? r.text() : ''))
      .then(parseFeedEntries)
      .catch(() => [] as ChannelUpload[]),
    fetch(`https://www.youtube.com/channel/${channelId}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Darshya/1.0)', 'Accept-Language': 'en' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    })
      .then((r) => (r.ok ? r.text() : ''))
      .then((h) => (h ? parseLiveProbe(h) : ('unknown' as LiveProbe)))
      .catch(() => 'unknown' as LiveProbe),
  ]);
  return { channelId, liveProbe, liveEmbedUrl: liveEmbedUrl(channelId), uploads: uploads.slice(0, 5) };
}
