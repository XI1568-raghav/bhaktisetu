import { describe, it, expect } from 'vitest';
import {
  buildChannelPlayback,
  channelIdFromUrl,
  parseFeedEntries,
  parseLiveProbe,
} from './youtube-feed.js';

const CH = 'UCdMj2twWfMHXrWgX5oVdoyA';
const entry = (id: string, title: string, at: string) =>
  `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><published>${at}</published></entry>`;

describe('parseFeedEntries', () => {
  it('returns newest first with decoded titles and publish dates', () => {
    const xml = `<feed>${entry('aaaaaaaaaaa', 'old', '2026-10-01T00:00:00+00:00')}${entry('bbbbbbbbbbb', 'Aarti &amp; Darshan', '2026-10-18T01:00:00+00:00')}</feed>`;
    const out = parseFeedEntries(xml);
    expect(out.map((e) => e.videoId)).toEqual(['bbbbbbbbbbb', 'aaaaaaaaaaa']);
    expect(out[0]!.title).toBe('Aarti & Darshan');
    expect(out[0]!.publishedAt).toBe('2026-10-18T01:00:00+00:00');
  });
  it('returns [] for an empty or error body', () => {
    expect(parseFeedEntries('')).toEqual([]);
    expect(parseFeedEntries('<html>404</html>')).toEqual([]);
  });
});

describe('parseLiveProbe', () => {
  it('live when canonical is a watch URL', () => {
    expect(parseLiveProbe('<link rel="canonical" href="https://www.youtube.com/watch?v=NyFeqdEBb60">')).toBe('live');
  });
  it('offline when canonical stays on the channel', () => {
    expect(parseLiveProbe(`<link rel="canonical" href="https://www.youtube.com/channel/${CH}">`)).toBe('offline');
  });
  it('unknown for anything else, never offline', () => {
    expect(parseLiveProbe('<link rel="canonical" href="undefined">')).toBe('unknown');
    expect(parseLiveProbe('<html>consent</html>')).toBe('unknown');
  });
});

describe('buildChannelPlayback', () => {
  const ups = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ videoId: `vvvvvvvvv${String(i).padStart(2, '0')}`, title: `t${i}`, publishedAt: '2026-10-18T00:00:00Z' }));
  it('live probe -> live mode, channel embed', () => {
    const p = buildChannelPlayback(CH, 'live', ups);
    expect(p.mode).toBe('live');
    expect(p.liveEmbedUrl).toContain(`embed/live_stream?channel=${CH}`);
  });
  it('offline probe with uploads -> recent mode with newest upload and date', () => {
    const p = buildChannelPlayback(CH, 'offline', ups);
    expect(p.mode).toBe('recent');
    expect(p.latest?.videoId).toBe(ups[0]!.videoId);
    expect(p.latest?.publishedAt).toBe('2026-10-18T00:00:00Z');
    expect(p.uploads).toHaveLength(5);
  });
  it('unknown probe still tries live first', () => {
    expect(buildChannelPlayback(CH, 'unknown', ups).mode).toBe('live');
  });
  it('offline with no uploads -> none', () => {
    const p = buildChannelPlayback(CH, 'offline', []);
    expect(p.mode).toBe('none');
    expect(p.latest).toBeNull();
  });
});

describe('channelIdFromUrl', () => {
  it('extracts the channel from a live_stream embed', () => {
    expect(channelIdFromUrl(`https://www.youtube.com/embed/live_stream?channel=${CH}&autoplay=1`)).toBe(CH);
    expect(channelIdFromUrl('https://stream.darshya.online/x/live.m3u8')).toBeNull();
    expect(channelIdFromUrl(null)).toBeNull();
  });
});
