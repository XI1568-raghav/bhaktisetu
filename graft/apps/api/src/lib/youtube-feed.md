# apps\api\src\lib\youtube-feed.ts

- CacheEntry · type · L30-L35 — type CacheEntry = { videoId: string | null; title: string | null; hasLive: boolean; fetchedAt: number; };
- nowMs · function · L39-L41 — function nowMs(): number
- readFeed · function · L43-L52 — async function readFeed(channelId: string): Promise<string | null>
- parseLatest · function · L54-L61 — function parseLatest(xml: string): { videoId: string | null; title: string | null }
- getChannelEmbedInfo · function · L72-L90 — async function getChannelEmbedInfo(channelId: string): Promise<{ videoId: string | null; title: string | null; hasVideos: boolean; }>
- liveStreamUrl · function · L92-L94 — function liveStreamUrl(channelId: string): string
- videoEmbedUrl · function · L96-L98 — function videoEmbedUrl(videoId: string): string
