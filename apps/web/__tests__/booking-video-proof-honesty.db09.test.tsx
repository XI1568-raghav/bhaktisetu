/**
 * DB-09 — "Video Ready" / "Watch Video" over a video that cannot play.
 *
 * The four rows the sweep found on devotee@demo.com's own list (2026-08-12):
 *   BS-20260812-QX6DC  video_uploaded  videoProofUrl ""
 *   BS-20260812-IACI5  delivered       videoProofUrl "not a url at all"
 *   BS-20260812-683BK  delivered       videoProofUrl "https://drive.google.com/CORRECT-LINK"
 *   BS-20260812-STNEO  video_uploaded  videoProofUrl "https://cdn.example.com/c1.mp4"
 *
 * /bookings gated its Watch Video CTA on `booking.videoUrl` alone, so the
 * empty string produced a "Video Ready" pill with no button and the
 * not-a-url produced a button whose href a browser resolves RELATIVE to the
 * current page — a 404 inside the site instead of the recording.
 *
 * The write side is already guarded (`z.string().url()` on both proof writers,
 * plus checkVideoProofGate). These are the rows written before that landed,
 * and the UI trusted the column on sight.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isPlayableVideoUrl, videoProofState } from '../app/bookings/video-proof';

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => '/bookings',
  useSearchParams: () => nav.params,
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Demo Devotee', email: 'devotee@demo.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, init),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: () => "Couldn't load live data.",
}));

import BookingsPage from '../app/bookings/page';

vi.setConfig({ testTimeout: 30_000 });

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** The two rows the sweep found with an unusable proof URL. */
function bookingRow(over: Record<string, unknown>) {
  return {
    id: 'bk-1',
    bookingNumber: 'BS-20260812-IACI5',
    status: 'delivered',
    videoProofUrl: null,
    scheduledDate: '2026-09-01',
    scheduledTimeSlot: '06:00',
    priceAmount: 1100,
    currency: 'INR',
    pujaType: { name: 'Rudrabhishek', slug: 'rudrabhishek' },
    temple: { name: 'Kashi Vishwanath', city: 'Varanasi', slug: 'kashi-vishwanath-varanasi' },
    devoteeNames: ['Arjun Sharma'],
    ...over,
  };
}

function mockList(row: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://api.test');
      if (url.pathname.includes('/bookings/my')) {
        return ok({
          bookings: [row],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          counts: { all: 1 },
        });
      }
      return ok({});
    }),
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BookingsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DB-09 — the bookings list does not offer a video it cannot play', () => {
  it('hides Watch Video for an unparseable stored URL', async () => {
    mockList(bookingRow({ videoProofUrl: 'not a url at all' }));
    renderPage();

    await screen.findByText('BS-20260812-IACI5');
    // This used to render a button whose href a browser resolves relative to
    // the current page — a 404 inside the site instead of the recording.
    expect(screen.queryByRole('link', { name: /watch video/i })).toBeNull();
  });

  it('still offers Watch Video for a real URL', async () => {
    mockList(bookingRow({ videoProofUrl: 'https://cdn.example.com/c1.mp4' }));
    renderPage();

    await screen.findByText('BS-20260812-IACI5');
    expect(screen.getByRole('link', { name: /watch video/i })).toBeTruthy();
  });

  it('tells the devotee the video is still coming rather than going silent', async () => {
    // The empty-string row: pill said "Video Ready", no button, no explanation.
    mockList(bookingRow({ status: 'video_uploaded', videoProofUrl: '' }));
    renderPage();

    await screen.findByText('BS-20260812-IACI5');
    expect(screen.getByText(/video is being processed/i)).toBeTruthy();
  });
});

describe('DB-09 — only a real URL counts as a playable video', () => {
  it.each([
    ['https://cdn.example.com/c1.mp4'],
    ['http://cdn.example.com/c1.mp4'],
    ['https://drive.google.com/CORRECT-LINK'],
    ['  https://cdn.example.com/c1.mp4  '],
  ])('accepts %s', (url) => {
    expect(isPlayableVideoUrl(url)).toBe(true);
  });

  it.each([
    ['', 'the empty string the sweep found on QX6DC'],
    ['   ', 'whitespace'],
    ['not a url at all', 'the literal value stored on IACI5'],
    ['/videos/local.mp4', 'a relative path the browser would resolve against the page'],
    ['javascript:alert(1)', 'a script URI'],
    ['ftp://example.com/v.mp4', 'a scheme no browser will play inline'],
  ])('rejects %s (%s)', (url) => {
    expect(isPlayableVideoUrl(url)).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isPlayableVideoUrl(null)).toBe(false);
    expect(isPlayableVideoUrl(undefined)).toBe(false);
  });
});

describe('DB-09 — the detail page states what it actually has', () => {
  it('plays a real recording', () => {
    expect(videoProofState('video_uploaded', 'https://cdn.example.com/c1.mp4')).toBe('player');
    expect(videoProofState('delivered', 'https://cdn.example.com/c1.mp4')).toBe('player');
  });

  it('says the video is pending when the status promised one and the URL is empty', () => {
    // QX6DC: the pill said "Video Ready" and the page rendered nothing at all,
    // so the devotee had no way to tell anything was wrong or who to ask.
    expect(videoProofState('video_uploaded', '')).toBe('pending');
  });

  it('says pending rather than linking to an unparseable value', () => {
    // IACI5: this used to render "Watch Video" pointing at a relative 404.
    expect(videoProofState('delivered', 'not a url at all')).toBe('pending');
  });

  it('renders nothing for a booking that never promised a video', () => {
    for (const status of ['pending_payment', 'confirmed', 'in_progress', 'completed']) {
      expect(videoProofState(status, null), status).toBe('none');
    }
  });

  it('still plays a valid URL even on a status that does not promise one', () => {
    // A pandit who uploaded early must not have the recording hidden.
    expect(videoProofState('completed', 'https://cdn.example.com/c1.mp4')).toBe('player');
  });

  it('a cancelled booking with a junk URL shows nothing, not an error state', () => {
    expect(videoProofState('cancelled', '')).toBe('none');
  });
});
