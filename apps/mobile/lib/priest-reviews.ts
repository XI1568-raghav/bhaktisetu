/**
 * `GET /api/v1/priest/reviews` — the pandit's real devotee feedback.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * `app/(priest)/reviews.tsx` never called this endpoint. It called
 * `usePriestDashboard()` + `usePriestBookings()` and then MANUFACTURED the
 * page:
 *
 *   const FALLBACK_REVIEWS = [
 *     { devotee: 'Anjali S.',  rating: 5, comment: 'Beautiful Rudrabhishek…' },
 *     { devotee: 'Ramesh K.',  rating: 5, comment: 'Pandit ji explained…'   },
 *     { devotee: 'Priya M.',   rating: 4, comment: 'Very devotional…'       },
 *   ];
 *
 * Three named people who do not exist, quoted praising pujas that were never
 * performed, shown to every pandit with no completed bookings — and the header
 * summed them into "Average 4.7 / Total 3". When there WERE completed bookings
 * it was no better: each one was mapped to `rating: 5` unconditionally, so a
 * pandit's own screen told him every devotee had given him five stars before a
 * single devotee had rated anything.
 *
 * `GET /priest/reviews` has existed since routes/priest.ts:1003. It merges the
 * `Review` table with rated `PujaBooking` rows and answers
 * `{ reviews: [...], total }`. Every field below is taken from that handler.
 *
 * The devotee's NAME is deliberately not in that payload — the handler selects
 * `userId` only — so this screen shows "A devotee" rather than inventing one.
 */

export interface PriestReviewVM {
  id: string;
  /** 1–5 as stored. `null` when the row carries no usable number. */
  rating: number | null;
  /** The devotee's own words, or `null` when they rated without writing. */
  comment: string | null;
  /** `pujaType.name` — only rated-booking rows carry it. */
  pujaName: string | null;
  bookingNumber: string | null;
  createdAt: string | null;
  /** 'review' = Review table, 'booking' = a rated PujaBooking. */
  source: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function rating(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * `null` — not `[]` — when the payload is not the shape this endpoint sends.
 * An empty list means "no devotee has rated you yet"; a failed read must not
 * be allowed to say that.
 */
export function selectPriestReviews(payload: unknown): PriestReviewVM[] | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.reviews)) return null;
  return payload.reviews.filter(isRecord).map((r) => ({
    id: String(r.id ?? ''),
    rating: rating(r.rating),
    comment: str(r.comment),
    pujaName: str(r.pujaName),
    bookingNumber: str(r.bookingNumber),
    createdAt: str(r.createdAt),
    source: str(r.source),
  }));
}

export interface PriestRatingSummary {
  /** `Priest.ratingAvg` as the server stores it. Never derived here. */
  average: number | null;
  /** `Priest.ratingCount`. */
  count: number | null;
}

/**
 * The rating headline, read off `GET /priest/dashboard`.
 *
 * It is NOT computed from the rows above. `Priest.ratingAvg` is the platform's
 * own rolling average over every rating ever left; the list is capped at 100
 * rows and merges two tables, so averaging it would print a different number
 * from the one on the dashboard tab and on the pandit's public profile.
 */
export function selectPriestRatingSummary(dashboard: unknown): PriestRatingSummary {
  if (!isRecord(dashboard)) return { average: null, count: null };
  const priest = isRecord(dashboard.priest) ? dashboard.priest : null;
  if (!priest) return { average: null, count: null };
  const avg = Number(priest.ratingAvg);
  const count = Number(priest.ratingCount);
  return {
    average: Number.isFinite(avg) && avg > 0 ? avg : null,
    count: Number.isFinite(count) && count >= 0 ? count : null,
  };
}

/** "12 Mar 2026", or `null` when there is no usable date. */
export function formatReviewDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
