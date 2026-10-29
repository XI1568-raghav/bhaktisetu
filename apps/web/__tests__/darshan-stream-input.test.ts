import { describe, it, expect } from 'vitest';
import { buildDarshanPayload, parseYouTubeSource, type DarshanFormValues } from '../lib/darshan-stream-input';

const NOW = new Date('2026-10-29T10:00:00Z');
const base: DarshanFormValues = {
  title: 'Morning Mangal Aarti',
  description: '',
  cameraLocation: '',
  provider: 'YOUTUBE',
  youtubeSource: '',
  streamKey: '',
  playbackUrl: '',
  scheduledStart: '',
};
const CH = 'UCdMj2twWfMHXrWgX5oVdoyA';

describe('parseYouTubeSource', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s', 'dQw4w9WgXcQ'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('reads the video id from %s', (input, id) => {
    expect(parseYouTubeSource(input)).toEqual({ kind: 'video', id });
  });

  it('reads a channel id bare, from /channel/ and from an embed live_stream link', () => {
    expect(parseYouTubeSource(CH)).toEqual({ kind: 'channel', id: CH });
    expect(parseYouTubeSource(`https://www.youtube.com/channel/${CH}`)).toEqual({ kind: 'channel', id: CH });
    expect(parseYouTubeSource(`https://www.youtube.com/embed/live_stream?channel=${CH}`)).toEqual({ kind: 'channel', id: CH });
  });

  it.each(['', '   ', 'hello', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/', 'https://www.youtube.com/@SomnathTemple'])(
    'rejects %j with a message',
    (input) => {
      const r = parseYouTubeSource(input);
      expect(r.kind).toBe('invalid');
      expect((r as { message: string }).message.length).toBeGreaterThan(10);
    },
  );

  it('explains why a channel name link cannot be used', () => {
    const r = parseYouTubeSource('https://www.youtube.com/@SomnathTemple');
    expect((r as { message: string }).message).toMatch(/channel ID/);
  });
});

describe('buildDarshanPayload', () => {
  it('YouTube needs only the title and one link: stream key and playback URL are derived', () => {
    const r = buildDarshanPayload({ ...base, youtubeSource: 'https://youtu.be/dQw4w9WgXcQ' }, NOW);
    expect(r).toEqual({
      ok: true,
      payload: {
        title: 'Morning Mangal Aarti',
        description: undefined,
        cameraLocation: undefined,
        streamProvider: 'YOUTUBE',
        scheduledStart: undefined,
        status: 'offline',
        streamKey: 'dQw4w9WgXcQ',
        playbackUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        youtubeVideoId: 'dQw4w9WgXcQ',
      },
    });
  });

  it('a YouTube channel id becomes a live_stream playback URL and youtubeChannelId', () => {
    const r = buildDarshanPayload({ ...base, youtubeSource: CH }, NOW);
    expect(r.ok && r.payload).toMatchObject({
      streamKey: CH,
      youtubeChannelId: CH,
      playbackUrl: `https://www.youtube.com/embed/live_stream?channel=${CH}`,
    });
  });

  it('a scheduled start marks the stream scheduled', () => {
    const r = buildDarshanPayload({ ...base, youtubeSource: CH, scheduledStart: '2026-10-30T05:00' }, NOW);
    expect(r.ok && r.payload.status).toBe('scheduled');
    expect(r.ok && r.payload.scheduledStart).toBeTruthy();
  });

  it('refuses a start time in the past', () => {
    const r = buildDarshanPayload({ ...base, youtubeSource: CH, scheduledStart: '2026-10-01T05:00' }, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.scheduledStart).toMatch(/already passed/);
  });

  it('reports every missing field at once, with plain words', () => {
    const r = buildDarshanPayload({ ...base, title: ' ', youtubeSource: '' }, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['title', 'youtubeSource']);
  });

  it('IVS asks for a stream key and a playback address', () => {
    const none = buildDarshanPayload({ ...base, provider: 'IVS' }, NOW);
    expect(!none.ok && Object.keys(none.errors).sort()).toEqual(['playbackUrl', 'streamKey']);
    const bad = buildDarshanPayload({ ...base, provider: 'IVS', streamKey: 'sk_x', playbackUrl: 'ftp://nope' }, NOW);
    expect(!bad.ok && bad.errors.playbackUrl).toMatch(/http/);
    const ok = buildDarshanPayload({ ...base, provider: 'IVS', streamKey: ' sk_x ', playbackUrl: ' https://x.example/p.m3u8 ' }, NOW);
    expect(ok.ok && ok.payload).toMatchObject({ streamKey: 'sk_x', playbackUrl: 'https://x.example/p.m3u8', streamProvider: 'IVS' });
  });

  it('does not leak the YouTube field into other providers', () => {
    const r = buildDarshanPayload({ ...base, provider: 'EXTERNAL_RTMP', youtubeSource: CH, streamKey: 'k', playbackUrl: 'https://a.example/x.m3u8' }, NOW);
    expect(r.ok && r.payload).not.toHaveProperty('youtubeChannelId');
    expect(r.ok && r.payload).not.toHaveProperty('youtubeVideoId');
  });
});
