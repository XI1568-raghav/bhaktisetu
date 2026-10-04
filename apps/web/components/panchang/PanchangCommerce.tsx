import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { buttonClass } from '../ui/button-recipe';
import { BROWSE_PUJAS_HREF, resolveContentPujas } from '../../lib/puja-link';
import { getCatalogueSlugs } from '../../lib/puja-catalogue';
import { pujaSlugLabel } from '../../lib/enum-labels';

/**
 * The commerce module under the panchang table.
 *
 * WHY THIS EXISTS
 *
 * `/panchang` renders tithi, nakshatra, yoga, karana, Rahu Kaal and
 * sunrise/sunset — the highest-intent dated surface in the product — and until
 * this module it sold nothing across ~603 lines. Sri Mandir draws the line
 * explicitly: zero in-body commerce on their evergreen chalisa and aarti
 * articles, three paid puja cards directly beneath their panchang table. They
 * monetise the surface that already carries a date. Darshya owns two dated
 * surfaces (`/panchang` and `/today`) and monetised neither.
 *
 * `components/home/ThisWeek.tsx` is the same idea for the homepage's festival
 * calendar and this module follows its conventions deliberately: resolver-gated
 * hrefs, a `data-bookable` attribute per card, and a degraded state that lands
 * somewhere real. What differs is the signal — ThisWeek reads a hand-written
 * festival calendar, this reads the tithi and the var the page is already
 * printing, so the recommendation is a function of the day rather than of a
 * merchandising decision.
 *
 * WHY NOT A GENERIC PUJA STRIP
 *
 * A strip of the three best-selling SKUs would be an advertisement. What makes
 * this defensible on a reference page is that a devotee can check the claim
 * against the table directly above it: the panchang says Ekadashi, the module
 * offers the Vishnu katha, and the two agree. If the mapping ever stopped
 * agreeing with the panchang it would be visibly wrong, which is the property
 * an honest recommendation has and an ad does not.
 *
 * THE TWO HONESTY CONSTRAINTS
 *
 * 1. Every href goes through `resolveContentPujas` (lib/puja-link.ts:78), which
 *    is the aarti/chalisa entry point into the same DF-02 resolver the festival
 *    surfaces use. `/pujas/[slug]` calls `notFound()` for a slug the live
 *    catalogue does not hold, so an unresolved slug is a hard 404 — that defect
 *    404'd 84 of 87 festival CTAs. A ritual named here that the platform does
 *    not sell is DROPPED, never linked and never redirected onto a
 *    different-but-plausible puja.
 *
 * 2. Nothing is counted, rated, reviewed or timed. There is no countdown: the
 *    only real deadline is the tithi itself, which the table above already
 *    states, and a manufactured one is the "false urgency" dark pattern the
 *    CCPA 2023 guidelines name by title. The Rahu Kaal line prints only when
 *    the panchang actually supplied a window (see `rahuKaalNote`).
 */

/** One ritual the day points to, before the catalogue has had a say. */
export interface RitualIntent {
  /** Catalogue slug this occasion asks for. Resolved before it reaches an href. */
  slug: string;
  /** What the panchang says that produced this row, in the devotee's words. */
  occasion: string;
  /** Why this ritual for this occasion — checkable against the table above. */
  reason: string;
}

/**
 * Cards shown. Two keeps the module a footnote to the panchang rather than a
 * storefront bolted under it; the tithi and the var can each contribute one.
 */
const MAX_CARDS = 2;

/**
 * Tithi → ritual.
 *
 * Every row is grounded in something the codebase already asserts, not in
 * marketing judgement:
 *   Ekadashi     apps/api/src/services/panchang.service.ts:341-344 — "dedicated
 *                to Lord Vishnu"; the Satyanarayan katha is the Vishnu vrat
 *                katha the catalogue sells.
 *   Purnima      panchang.service.ts:346-347 — "auspicious for Satyanarayan
 *                Katha", and apps/api/src/lib/puja-muhurat.ts:198 scores it as
 *                "the canonical Satyanarayan Katha day".
 *   Amavasya     panchang.service.ts:350-351 — "perform Pitru Tarpan".
 *   Chaturthi    panchang.service.ts:352-354 names Krishna Chaturthi as
 *                Sankashti; Shukla Chaturthi is the Vinayaka counterpart. Both
 *                are Ganesha days.
 *   Trayodashi   Pradosh, the Shiva twilight vrat — the same deity the Monday
 *                row below is grounded in.
 *   Chaturdashi  Krishna Chaturdashi is Masik Shivaratri. Shukla Chaturdashi is
 *                NOT, which is why the paksha is checked rather than the tithi
 *                name alone.
 *
 * Order matters: the first match wins the lead card, so the rarer occasion is
 * listed first (an Amavasya that is also a Chaturdashi is read as Amavasya).
 */
function tithiIntent(tithi: string): RitualIntent | undefined {
  const t = tithi.trim();
  const isKrishna = t.includes('Krishna');

  if (t.includes('Ekadashi')) {
    return {
      slug: 'satyanarayan-katha',
      occasion: 'Ekadashi',
      reason: 'The Vishnu fast day. The Satyanarayan katha is the reading kept on it.',
    };
  }
  if (t === 'Purnima') {
    return {
      slug: 'satyanarayan-katha',
      occasion: 'Purnima',
      reason: 'The full moon, and the day the Satyanarayan katha is traditionally performed.',
    };
  }
  if (t === 'Amavasya') {
    return {
      slug: 'pitru-dosh-nivaran-puja',
      occasion: 'Amavasya',
      reason: 'The new moon, kept for tarpan and remembrance of the ancestors.',
    };
  }
  if (t.includes('Chaturdashi') && isKrishna) {
    return {
      slug: 'rudrabhishek',
      occasion: 'Masik Shivaratri',
      reason: 'The monthly Shivaratri. The abhishek is the rite performed through the night.',
    };
  }
  if (t.includes('Trayodashi')) {
    return {
      slug: 'rudrabhishek',
      occasion: 'Pradosh',
      reason: 'The Shiva twilight window on Trayodashi, kept with an abhishek.',
    };
  }
  if (t.includes('Chaturthi')) {
    return {
      slug: 'ganesh-puja',
      occasion: isKrishna ? 'Sankashti Chaturthi' : 'Vinayaka Chaturthi',
      reason: isKrishna
        ? 'The Ganesha fast, broken after moonrise.'
        : 'The Ganesha tithi of the waxing fortnight.',
    };
  }
  return undefined;
}

/**
 * Var (weekday) → ritual, for the ~two days in three whose tithi is ordinary.
 *
 * Three of these are asserted by the API's own panchang copy
 * (panchang.service.ts:356-365): Monday "Shiva puja and Rudrabhishek
 * recommended", Tuesday "Hanuman Chalisa path recommended", Thursday
 * "Satyanarayan Katha". Wednesday and Friday come from lib/puja-link.ts:36-38
 * and :49, whose alias table already treats `wednesday-ganesh-puja` and
 * `shukravar-lakshmi-puja` as the SAME rituals as `ganesh-puja` and
 * `lakshmi-puja` — the repo has already decided those weekdays name those
 * pujas. Saturday is the Sunderkand reading kept for Shani's day.
 *
 * Sunday is Surya's day. It was absent from this table when the component was
 * written, because the catalogue then held no Surya SKU. A concurrent lane
 * seeded `surya-puja` on 2026-08-24 (apps/api/prisma/seed.ts), and that SKU's
 * own description names "every Sunday" among its occasions — so the gap closed
 * and Sunday is now mapped. It resolves through the catalogue like every other
 * row, so it still degrades to the browse card wherever the SKU is not live.
 */
const VAR_INTENTS: Readonly<Record<number, RitualIntent>> = {
  0: {
    slug: 'surya-puja',
    occasion: 'Ravivar',
    reason: "Sunday is Surya's day; the arghya is the offering kept for it.",
  },
  1: {
    slug: 'rudrabhishek',
    occasion: 'Somvar',
    reason: "Monday is Shiva's day; the abhishek is the rite kept for it.",
  },
  2: {
    slug: 'hanuman-chalisa-path',
    occasion: 'Mangalvar',
    reason: "Tuesday is Hanuman's day, kept with the Chalisa path.",
  },
  3: {
    slug: 'ganesh-puja',
    occasion: 'Budhvar',
    reason: "Wednesday is Ganesha's day.",
  },
  4: {
    slug: 'satyanarayan-katha',
    occasion: 'Guruvar',
    reason: "Thursday is Guru's day, kept with the Satyanarayan katha.",
  },
  5: {
    slug: 'lakshmi-puja',
    occasion: 'Shukravar',
    reason: "Friday is Lakshmi's day.",
  },
  6: {
    slug: 'sunderkand-path',
    occasion: 'Shanivar',
    reason: "Saturday's Sunderkand reading, kept as the relief from Shani.",
  },
};

/**
 * What this day asks for, most specific first.
 *
 * The tithi outranks the var because it is the rarer signal: a Somvar comes
 * every week, an Ekadashi twice a month, an Amavasya once. Deduplicated by
 * slug so a Guruvar Ekadashi offers the Satyanarayan katha once, under the
 * Ekadashi heading, rather than twice.
 *
 * Pure and exported so the mapping can be tested without a catalogue, a
 * network call or a render — this is the part that must stay correct.
 */
export function ritualIntents(tithi: string, date: Date): RitualIntent[] {
  const candidates = [tithiIntent(tithi), VAR_INTENTS[date.getDay()]].filter(
    (i): i is RitualIntent => Boolean(i),
  );

  const seen = new Set<string>();
  return candidates.filter((i) => (seen.has(i.slug) ? false : (seen.add(i.slug), true)));
}

/**
 * The Rahu Kaal footnote, or nothing.
 *
 * `buildFallbackPanchang()` in app/panchang/page.tsx sets `rahuKaal` to an em
 * dash when the API is unreachable, and the platform-stats rule
 * (lib/platform-stats.ts:5-24) says copy loses its digits rather than falling
 * back to a literal. So the note renders only when a real window came through —
 * "Rahu Kaal is —" is worse than no line at all.
 */
function rahuKaalNote(rahuKaal: string | undefined): string | undefined {
  if (!rahuKaal || !/\d/.test(rahuKaal)) return undefined;
  return rahuKaal;
}

interface Props {
  /** The tithi exactly as the table above prints it, e.g. "Shukla Ekadashi". */
  tithi: string;
  /** The date the panchang above is for — carries the var. */
  date: Date;
  /** Injected in tests; fetched from the live catalogue in the page tree. */
  catalogueSlugs?: ReadonlySet<string>;
  /** The Rahu Kaal window, if the panchang supplied a real one. */
  rahuKaal?: string;
}

export default async function PanchangCommerce({
  tithi,
  date,
  catalogueSlugs,
  rahuKaal,
}: Props) {
  const intents = ritualIntents(tithi, date);
  // Same shape as ThisWeek.tsx:94 — injected in tests, fetched in the page
  // tree. getCatalogueSlugs() never throws; an outage yields an empty Set and
  // every card degrades together, which is the branch below.
  const catalogue = catalogueSlugs ?? (await getCatalogueSlugs());

  // Resolved ONE AT A TIME rather than as a batch, because the batch form of
  // the resolver dedupes and reorders, which would break the intent → slug
  // association and let a card headed "Amavasya" link the Somvar puja.
  const cards = intents
    .map((intent) => ({ intent, slug: resolveContentPujas([intent.slug], catalogue)[0] }))
    .filter((c): c is { intent: RitualIntent; slug: string } => Boolean(c.slug))
    .slice(0, MAX_CARDS);

  const occasions = intents.map((i) => i.occasion).join(' · ');
  const rahu = rahuKaalNote(rahuKaal);

  return (
    <section
      aria-label="Rituals for this tithi"
      data-panchang-commerce
      className="bg-white rounded-xl p-6 border border-surface-100"
    >
      <h3 className="text-lg font-semibold tracking-tight text-surface-800 flex items-center gap-2">
        <Flame className="w-5 h-5 text-saffron-500" aria-hidden="true" />
        Rituals for this tithi
      </h3>
      <p className="text-sm text-surface-500 mt-1 mb-4">
        Timed to the panchang above, not to when you happen to visit.
      </p>

      {cards.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(({ intent, slug }) => {
            const label = pujaSlugLabel(slug);
            return (
              <li
                key={slug}
                // Same convention as ThisWeek.tsx:153 — a card marked
                // data-bookable="false" is a dated moment the catalogue could
                // not be sold into, and the ratio across the dated surfaces is
                // the honest measure of coverage. Cards only reach this branch
                // once resolved, so the value is always "true" here; the
                // degraded panel below carries the "false".
                data-bookable="true"
                data-occasion={intent.occasion}
                className="flex flex-col gap-3 p-4 rounded-xl bg-surface-50 border border-surface-100"
              >
                <div>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-saffron-100 text-saffron-700"
                  >
                    {intent.occasion}
                  </span>
                  <h4 className="text-base font-semibold text-surface-800 mt-2">{label}</h4>
                  <p className="text-sm text-surface-500 mt-0.5">{intent.reason}</p>
                </div>
                <Link
                  href={`/pujas/${slug}`}
                  className={buttonClass('primary', 'md', 'w-full mt-auto')}
                >
                  Book {label}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        // The branch production is in today. Two things land here: a day whose
        // ritual the platform genuinely does not sell (every Sunday, until a
        // Surya SKU exists), and an unreachable catalogue — getCatalogueSlugs()
        // returns an empty Set on any error, so EVERY card degrades at once.
        //
        // It reads as a considered card rather than an error because the half
        // we still know is stated: the tithi and the var came from the table
        // above and are true regardless of what the catalogue is doing. What is
        // withheld is only the claim we cannot verify — that a specific puja is
        // bookable. /pujas is a real page that answers exactly that question.
        <div
          data-bookable="false"
          className="flex flex-col gap-3 p-4 rounded-xl bg-surface-50 border border-surface-100"
        >
          <p className="text-sm text-surface-600">
            {occasions ? `The panchang above reads ${occasions}. ` : ''}
            See which pujas a pandit can perform on this date.
          </p>
          <Link
            href={BROWSE_PUJAS_HREF}
            prefetch={false}
            className={buttonClass('primary', 'md', 'w-full')}
          >
            Browse all pujas
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {rahu && (
        <p className="text-xs text-surface-400 mt-4">
          Rahu Kaal is {rahu}. A pandit sets the sankalp outside it.
        </p>
      )}
    </section>
  );
}
