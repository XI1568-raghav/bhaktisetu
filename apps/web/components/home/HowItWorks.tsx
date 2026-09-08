import Link from 'next/link';
import { buttonClass } from '../ui/button-recipe';
import { CalendarCheck, UserCheck, Video, ArrowRight } from 'lucide-react';
import { PROMISES } from './WhatYouGet';

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
    // HOME-01 (2026-08-23 re-rank): below the fold, zero images, 4,667 B of
    // markup. content-visibility: auto skips its layout and paint while it is
    // far from the viewport and renders it normally once it is near, so this is
    // safe without a live viewport measurement. Markup stays in the HTML for
    // crawlers. See __tests__/home-deferral-ranking.home01.test.ts.
    <section id="how-it-works" className="defer-paint py-8 md:py-10" aria-labelledby="how-it-works-heading">
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

        {/*
          HOME-IA (2026-09-08) — "What you actually get" merged in here.
          It was a separate section immediately below this one, and the two were
          answering the same question twice: this one says what happens, that one
          said what you are owed while it happens. A devotee read three steps,
          then read five more cards covering the same ground, and the page paid
          ~550px for the repetition.

          The rows are imported, never copied: PROMISES is sourced line by line
          against the code that enforces each one (the refund ladder from
          lib/cancellation-policy, the fee from lib/puja-pricing, video proof
          from the API gate that refuses to mark a booking delivered without it).
          A second hand-written copy here is exactly how a promise drifts away
          from its mechanism.

          Rendered tighter than the old section: title and body, no `backing`
          small print. The mechanism sentences still ship on /refunds and the
          puja pages, where a reader who wants them has already asked.
        */}
        <div className="mt-7 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
          <h3
            className="mb-1 text-base font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            What you are owed, at every step
          </h3>
          <p className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Each line is something the system refuses to operate without — not a policy we
            intend to follow.
          </p>

          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {PROMISES.map((row, i) => (
              <li
                key={row.title}
                data-reveal="cascade"
                data-delay={String(Math.min(i + 1, 6))}
                className="flex items-start gap-3 rounded-xl p-3.5"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <row.Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {row.title}
                  </p>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {row.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/pujas"
            className={buttonClass('primary', 'md')}
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
