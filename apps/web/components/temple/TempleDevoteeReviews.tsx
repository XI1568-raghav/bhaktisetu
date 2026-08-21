import { Star, MessageSquare } from 'lucide-react';
import type { TempleReviews } from '../../lib/reviews';
import { formatReviewMonth } from '../../lib/reviews';

/**
 * TC-05 — the devotee-review slot on /temples/[slug], rendered from real rows.
 *
 * What used to sit here was `rich.testimonials`: 51 hand-written testimonials
 * across 17 temples, 46 of them five-star, each with an invented full name, an
 * invented home city and a claim of a Darshya booking that never happened.
 * Those were removed, and the slot was left empty.
 *
 * This renders the other half. Every row here is a `PujaBooking` at this
 * temple that carries a devotee rating (`GET /temples/:slug/reviews`), so a
 * star on this page means somebody paid for a puja and rated it. Where no such
 * row exists the section says exactly that. An empty state is honest; an
 * invented five-star review is not.
 *
 * Deliberately absent: any aggregate. The route's own `averageRating` is
 * dropped by `serverFetch`'s paginator normaliser, and computing an average
 * from whichever page of rows is in hand would publish a different number
 * under the same label. If an average is wanted, read it from the route
 * directly and label it for what it is.
 */
export default function TempleDevoteeReviews({
  templeName,
  reviews,
  reveal = false,
}: {
  templeName: string;
  reviews: TempleReviews;
  /**
   * Opt into the scroll-reveal treatment.
   *
   * `[data-reveal]` starts at `opacity: 0` (globals.css) and is un-hidden
   * either by the ScrollReveal observer or, failing that, by a 1.5s CSS
   * fallback animation. ScrollReveal is NOT mounted on the temple routes, so
   * every section on the rich layout takes the 1.5s path — matching it keeps
   * this section in step with its neighbours. The simple layout uses plain
   * sections with no reveal at all, so it passes `false` and this renders
   * immediately rather than fading in 1.5s after everything around it.
   */
  reveal?: boolean;
}) {
  const rows = reviews.reviews;

  return (
    <section {...(reveal ? { 'data-reveal': '' } : {})} data-testid="temple-devotee-reviews">
      <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
        <MessageSquare className="h-5 w-5 text-saffron-600" />
        Devotee Reviews
      </h2>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm leading-relaxed text-surface-600">
            No devotee reviews yet for {templeName}.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-surface-500">
            Darshya only publishes a review once a devotee has completed a booking
            at this temple and rated it, so this stays empty until one exists.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => {
              const month = formatReviewMonth(r.createdAt);
              return (
                <article
                  key={r.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-surface-800">{r.reviewerName}</span>
                    <span
                      className="flex items-center gap-0.5"
                      aria-label={`Rated ${r.rating} out of 5`}
                    >
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          aria-hidden="true"
                          className={
                            i <= r.rating
                              ? 'h-3.5 w-3.5 fill-saffron-500 text-saffron-500'
                              : 'h-3.5 w-3.5 text-surface-300'
                          }
                        />
                      ))}
                    </span>
                    {r.pujaTypeName && (
                      <span className="text-sm text-surface-500">{r.pujaTypeName}</span>
                    )}
                    {month && <span className="text-sm text-surface-400">{month}</span>}
                  </div>
                  {r.reviewText && (
                    <p className="mt-2 text-sm leading-relaxed text-surface-600">
                      {r.reviewText}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          {reviews.total > rows.length && (
            <p className="mt-3 text-sm text-surface-500">
              Showing {rows.length} of {reviews.total} devotee reviews.
            </p>
          )}
        </>
      )}
    </section>
  );
}
