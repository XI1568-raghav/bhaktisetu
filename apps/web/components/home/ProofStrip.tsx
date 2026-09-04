import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  getPujaCompletionCounts,
  hasEnoughCompletions,
  MIN_COMPLETIONS_TO_SHOW,
} from '../../lib/social-proof';
import { CITY_PUJAS } from '../../lib/city-pujas';

/**
 * PLAN §5 — the social-proof slot, gated on data that actually exists.
 *
 * WHAT THE PLAN SAID, AND WHY IT WAS WRONG
 *
 * The homepage plan called for "three real testimonials pulled from the 39
 * real bookings". Reading `lib/social-proof.ts` corrected that: 39 BOOKINGS
 * are not 39 COMPLETIONS. `getPopular()` counts only bookings in
 * (completed, delivered, video_uploaded) — the three statuses that mean the
 * ritual was actually performed — and production currently has none. The
 * module is explicit that when the platform has no completed bookings,
 * `getPopular()` returns a catalogue listing with `bookingCount: 0` on every
 * row, and 0 renders nothing.
 *
 * So this component ships as a SLOT rather than as content. It costs one
 * cached request, renders absolutely nothing today, and turns itself on the
 * day the third real completion lands. That is the opposite of what this page
 * used to do: DF-03 put a hardcoded "12,450 reviews" wall on astrologers with
 * zero consultations, and CM-11 shipped "200+ verified temples" against an
 * inventory roughly a tenth of that.
 *
 * THE RULE, INHERITED FROM lib/social-proof.ts: every number that reaches this
 * page is a count the server computed from `puja_bookings`. No fallback, no
 * seed, no "approximately", no rounding up. An empty section is honest;
 * "500+ pujas completed" is what this codebase was shipping and is not.
 *
 * WHY IT IS WORTH ADDING WHILE IT RENDERS NOTHING: the alternative is that
 * someone adds proof later by hand, under launch pressure, with a literal.
 * The slot exists so the honest path is also the easy one.
 */
export default async function ProofStrip() {
  let counts: Record<string, number> = {};
  try {
    counts = await getPujaCompletionCounts();
  } catch {
    // A failed count renders nothing, exactly like a zero count. There is no
    // degraded mode in which this section invents a figure.
    return null;
  }

  const proven = Object.entries(counts)
    .filter(([, n]) => hasEnoughCompletions(n))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([slug, n]) => ({
      slug,
      n,
      display: CITY_PUJAS.find((p) => p.puja === slug)?.pujadisplay ?? slug.replace(/-/g, ' '),
    }));

  // Below MIN_COMPLETIONS_TO_SHOW on every puja — which is production today.
  if (proven.length === 0) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="container-wide">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-primary)' }}
            >
              Actually performed
            </p>
            <h2
              className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Counted from completed bookings
            </h2>
          </div>
          <Link
            href="/pujas"
            className="tap-safe items-center gap-1 text-xs font-medium link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Book one <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {proven.map((p, i) => (
            <Link
              key={p.slug}
              href={`/pujas/${p.slug}`}
              prefetch={false}
              data-reveal="up"
              data-delay={String(i)}
              className="rounded-xl p-5 card-hover"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <span
                className="text-2xl font-semibold tabular-nums"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                {p.n}
              </span>
              <span className="mt-1 block text-sm" style={{ color: 'var(--color-text)' }}>
                {p.display}
              </span>
              <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                completed, with video sent
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--color-text-faint)' }}>
          Counts include only bookings the pandit completed and delivered. Pujas below{' '}
          {MIN_COMPLETIONS_TO_SHOW} completions are not listed.
        </p>
      </div>
    </section>
  );
}
