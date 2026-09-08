import Link from 'next/link';
import { Gift, Clock, Package, ArrowRight } from 'lucide-react';
import { buttonClass } from '../ui/button-recipe';

/**
 * The NRI band.
 *
 * WHY IT GETS ITS OWN SECTION RATHER THAN A CARD IN ServiceLanes. NRI pricing is
 * 9-10x domestic (PROJECT_CONTEXT.md, business rule 2), which makes this the
 * highest-margin lane in the product by a wide margin — and it is the one lane
 * whose objection is completely different from every other. A devotee in
 * Bengaluru is deciding whether to trust a stranger with a ritual. A devotee in
 * New Jersey has already decided that; their problem is distance, a family they
 * cannot be with, and a time zone that puts the aarti at 3am their time. A card
 * in a grid cannot answer that. A band can.
 *
 * WHAT IS DELIBERATELY NOT CLAIMED HERE. No delivery window, no country list, no
 * "trusted by N families abroad". lib/city-pujas.ts carries real USD prices and
 * /gift is a real page with a real flow, so those are what this points at.
 * Everything else in this space is the kind of unverifiable claim CM-11 already
 * stripped off this page once.
 *
 * The time-zone line is the one that pairs with TempleClock in the hero: the
 * page states the temple hour in IST at the top, and this band tells a devotee
 * eight hours behind it that they do not have to be awake for it.
 */

const POINTS = [
  {
    Icon: Gift,
    title: 'Book it for them, from here',
    body: 'Your family attends, or nobody does — the sankalp still carries your name and gotra.',
  },
  {
    Icon: Clock,
    title: 'The temple keeps Indian time',
    body: 'The aarti happens on the temple’s schedule. The recording reaches you after it, so you never have to be awake for it.',
  },
  {
    Icon: Package,
    title: 'Prasad goes to their address',
    body: 'Posted to the family in India, not to you — so it arrives while it still means something.',
  },
];

export default function NriLane() {
  return (
    <section
      id="nri"
      aria-labelledby="nri-lane-heading"
      className="py-8 md:py-11"
      style={{
        background: 'linear-gradient(180deg, #FFF7EE 0%, var(--color-bg) 78%)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="container-wide">
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <p
              data-reveal="fade"
              className="mb-1 text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--color-primary)' }}
            >
              Living abroad
            </p>
            <h2
              id="nri-lane-heading"
              data-reveal="spring"
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Be at the temple without the flight
            </h2>
            <p
              data-reveal="up"
              data-delay="1"
              className="mt-2 max-w-[46ch] text-sm leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Gift a puja to your parents in India, or have one performed in your own name at a
              temple you grew up near. Pay in your currency; the video reaches you wherever you are.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href="/gift" prefetch={false} className={buttonClass('primary', 'md')}>
                Gift a puja <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pujas"
                prefetch={false}
                className="inline-flex min-h-[44px] items-center text-sm underline underline-offset-4"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Book in your own name
              </Link>
            </div>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-3 lg:gap-3">
            {POINTS.map((p, i) => (
              <li
                key={p.title}
                data-reveal="up"
                data-delay={String(i + 1)}
                className="flex h-full flex-col rounded-xl p-4"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
              >
                <p.Icon
                  className="mb-2.5 h-4 w-4 shrink-0"
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                />
                <p
                  className="mb-1 text-sm font-semibold leading-snug"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  {p.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
