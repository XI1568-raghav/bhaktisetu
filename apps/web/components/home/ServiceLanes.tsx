import Link from 'next/link';
import {
  Flame,
  Video,
  Sparkles,
  Mountain,
  Radio,
  Heart,
  HandCoins,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

/**
 * Every way to be present — the six lanes, on one screen.
 *
 * WHY THIS EXISTS. The home page sold exactly one thing (a puja at a temple)
 * across eight sections, while the product has six revenue lines. A devotee who
 * wanted a pandit at their own house, an astrologer, a yatra, gaushala seva or
 * simply to donate had no route from the home page at all — those lanes lived
 * only in the nav, behind a hover.
 *
 * WHY IT IS ONE SECTION AND NOT FIVE. The obvious move is a strip per lane. That
 * is exactly how this page reached twelve sections and 6,382px, and four of
 * those strips rendered with no heading at all. One dense, scannable grid says
 * the same thing in ~420px and lets a devotee compare the lanes side by side
 * instead of scrolling past them one at a time.
 *
 * EVERY META STRING IS SOURCED, NOT WRITTEN. The numbers below are the ones the
 * codebase can already defend — ₹15/min is the figure the astrology card on this
 * same page renders, 35 destinations is the count in lib/category-tree.ts, ₹51
 * is the smallest real gaushala adoption plan. Where there is no verified
 * number, the meta states a GUARANTEE instead of inventing a figure. Do not add
 * a count here that no module can produce; CM-11 removed every hardcoded
 * inventory claim from this page once already ("200+ verified temples",
 * "500+ vetted pandits") and this grid is the obvious place to reintroduce one.
 */

type Accent = 'saffron' | 'indigo' | 'emerald' | 'amber';

const ACCENT: Record<Accent, { tint: string; fg: string; ring: string }> = {
  saffron: { tint: '#FDF0E4', fg: '#B4530C', ring: '#F6D8BC' },
  indigo: { tint: '#EEF0FC', fg: '#4338CA', ring: '#D5DAF7' },
  emerald: { tint: '#E7F2EC', fg: '#2E6A46', ring: '#C8E2D3' },
  amber: { tint: '#FBF0DC', fg: '#96650B', ring: '#F0DDB4' },
};

interface Lane {
  icon: LucideIcon;
  accent: Accent;
  title: string;
  blurb: string;
  /** A price, a count, or a guarantee — never a number nothing can produce. */
  meta: string;
  href: string;
}

/**
 * TIER 1 — the booked lanes, in revenue order.
 *
 * Ordered by what a booking is worth, not by what is easiest to explain: a
 * pandit at your own address is the highest-ticket thing Darshya sells, a temple
 * puja is the core SKU, an astrologer consult bills by the minute, and a yatra
 * is a package. They get the full card — icon, blurb, price — because a devotee
 * choosing between them is choosing how to spend money.
 */
const BOOKED_LANES: Lane[] = [
  {
    icon: Flame,
    accent: 'saffron',
    title: 'Book a pandit for your home',
    blurb: 'A verified pandit performs the ritual at your address — griha pravesh, satyanarayan, havan.',
    meta: 'At your address',
    href: '/pujas',
  },
  {
    icon: Video,
    accent: 'saffron',
    title: 'Book a puja at a temple',
    blurb: 'Named in your sankalp and performed on your behalf, wherever you are.',
    meta: 'Video proof, every booking',
    href: '/pujas',
  },
  {
    icon: Sparkles,
    accent: 'indigo',
    title: 'Talk to an astrologer',
    blurb: 'Kundli, muhurat, dosha remedies — with a verified Vedic astrologer, one to one.',
    meta: 'From ₹15/min',
    href: '/astrology',
  },
  {
    icon: Mountain,
    accent: 'emerald',
    title: 'Go on yatra',
    blurb: 'Char Dham, the twelve Jyotirlinga, the Shakti Peeth — planned end to end.',
    meta: '35 destinations',
    href: '/yatra',
  },
];

/**
 * TIER 2 — free to watch, or given rather than bought.
 *
 * These stay VISIBLE and never move off the page: live darshan is the daily
 * habit that brings someone back between bookings, and seva and donation are
 * the reason a good part of this audience arrives at all. They are a compact
 * row rather than full cards because the decision is smaller — there is no
 * price to compare, and giving them equal visual weight to a ₹8,499 booking
 * would flatten the one hierarchy this section exists to state.
 */
const OPEN_LANES: Lane[] = [
  {
    icon: Radio,
    accent: 'saffron',
    title: 'Live darshan',
    blurb: 'Watch aarti from verified temples.',
    meta: 'Free, no booking',
    href: '/darshan',
  },
  {
    icon: Heart,
    accent: 'amber',
    title: 'Gaushala seva',
    blurb: 'Feed and care for a cow at a registered gaushala.',
    meta: 'From ₹51 a month',
    href: '/gaushala',
  },
  {
    icon: HandCoins,
    accent: 'amber',
    title: 'Donate to a temple',
    blurb: 'Annadaan, deepdaan and temple upkeep.',
    meta: 'Receipt on every donation',
    href: '/donations',
  },
];

export default function ServiceLanes() {
  return (
    <section className="py-8 md:py-11" style={{ background: 'var(--color-surface)' }}>
      <div className="container-wide">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              data-reveal="fade"
              className="mb-1 text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--color-primary)' }}
            >
              Everything Darshya does
            </p>
            <h2
              data-reveal="spring"
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Every way to be present
            </h2>
          </div>
          <p className="max-w-[38ch] text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Six lanes, one account. Each one runs on the same verified supply and the same refund
            policy.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BOOKED_LANES.map((lane, i) => {
            const a = ACCENT[lane.accent];
            return (
              <li key={lane.title}>
                <Link
                  href={lane.href}
                  prefetch={false}
                  data-reveal="up"
                  data-delay={String(Math.min(i + 1, 4))}
                  className="group flex h-full flex-col rounded-xl p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(60,40,20,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="mb-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: a.tint, border: `1px solid ${a.ring}` }}
                  >
                    <lane.icon className="h-4 w-4" style={{ color: a.fg }} />
                  </span>

                  <h3
                    className="mb-1 text-sm font-semibold leading-snug"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    {lane.title}
                  </h3>

                  <p
                    className="mb-3 flex-1 text-xs leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {lane.blurb}
                  </p>

                  <span className="mt-auto flex items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2 py-1 text-[11px] font-semibold"
                      style={{ background: a.tint, color: a.fg }}
                    >
                      {lane.meta}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: a.fg }}
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Tier 2 — visible, deliberately lighter. See OPEN_LANES. */}
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPEN_LANES.map((lane, i) => {
            const a = ACCENT[lane.accent];
            return (
              <li key={lane.title}>
                <Link
                  href={lane.href}
                  prefetch={false}
                  data-reveal="up"
                  data-delay={String(Math.min(i + 1, 4))}
                  className="group flex h-full items-center gap-3 rounded-xl px-4 py-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-12px_rgba(60,40,20,0.3)] focus:outline-none focus-visible:ring-2"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: a.tint, border: `1px solid ${a.ring}` }}
                  >
                    <lane.icon className="h-3.5 w-3.5" style={{ color: a.fg }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-sm font-semibold leading-snug"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                    >
                      {lane.title}
                    </span>
                    <span
                      className="block text-xs leading-snug"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {lane.blurb}
                    </span>
                  </span>
                  <span
                    className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold"
                    style={{ background: a.tint, color: a.fg }}
                  >
                    {lane.meta}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
