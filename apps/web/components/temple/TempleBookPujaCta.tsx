import Link from 'next/link';
import { ArrowUpRight, CalendarClock, Flame } from 'lucide-react';
import { templeBookCta, type TempleOfferingLike } from '../../lib/temple-booking';

/**
 * COM-12 (prod sweep 2026-08-12) — the "Book Puja via Darshya" card.
 *
 * This card used to render on every temple page unconditionally. 15 of the 20
 * seeded temples have no active offering (20 temples, 5 with an active row in
 * temple_puja_offerings), so three quarters of temple pages promised
 * "Verified priests, video proof, prasad delivery to your door" and then handed
 * the devotee an empty list — Vaishno Devi and Badrinath among them.
 *
 * The promise now lives in exactly one place, behind `templeBookCta`. When the
 * API reports nothing bookable the card says so plainly and points at the
 * pujas that ARE available, rather than substituting an optimistic default.
 */
export default function TempleBookPujaCta({
  templeSlug,
  apiTempleSlug,
  offerings,
  className,
  variant = 'card',
}: {
  templeSlug: string;
  apiTempleSlug: string | null;
  offerings: readonly TempleOfferingLike[] | null | undefined;
  className?: string;
  /** 'card' = the hero CTA tile; 'button' = the compact sidebar action. */
  variant?: 'card' | 'button';
}) {
  const cta = templeBookCta(templeSlug, apiTempleSlug, offerings);

  if (variant === 'button') {
    if (!cta.available) {
      return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-offset,#faf7f2)] px-3 py-2.5 text-center text-sm text-surface-500">
          Puja booking coming soon here.{' '}
          <Link href="/pujas" className="font-medium text-saffron-600 hover:text-saffron-700">
            Browse pujas
          </Link>
        </div>
      );
    }
    return (
      <Link
        href={cta.href}
        className={
          className ??
          'flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-2.5 text-sm font-medium text-white hover:bg-saffron-700'
        }
      >
        <Flame className="h-4 w-4" /> Book Puja
      </Link>
    );
  }

  if (!cta.available) {
    return (
      <div
        className={
          className ??
          'relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6'
        }
      >
        <CalendarClock className="mb-3 h-7 w-7 text-surface-400" />
        <div className="text-lg font-semibold text-surface-700">
          Puja booking coming soon here
        </div>
        <p className="mt-1 text-sm text-surface-500">
          We have not onboarded a priest at this temple yet, so there is nothing
          to book today.
        </p>
        <Link
          href="/pujas"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-saffron-600 hover:text-saffron-700"
        >
          See the pujas we do offer
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={cta.href}
      className={
        className ??
        'group relative overflow-hidden rounded-xl bg-gradient-to-br from-saffron-600 to-saffron-700 p-6 text-white shadow-warm-md transition-transform hover:-translate-y-0.5'
      }
    >
      <Flame className="mb-3 h-7 w-7 text-amber-200" />
      <div className="text-lg font-semibold">Book Puja via Darshya</div>
      <p className="mt-1 text-sm text-white/80">
        Verified priests, video proof, prasad delivery to your door
      </p>
      <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
