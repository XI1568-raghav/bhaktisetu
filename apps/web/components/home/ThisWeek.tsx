import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { buttonClass } from '../ui/button-recipe';
import { FESTIVALS, resolveBookablePujas, type FestivalInfo } from '../../lib/festivals';
import { getCatalogueSlugs } from '../../lib/puja-catalogue';
import { pujaSlugLabel } from '../../lib/enum-labels';
import { deityLine } from '../../lib/copy';

/**
 * "This week" — the homepage's dated surface.
 *
 * WHY A DATED BOARD RATHER THAN ANOTHER CATEGORY GRID
 *
 * Evergreen merchandising gives a reader no reason to act today. A tithi does.
 * Sri Mandir's own site draws the line explicitly: their chalisa and aarti
 * article pages carry zero in-body commerce, while their panchang page carries
 * three paid puja cards — they monetise the surface that already has a date on
 * it. This section is Darshya's version of that, and it supersedes
 * NextFestivalStrip, which showed exactly one festival with no browse fallback
 * story of its own.
 *
 * HONESTY CONSTRAINTS BAKED IN
 *
 * 1. Urgency here is real. The deadline is a ritual date, not a discount timer.
 *    CCPA's 2023 dark-pattern guidelines name "false urgency" specifically and
 *    have already produced penalties; a countdown to a tithi is truthful, a
 *    countdown to an invented offer is not. There is deliberately no ticking
 *    clock: we have no booking-close deadline to tick toward, and a seconds
 *    counter to a date three days out would be theatre.
 *
 * 2. Every CTA resolves against the LIVE catalogue via resolveBookablePujas.
 *    Writing pujasAvailable[0] into an href is what made 84 of 87 festival CTAs
 *    404 (DF-02) — the calendar is hand-written editorial and names rituals the
 *    platform does not sell.
 *
 * 3. It must look intentional when nothing is bookable. Two ways that happens:
 *    a festival whose rituals we genuinely do not sell (9 of the 22 dated
 *    events in the next 90 days), and the API being unreachable — in which case
 *    getCatalogueSlugs() returns an empty Set by design and EVERY card degrades
 *    at once. Both render as "Read the guide", which is a real destination,
 *    rather than a disabled button or a dead product link.
 *
 * KNOWN INVENTORY GAP, recorded here because the section makes it visible:
 * across 2026-08-23..2026-11-21 the calendar declares 22 dated events, 13 of
 * which resolve to a live slug — but satyanarayan-katha alone covers 7 of those
 * 13, and Sharad Navaratri, Durga Puja and Chhath resolve to nothing at all.
 * The fix is catalogue rows (a Durga/Chandi SKU and a Surya SKU), not UI.
 */

/** How far ahead to look. Beyond ~6 weeks "this week" stops being true. */
const HORIZON_DAYS = 45;

/** Cards shown. Three fits one row at lg and stays scannable on a phone. */
const MAX_CARDS = 3;

function startOfTodayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return Math.round((b - a) / 86_400_000);
}

function whenLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** Upcoming festivals inside the horizon, soonest first. */
export function upcomingFestivals(now: Date = new Date(), limit = MAX_CARDS): FestivalInfo[] {
  const todayIso = startOfTodayIso(now);
  return FESTIVALS.filter((f) => {
    const d = daysBetween(todayIso, f.date2026);
    return d >= 0 && d <= HORIZON_DAYS;
  })
    .sort((a, b) => a.date2026.localeCompare(b.date2026))
    .slice(0, limit);
}

interface Props {
  /** Injected in tests; fetched from the live catalogue in the page tree. */
  catalogueSlugs?: ReadonlySet<string>;
  /** Injected in tests so the card set is deterministic. */
  now?: Date;
}

export default async function ThisWeek({ catalogueSlugs, now }: Props = {}) {
  const festivals = upcomingFestivals(now ?? new Date());
  if (festivals.length === 0) return null;

  const catalogue = catalogueSlugs ?? (await getCatalogueSlugs());
  const todayIso = startOfTodayIso(now ?? new Date());

  const cards = festivals.map((f) => {
    const bookable = resolveBookablePujas(f.pujasAvailable, catalogue);
    return {
      festival: f,
      puja: bookable[0],
      days: daysBetween(todayIso, f.date2026),
    };
  });

  return (
    <section aria-label="This week" className="py-7 md:py-10" style={{ background: 'var(--color-bg)' }}>
      <div className="container-wide">
        <div className="flex items-baseline justify-between gap-4 mb-1.5">
          <h2
            data-reveal="up"
            className="text-xl sm:text-2xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            What is coming up
          </h2>
          <Link
            href="/calendar"
            prefetch={false}
            className="tap-safe items-center gap-1 text-xs font-medium shrink-0"
            style={{ color: 'var(--color-primary)' }}
          >
            Full calendar <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p
          data-reveal="up"
          data-delay="1"
          className="prose-meta mb-5 max-w-prose"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Rituals are timed to the tithi, not to when you happen to visit. These are the
          next dates that matter.
        </p>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {cards.map(({ festival: f, puja, days }, i) => {
            const dateStr = new Date(f.date2026).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });

            return (
              <li
                key={f.slug}
                data-reveal="cascade"
                data-delay={String(i + 1)}
                // Surfaces the coverage gap to anything that later reads the DOM:
                // a card with data-bookable="false" is a dated moment we could
                // not sell into. The ratio of false to true across this list is
                // the honest measure of catalogue coverage.
                data-bookable={puja ? 'true' : 'false'}
                className="flex flex-col gap-3 p-4 rounded-xl card-hover"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: 'var(--color-primary-highlight)',
                      color: 'var(--color-primary-active)',
                    }}
                  >
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    {whenLabel(days)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                    {dateStr}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <Link href={`/festival/${f.slug}`} prefetch={false} className="group block">
                    <h3
                      className="text-base font-semibold leading-snug group-hover:underline"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {f.name}
                    </h3>
                  </Link>
                  {/* CM-10: deityLine() drops the segment when the calendar
                      stores a sentinel, rather than printing "None (…)". */}
                  {deityLine(f.deity) && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {deityLine(f.deity)}
                    </p>
                  )}
                </div>

                {puja ? (
                  <Link href={`/pujas/${puja}`} className={buttonClass('primary', 'sm', 'btn-press w-full')}>
                    Book {pujaSlugLabel(puja)} <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  // Not a disabled button and not a dead /pujas/<slug> link.
                  // The guide is a real page that genuinely helps someone
                  // observing the day at home, which is what we can honestly
                  // offer when we do not sell the ritual.
                  <Link
                    href={`/festival/${f.slug}`}
                    prefetch={false}
                    className={buttonClass('secondary', 'sm', 'w-full')}
                  >
                    How to observe it <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
