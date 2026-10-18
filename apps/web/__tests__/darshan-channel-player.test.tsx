import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DarshanChannelPlayer, { buildAttempts } from '../components/DarshanChannelPlayer';
import {
  channelIdFromUrl,
  parseFeedEntries,
  parseLiveProbe,
} from '../lib/youtube-darshan';

const CH = 'UCdMj2twWfMHXrWgX5oVdoyA';
const uploads = [
  { videoId: 'aaaaaaaaaaa', title: 'new', publishedAt: '2026-10-18T01:00:00+00:00' },
  { videoId: 'bbbbbbbbbbb', title: 'older', publishedAt: '2026-10-17T01:00:00+00:00' },
];

describe('youtube-darshan helpers', () => {
  it('parses feed newest first', () => {
    const xml = `<entry><yt:videoId>x1x1x1x1x1x</yt:videoId><title>a</title><published>2026-10-01T00:00:00Z</published></entry><entry><yt:videoId>y2y2y2y2y2y</yt:videoId><title>b</title><published>2026-10-02T00:00:00Z</published></entry>`;
    expect(parseFeedEntries(xml).map((e) => e.videoId)).toEqual(['y2y2y2y2y2y', 'x1x1x1x1x1x']);
  });
  it('live probe', () => {
    expect(parseLiveProbe('<link rel="canonical" href="https://www.youtube.com/watch?v=NyFeqdEBb60">')).toBe('live');
    expect(parseLiveProbe(`<link rel="canonical" href="https://www.youtube.com/channel/${CH}">`)).toBe('offline');
    expect(parseLiveProbe('nothing')).toBe('unknown');
  });
  it('channel id from url', () => {
    expect(channelIdFromUrl(`https://www.youtube.com/embed/live_stream?channel=${CH}`)).toBe(CH);
    expect(channelIdFromUrl('https://stream.darshya.online/a')).toBeNull();
  });
});

describe('buildAttempts', () => {
  it('tries the live embed first unless the channel is known off air', () => {
    expect(buildAttempts('unknown', CH, uploads)[0]!.src).toContain('live_stream?channel=' + CH);
    expect(buildAttempts('live', CH, uploads)[0]!.kind).toBe('live');
    const off = buildAttempts('offline', CH, uploads);
    expect(off[0]!.kind).toBe('recent');
    expect(off[0]!.src).toContain('/embed/aaaaaaaaaaa');
  });
});

describe('DarshanChannelPlayer', () => {
  it('renders the channel live embed when live', () => {
    const { container } = render(<DarshanChannelPlayer channelId={CH} templeName="Kashi" liveProbe="live" uploads={uploads} />);
    expect(container.querySelector('iframe')!.getAttribute('src')).toContain('live_stream?channel=' + CH);
    expect(screen.queryByTestId('darshan-recent-note')).toBeNull();
  });

  it('off air: plays the newest upload and says so with its date', () => {
    const { container } = render(<DarshanChannelPlayer channelId={CH} templeName="Kashi" liveProbe="offline" uploads={uploads} />);
    expect(container.querySelector('iframe')!.getAttribute('src')).toContain('/embed/aaaaaaaaaaa');
    expect(screen.getByTestId('darshan-recent-note').textContent).toMatch(/No live stream right now.*latest darshan.*2026/);
  });

  it('steps past an embed that reports onError, then shows the empty state', () => {
    const { container } = render(<DarshanChannelPlayer channelId={CH} templeName="Kashi" liveProbe="unknown" uploads={uploads.slice(0, 1)} />);
    const frame = () => container.querySelector('iframe');
    const fire = () =>
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://www.youtube.com',
            source: frame()!.contentWindow,
            data: JSON.stringify({ event: 'onError', info: 150 }),
          }),
        );
      });
    expect(frame()!.getAttribute('src')).toContain('live_stream');
    fire();
    expect(frame()!.getAttribute('src')).toContain('/embed/aaaaaaaaaaa');
    expect(screen.getByTestId('darshan-recent-note')).toBeTruthy();
    fire();
    expect(frame()).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('No live stream right now');
    expect(screen.queryByText(/Video unavailable/i)).toBeNull();
  });

  it('ignores messages from other origins', () => {
    const { container } = render(<DarshanChannelPlayer channelId={CH} templeName="Kashi" liveProbe="unknown" uploads={uploads} />);
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.example', source: container.querySelector('iframe')!.contentWindow, data: JSON.stringify({ event: 'onError' }) }));
    });
    expect(container.querySelector('iframe')!.getAttribute('src')).toContain('live_stream');
  });
});
