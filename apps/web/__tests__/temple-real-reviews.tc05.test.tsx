/**
 * TC-05 (cont.) — the temple review slot is empty, and empty is where the fix
 * stopped.
 *
 * The first half of TC-05 removed 51 hand-written five-star testimonials from
 * /temples/[slug] and pinned that removal in
 * `temple-testimonials-fabricated.tc05.test.tsx`. What it left behind is a
 * page that publishes NO review even when a real one exists: the API has
 * served `GET /temples/:slug/reviews` from `PujaBooking` rows carrying a
 * rating since before the fabricated block was written
 * (apps/api/src/routes/temples.ts:252 -> temple.service.ts getReviews), and no
 * web surface reads it. "Delete the fabrication" and "show the truth" are two
 * different jobs; this file is the second one.
 *
 * A correction to the handoff note while we are here. That note said
 * `lib/api.ts getTempleReviews` is MISTYPED — declaring
 * `PaginatedResponse<TempleReview>` (`{ data, pagination }`) against a route
 * that returns `{ templeSlug, reviews, total, averageRating, page, limit,
 * totalPages }`. It is not. `serverFetch` runs every payload through
 * `normalizePaginated` (lib/api.ts:65), which fires on exactly this shape —
 * no `data` key, and `total` + `page` + `limit` all present — and rewrites it
 * to `{ data: reviews, pagination: {...} }`. The declared type is what a
 * caller actually receives. What the normaliser DOES silently drop is
 * `averageRating` and `templeSlug`, so a caller that wants the average cannot
 * get it through that helper. `lib/reviews.ts` therefore parses BOTH shapes
 * rather than assuming either.
 *
 * The rule under test: a review row is rendered only if a real booking row
 * carries a real rating. Where none exists the page says so. No fixture, no
 * optimistic default, no invented reviewer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  permanentRedirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/temples',
  useSearchParams: () => new URLSearchParams(),
}));

const API_TEMPLE = {
  id: 'api-kashi',
  name: 'Kashi Vishwanath Temple',
  nameLocal: null,
  slug: 'kashi-vishwanath-varanasi',
  description: 'Seeded by the API.',
  deityPrimary: 'Lord Shiva',
  deities: ['Lord Shiva'],
  tradition: 'Shaiva',
  addressLine: 'Lahori Tola',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  pincode: '221001',
  country: 'India',
  lat: 25.3109,
  lng: 83.0107,
  phone: null,
  email: null,
  websiteUrl: null,
  images: [],
  timingInfo: null,
  isVerified: true,
  verificationDate: null,
  liveDarshanEnabled: false,
  streamUrl: null,
  status: 'active',
  priests: [],
  pujaOfferings: [],
  darshanStream: [],
};

vi.mock('../lib/temple-resolve', () => ({
  resolveApiTemple: vi.fn(async () => API_TEMPLE),
}));

const { getTempleDevoteeReviews } = vi.hoisted(() => ({
  getTempleDevoteeReviews: vi.fn(),
}));
vi.mock('../lib/reviews', async () => {
  const actual = await vi.importActual<typeof import('../lib/reviews')>('../lib/reviews');
  return { ...actual, getTempleDevoteeReviews };
});

import TempleDetailPage from '../app/temples/[slug]/page';
import {
  EMPTY_TEMPLE_REVIEWS,
  abbreviateReviewer,
  formatReviewMonth,
  isPublishableReview,
  normalizeTempleReviews,
} from '../lib/reviews';

const REAL_ROW = {
  id: 'bk-1',
  rating: 4,
  reviewText: 'The pandit shared the video the same evening.',
  createdAt: '2026-07-14T09:00:00.000Z',
  user: { fullName: 'Rahul Sharma', avatarUrl: null },
  pujaType: { name: 'Rudrabhishek' },
};

beforeEach(() => {
  getTempleDevoteeReviews.mockReset();
  getTempleDevoteeReviews.mockResolvedValue(EMPTY_TEMPLE_REVIEWS);
});
afterEach(() => cleanup());

// ───────────────────────────────────────────────────────────────────────────
// The parser
// ───────────────────────────────────────────────────────────────────────────

describe('TC-05 — lib/reviews parses what the route actually returns', () => {
  it('reads the raw route shape, averageRating included', () => {
    const parsed = normalizeTempleReviews({
      templeSlug: 'kashi-vishwanath-varanasi',
      reviews: [REAL_ROW],
      total: 1,
      averageRating: 4,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    expect(parsed.total).toBe(1);
    expect(parsed.averageRating).toBe(4);
    expect(parsed.reviews).toHaveLength(1);
    expect(parsed.reviews[0]?.pujaTypeName).toBe('Rudrabhishek');
  });

  it('also reads the shape serverFetch rewrites it into, which loses averageRating', () => {
    const parsed = normalizeTempleReviews({
      data: [REAL_ROW],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(parsed.total).toBe(1);
    expect(parsed.reviews).toHaveLength(1);
    // Not invented from the rows on hand — the route's own average is gone.
    expect(parsed.averageRating).toBeNull();
  });

  it('returns the empty result for junk rather than throwing', () => {
    expect(normalizeTempleReviews(null).reviews).toEqual([]);
    expect(normalizeTempleReviews({ error: 'Temple not found' }).total).toBe(0);
  });

  it('drops any row that does not carry a real 1-5 rating', () => {
    expect(isPublishableReview({ ...REAL_ROW, rating: 0 })).toBe(false);
    expect(isPublishableReview({ ...REAL_ROW, rating: null })).toBe(false);
    expect(isPublishableReview({ ...REAL_ROW, rating: 6 })).toBe(false);
    expect(isPublishableReview({ ...REAL_ROW, rating: 4 })).toBe(true);
    expect(
      normalizeTempleReviews({
        reviews: [{ ...REAL_ROW, id: 'a', rating: null }, { ...REAL_ROW, id: 'b', rating: 5 }],
        total: 2,
        page: 1,
        limit: 10,
      }).reviews.map((r) => r.id),
    ).toEqual(['b']);
  });

  it('abbreviates the reviewer instead of publishing a devotee\'s full name', () => {
    expect(abbreviateReviewer('Rahul Sharma')).toBe('Rahul S.');
    expect(abbreviateReviewer('Rahul')).toBe('Rahul');
    expect(abbreviateReviewer('  ')).toBe('Devotee');
    expect(abbreviateReviewer(null)).toBe('Devotee');
  });

  it('formats the date without depending on the host locale', () => {
    expect(formatReviewMonth('2026-07-14T09:00:00.000Z')).toBe('July 2026');
    expect(formatReviewMonth('not-a-date')).toBe('');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The page
// ───────────────────────────────────────────────────────────────────────────

describe('TC-05 — /temples/[slug] publishes real reviews and nothing else', () => {
  it('renders a real review row when the API has one', async () => {
    getTempleDevoteeReviews.mockResolvedValue({
      reviews: [
        {
          id: 'bk-1',
          rating: 4,
          reviewText: 'The pandit shared the video the same evening.',
          createdAt: '2026-07-14T09:00:00.000Z',
          reviewerName: 'Rahul S.',
          pujaTypeName: 'Rudrabhishek',
        },
      ],
      total: 1,
      averageRating: 4,
    });

    const el = await TempleDetailPage({ params: Promise.resolve({ slug: 'kashi-vishwanath' }) });
    render(el);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');

    expect(text).toContain('The pandit shared the video the same evening.');
    expect(text).toContain('Rahul S.');
    expect(text).toContain('Rudrabhishek');
    // Rendered from the API row it was handed, keyed on the API slug.
    expect(getTempleDevoteeReviews).toHaveBeenCalledWith('kashi-vishwanath-varanasi');
  });

  it('says there are no reviews yet rather than showing nothing or something invented', async () => {
    getTempleDevoteeReviews.mockResolvedValue(EMPTY_TEMPLE_REVIEWS);

    const el = await TempleDetailPage({ params: Promise.resolve({ slug: 'kashi-vishwanath' }) });
    render(el);
    const html = document.body.innerHTML ?? '';
    const text = (html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ');

    expect(text).toMatch(/no devotee review/i);
    // No rating, no average, no star row invented to fill the gap.
    expect(text).not.toMatch(/\b[0-5](\.\d)?\s*\/\s*5\b/);
    expect(text).not.toMatch(/Tips from Devotees/i);
  });

  it('never publishes a row the parser refuses', async () => {
    // Drive the real parser through the page: a null-rating booking row is not
    // a review, however the route serialises it.
    const { normalizeTempleReviews: parse } = await import('../lib/reviews');
    getTempleDevoteeReviews.mockResolvedValue(
      parse({
        reviews: [
          {
            id: 'bk-unrated',
            rating: null,
            reviewText: 'Booked but never rated.',
            createdAt: '2026-07-14T09:00:00.000Z',
            user: { fullName: 'Anon Person', avatarUrl: null },
            pujaType: { name: 'Rudrabhishek' },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      }),
    );

    const el = await TempleDetailPage({ params: Promise.resolve({ slug: 'kashi-vishwanath' }) });
    render(el);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).not.toContain('Booked but never rated.');
    expect(text).not.toContain('Anon Person');
    expect(text).toMatch(/no devotee review/i);
  });
});
