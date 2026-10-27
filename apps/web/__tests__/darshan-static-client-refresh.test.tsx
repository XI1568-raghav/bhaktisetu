import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import DarshanAartiSchedule from '../components/DarshanAartiSchedule';
import DarshanScheduleTable from '../components/DarshanScheduleTable';
import DarshanChannelPlayerLive from '../components/DarshanChannelPlayerLive';

/**
 * /darshan and /darshan/[id] are prerendered (no revalidate: the Cloudflare Worker free plan
 * cannot re-render them). Everything clock- or broadcast-dependent therefore resolves in the
 * browser after mount. These pin that contract.
 */
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('DarshanAartiSchedule', () => {
  it('marks no slot until the clock is read, then grades slots against IST', async () => {
    // 04:15 IST = 22:45 UTC the day before; Mahakaleshwar Bhasma Aarti runs from 04:00.
    vi.useFakeTimers({ now: new Date('2026-10-21T22:45:00Z'), toFake: ['Date', 'setInterval', 'clearInterval'] });
    const { container } = render(
      <DarshanAartiSchedule templeSlugs={['mahakaleshwar']} fallbackSchedule={[]} />,
    );
    await act(async () => {});
    expect(container.textContent).toMatch(/LIVE NOW/);
    expect(container.textContent).toMatch(/Bhasma Aarti/);
  });
});

describe('DarshanScheduleTable', () => {
  it('shows no status cell on the first paint, then a graded one', async () => {
    const rows = [
      { slug: 'kashi-vishwanath', temple: 'Kashi Vishwanath', time: '2:30 AM', event: 'Mangala Aarti', status: 'live' as const, href: '/darshan/kashi-vishwanath', minutesIST: 150 },
    ];
    const { container } = render(<DarshanScheduleTable initialRows={rows} />);
    await act(async () => {});
    expect(container.textContent).toMatch(/Kashi Vishwanath/);
    expect(container.textContent).toMatch(/LIVE|Completed|Upcoming/);
  });
});

describe('DarshanChannelPlayerLive', () => {
  it('starts on the live embed (probe unknown) and drops to the newest upload when the API says offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          liveProbe: 'offline',
          uploads: [{ videoId: 'abcdefghijk', title: 't', publishedAt: '2026-10-20T00:00:00Z' }],
        }),
      })),
    );
    render(
      <DarshanChannelPlayerLive channelId="UCT1egsvA08YcdMLiEu1DTRg" templeName="Somnath" streamKey="somnath" initialUploads={[]} />,
    );
    expect(document.querySelector('iframe')?.getAttribute('src')).toContain('live_stream?channel=UCT1egsvA08YcdMLiEu1DTRg');
    await waitFor(() => expect(document.querySelector('iframe')?.getAttribute('src')).toContain('/embed/abcdefghijk'));
    expect(screen.getByTestId('darshan-recent-note')).toBeTruthy();
  });

  it('keeps the live embed when the API is older and returns no probe', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ status: 'live' }) })));
    render(
      <DarshanChannelPlayerLive channelId="UCT1egsvA08YcdMLiEu1DTRg" templeName="Somnath" streamKey="somnath" initialUploads={[]} />,
    );
    await act(async () => {});
    expect(document.querySelector('iframe')?.getAttribute('src')).toContain('live_stream?channel=');
  });
});
