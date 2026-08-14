import Link from 'next/link';
import { CalendarCheck, UserCheck, Video, ArrowRight } from 'lucide-react';

/**
 * CM-13 (prod sweep 2026-08-12) — the homepage never answered the one question
 * every buyer in this category has: "how do I know the puja actually happened?"
 *
 * A token scan of the full 6,966-character page text found "How it works" 0
 * times, "video proof" asserted 4 times with 0 examples, "guarantee" 0 times,
 * and "refund" once — as a footer link. Meanwhile the strongest trust line on
 * the page, "₹0 hidden fees", sat ten screens below the fold.
 *
 * Three steps, directly under the hero. Every claim here is one the product
 * actually keeps today:
 *   - video proof is a hard business rule (PROJECT_CONTEXT.md rule 1: "Video
 *     proof MANDATORY for puja bookings");
 *   - the cancellation window is business rule 5, "cancellation up to 24h
 *     before scheduled time", stated exactly and not rounded up to 48h;
 *   - fees are disclosed on the wizard's first screen (CM-03), so "no surprise
 *     at the Pay button" is now true.
 *
 * DELIBERATELY ABSENT: a refund percentage. Three contradictory refund ladders
 * are live in the codebase and the owner has not chosen one (CM-04), so this
 * section states the cancellation WINDOW — which is unambiguous — and links to
 * the policy rather than publishing a number that may be wrong.
 */

const STEPS = [
  {
    Icon: CalendarCheck,
    title: 'Pick the puja and the date',
    body: 'Choose a ritual, a temple and a slot. The full price, including the platform fee, is shown before you enter any details.',
  },
  {
    Icon: UserCheck,
    title: 'A verified pandit is assigned',
    body: 'Every pandit on Darshya is Aadhaar-verified. You get their name and the confirmed time before the day of the puja.',
  },
  {
    Icon: Video,
    title: 'You receive the video proof',
    body: 'The ceremony is recorded and sent to you — this is mandatory on every booking, not an add-on. Prasad follows by post.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-8 md:py-10" aria-labelledby="how-it-works-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="how-it-works-heading"
          className="text-xl sm:text-2xl font-semibold tracking-tight mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          How it works
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
          Three steps, and you can cancel up to 24 hours before the scheduled time.
        </p>

        <ol className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-xl p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ background: '#FFF8F0', color: '#7d4e1f' }}
                >
                  {i + 1}
                </span>
                <step.Icon
                  className="h-5 w-5"
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                />
              </div>
              <h3
                className="mb-1 text-base font-semibold tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link
            href="/pujas"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-5 text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            Book a puja <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/refunds"
            className="inline-flex min-h-[44px] items-center text-sm underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Cancellation and refund policy
          </Link>
        </div>
      </div>
    </section>
  );
}
