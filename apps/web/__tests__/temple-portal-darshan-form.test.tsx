import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' } }),
}));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import TempleDarshanPage from '../app/temple-portal/darshan/page';

function stubFetch() {
  const fn = vi.fn(async (_url: string, init?: RequestInit): Promise<Response> => {
    const posted = init?.method === 'POST';
    const body = posted
      ? { stream: { id: 's1', templeId: 't', streamKey: 'k', playbackUrl: 'https://x', status: 'offline', scheduledStart: null, actualStart: null, viewerCount: 0, peakViewers: 0, isPremium: false, streamProvider: 'YOUTUBE', youtubeVideoId: null, youtubeChannelId: null, attribution: null, title: 'Morning Mangal Aarti', description: null, cameraLocation: null, createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z' } }
      : { streams: [] };
    return { ok: true, status: posted ? 201 : 200, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openForm() {
  render(<TempleDarshanPage />);
  fireEvent.click(await screen.findByRole('button', { name: /schedule stream/i }));
  await screen.findByText('Schedule New Stream');
}

describe('temple darshan: schedule form', () => {
  it('YouTube asks for one link, not a stream key and a playback URL', async () => {
    stubFetch();
    await openForm();
    expect(screen.getByLabelText(/youtube video link or channel id/i)).toBeTruthy();
    expect(screen.queryByLabelText(/stream key/i)).toBeNull();
    expect(screen.queryByLabelText(/playback address/i)).toBeNull();
    expect(document.querySelector('form')!.hasAttribute('novalidate')).toBe(true);
  });

  it('other providers ask for what they need, with an honest note for RTMP', async () => {
    stubFetch();
    await openForm();
    fireEvent.change(screen.getByLabelText(/where will you stream from/i), { target: { value: 'EXTERNAL_RTMP' } });
    expect(screen.getByLabelText(/stream key/i)).toBeTruthy();
    expect(screen.getByLabelText(/playback address/i)).toBeTruthy();
    expect(screen.getByText(/not shown on the public darshan page yet/i)).toBeTruthy();
  });

  it('shows friendly inline errors and sends nothing when the form is empty', async () => {
    const fetchFn = stubFetch();
    await openForm();
    fireEvent.submit(document.querySelector('form')!);
    expect(await screen.findByText(/give the stream a title/i)).toBeTruthy();
    expect(screen.getByText(/paste the youtube video link/i)).toBeTruthy();
    expect(fetchFn.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);
  });

  it('posts the derived stream key and playback URL for a YouTube link', async () => {
    const fetchFn = stubFetch();
    await openForm();
    fireEvent.change(screen.getByPlaceholderText(/morning mangal aarti/i), { target: { value: 'Morning Mangal Aarti' } });
    fireEvent.change(screen.getByLabelText(/youtube video link or channel id/i), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(fetchFn.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(true));
    const post = fetchFn.mock.calls.find((c) => c[1]?.method === 'POST')!;
    expect(JSON.parse(String(post[1]!.body))).toMatchObject({
      title: 'Morning Mangal Aarti',
      streamProvider: 'YOUTUBE',
      streamKey: 'dQw4w9WgXcQ',
      playbackUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtubeVideoId: 'dQw4w9WgXcQ',
    });
    await waitFor(() => expect(screen.queryByText('Schedule New Stream')).toBeNull());
  });
});
