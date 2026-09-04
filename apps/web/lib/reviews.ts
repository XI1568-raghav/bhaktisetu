/**
 * Temple devotee reviews — the REAL ones, or none.
 *
 * TC-05 removed 51 hand-written five-star testimonials from /temples/[slug]
 * (lib/temple-details.ts still holds the fixture rows; nothing publishes
 * them). That closed the fabrication and opened a different gap: the API has
 * served real reviews the whole time and no web surface read them.
 *
 *   GET /temples/:slug/reviews   apps/api/src/routes/temples.ts:252
 *     -> templeService.getReviews  apps/api/src/services/temple.service.ts:348
 *
 * The rows are `PujaBooking` records filtered to `rating: { not: null }` —
 * i.e. a devotee who actually paid for and received a puja at that temple, and
 * then rated it. There is no other writer, which is exactly why they are safe
 * to publish and the fixture was not.
 *
 * ── on the response shape, and a handoff note that was wrong ────────────────
 * A previous note recorded `lib/api.ts getTempleReviews` as MISTYPED: it
 * declares `PaginatedResponse<TempleReview>` (`{ data, pagination }`) while the
 * route returns `{ templeSlug, reviews, total, averageRating, page, limit,
 * totalPages }`. Check `serverFetch` before acting on that. Every payload it
 * returns goes through `normalizePaginated` (lib/api.ts:65), whose trigger is
 * "no `data` key AND `total` + `page` + `limit` all present" — precisely this
 * payload. It rewrites it to `{ data: reviews, pagination: {...} }`, so the
 * declared type is what a caller receives and the declaration is correct.
 *
 * What the normaliser really does is DROP `averageRating` and `templeSlug`, so
 * a caller routed through `lib/api.ts` can never read the route's own average.
 * `normalizeTempleReviews` below therefore accepts both shapes and reports
 * `averageRating: null` — rather than recomputing one from whichever page of
 * rows happens to be in hand, which would be a different number wearing the
 * same label.
 *
 * ── why this module does not import lib/api.ts ──────────────────────────────
 * Several suites `vi.mock('../lib/api', ...)` with a factory listing only the
 * two or three helpers they need. Under ESM a named import that the factory
 * omits throws at module-load time, so importing `getTempleReviews` from here
 * would break those suites the moment a temple page imported this file. The
 * fetch is duplicated deliberately, and kept to the same 4s abort budget.
 */

export interface DevoteeReview {
  id: string;
  /** 1–5, integral. Anything else is not a review and never reaches here. */
  rating: number;
  reviewText: string | null;
  createdAt: string;
  /** First name + last initial. Never the devotee's full name. */
  reviewerName: string;
  pujaTypeName: string | null;
}

export interface TempleReviews {
  reviews: DevoteeReview[];
  /** Total rated bookings for the temple, as reported by the route. */
  total: number;
  /** The route's own average, or null when the payload did not carry one. */
  averageRating: number | null;
}

export const EMPTY_TEMPLE_REVIEWS: TempleReviews = Object.freeze({
  reviews: [],
  total: 0,
  averageRating: null,
}) as TempleReviews;

/** How many rows a temple page shows. The route's own default page is 10. */
export const TEMPLE_REVIEWS_PAGE_SIZE = 6;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * `"2026-07-14T09:00:00.000Z"` → `"July 2026"`.
 *
 * Built from UTC parts rather than `toLocaleDateString`, so the string is
 * identical on the server and in the browser (no hydration diff) and does not
 * change with the CI container's locale.
 */
export function formatReviewMonth(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || iso.length === 0) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * `"Rahul Sharma"` → `"Rahul S."`.
 *
 * The route selects `user.fullName`, which is a real person's real name
 * attached to a religious purchase. Publishing it in full on a public page is
 * a privacy problem of its own, and it is not needed to make the review
 * credible.
 */
export function abbreviateReviewer(fullName: string | null | undefined): string {
  const trimmed = typeof fullName === 'string' ? fullName.trim().replace(/\s+/g, ' ') : '';
  if (!trimmed) return 'Devotee';
  const parts = trimmed.split(' ');
  const last = parts[parts.length - 1] ?? '';
  if (parts.length === 1 || !last) return trimmed;
  return `${parts.slice(0, -1).join(' ')} ${last.charAt(0).toUpperCase()}.`;
}

/**
 * A row is a review only if a real booking carries a real rating.
 *
 * The route already filters `rating: { not: null }`, but this is the assertion
 * the page depends on and it costs nothing to hold it here too — a fixture, a
 * cache of an older response, or a future route change cannot slip an unrated
 * row onto the page behind a star row.
 */
export function isPublishableReview(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  const rating = (row as { rating?: unknown }).rating;
  return (
    typeof rating === 'number' &&
    Number.isFinite(rating) &&
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5
  );
}

function toDevoteeReview(row: Record<string, unknown>, index: number): DevoteeReview | null {
  if (!isPublishableReview(row)) return null;
  const user = (row.user ?? {}) as { fullName?: unknown };
  const pujaType = (row.pujaType ?? {}) as { name?: unknown };
  const text = row.reviewText;
  return {
    id: typeof row.id === 'string' && row.id ? row.id : `review-${index}`,
    rating: row.rating as number,
    reviewText: typeof text === 'string' && text.trim() ? text.trim() : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    reviewerName: abbreviateReviewer(
      typeof user.fullName === 'string' ? user.fullName : null,
    ),
    pujaTypeName: typeof pujaType.name === 'string' && pujaType.name ? pujaType.name : null,
  };
}

/**
 * Parse either shape the reviews payload can arrive in — the route's own
 * `{ reviews, total, averageRating, ... }` or the `{ data, pagination }` that
 * `serverFetch`'s normaliser rewrites it into — and drop everything that is
 * not a rated booking. Never throws.
 */
export function normalizeTempleReviews(payload: unknown): TempleReviews {
  if (!payload || typeof payload !== 'object') return EMPTY_TEMPLE_REVIEWS;
  const obj = payload as Record<string, unknown>;

  const rawRows = Array.isArray(obj.reviews)
    ? obj.reviews
    : Array.isArray(obj.data)
      ? obj.data
      : null;
  if (!rawRows) return EMPTY_TEMPLE_REVIEWS;

  const reviews = rawRows
    .map((row, i) => (row && typeof row === 'object'
      ? toDevoteeReview(row as Record<string, unknown>, i)
      : null))
    .filter((r): r is DevoteeReview => r !== null);

  const pagination = (obj.pagination ?? {}) as { total?: unknown };
  const rawTotal = typeof obj.total === 'number' ? obj.total : pagination.total;
  // The route counts rated bookings, so its total already matches what we
  // publish. Fall back to the rows we kept, never to the rows we rejected.
  const total =
    typeof rawTotal === 'number' && Number.isFinite(rawTotal) && rawTotal >= reviews.length
      ? rawTotal
      : reviews.length;

  const avg = obj.averageRating;
  const averageRating =
    typeof avg === 'number' && Number.isFinite(avg) && avg > 0 ? avg : null;

  return { reviews, total, averageRating };
}

function reviewsApiBase(): string {
  const candidate =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

/**
 * Fetch the real reviews for one temple. Never throws and never invents.
 *
 * `apiSlug` is the slug of the API's temple row (`temple.slug`, the long
 * `<name>-<city>` form), not the curated short slug the URL uses — the route
 * looks the temple up by its own slug. Pass `null` when the API has no row for
 * the temple: there is nothing to fetch, and skipping the call keeps a curated
 * page that the API has never heard of from making a request per render.
 *
 * On any failure — API down, 404, timeout, malformed body — the caller gets
 * the empty result and the page renders its honest empty state. A review
 * section is never a reason for a temple page to 500.
 */
export async function getTempleDevoteeReviews(
  apiSlug: string | null | undefined,
): Promise<TempleReviews> {
  if (!apiSlug) return EMPTY_TEMPLE_REVIEWS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `${reviewsApiBase()}/temples/${encodeURIComponent(apiSlug)}/reviews?page=1&limit=${TEMPLE_REVIEWS_PAGE_SIZE}`,
      { next: { revalidate: 300, tags: [`temple-reviews-${apiSlug}`] }, signal: controller.signal },
    );
    if (!res.ok) return EMPTY_TEMPLE_REVIEWS;
    return normalizeTempleReviews(await res.json());
  } catch {
    return EMPTY_TEMPLE_REVIEWS;
  } finally {
    clearTimeout(timeoutId);
  }
}
