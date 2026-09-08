import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
// CI-11: `date2026` is not always in 2026 — Maha Kumbh Mela is 2027-01-14. A
// month bucket keyed on the MONTH segment alone filed it under a section headed
// "January 2026" and counted it in the strapline, the jump chip and the
// ItemList JSON-LD, while /calendar/january (already year-aware) excluded it —
// the two surfaces disagreed. `festivalsInMonth` filters on the year too, so
// the index and the month route now show the same set. The off-year rows are
// not dropped; they are listed below the twelve months with their real year.
import { FESTIVALS, festivalsInMonth, resolveBookablePujas } from '../../lib/festivals';
import { getCatalogueSlugs } from '../../lib/puja-catalogue';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';
const YEAR = 2026;

export const metadata: Metadata = {
  title: `Hindu Calendar ${YEAR} — Complete Festival & Vrat Calendar`,
  description: `Full Hindu festival calendar for ${YEAR}: dates, rituals, fasting type, presiding deity for all 30+ major festivals. Maha Shivratri, Holi, Ram Navami, Diwali, Janmashtami, Ekadashi, and more.`,
  alternates: { canonical: `${BASE_URL}/calendar` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: `Hindu Calendar ${YEAR} — month by month`,
    description: 'Every Hindu festival in 2026 with dates, deity, rituals, fasting requirements, and direct puja booking.',
    url: `${BASE_URL}/calendar`,
    type: 'website',
  },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SANSKRIT = [
  'पौष / माघ', 'माघ / फाल्गुन', 'फाल्गुन / चैत्र', 'चैत्र / वैशाख',
  'वैशाख / ज्येष्ठ', 'ज्येष्ठ / आषाढ', 'आषाढ / श्रावण', 'श्रावण / भाद्रपद',
  'भाद्रपद / आश्विन', 'आश्विन / कार्तिक', 'कार्तिक / मार्गशीर्ष', 'मार्गशीर्ष / पौष',
];

/** "2027-01-14" → "14 January 2027". The year is the point; never omit it. */
function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTH_NAMES[Number(m) - 1] ?? ''} ${y}`;
}

/* PERF-04 — WHY THE FESTIVAL DESCRIPTION IS BOUNDED IN BOTH PLACES IT APPEARS.
 *
 * Measured on production 2026-09-08 (status asserted 200 first — the origin
 * serves Cloudflare block pages under a concurrent burst and those carry a fake
 * h1, so an unpaced probe measures the block page: OPS-12/F451):
 *
 *   /calendar   382,166 B raw   70,807 B gzip   31,090 B brotli
 *
 * That gzip figure is the largest on the site, from the SMALLEST of the three
 * heavy index pages — because this page's weight is unique prose, which does
 * not compress the way /aarti's 300 repeated icons do. Raw size alone would
 * have ranked this page third and sent the work to the wrong file.
 *
 * `FESTIVALS[].description` measured n=56, avg 419 chars, max 1,341. It was
 * being emitted THREE times per festival:
 *
 *   1. the month card, inside a `line-clamp-2` box that paints ~110 chars;
 *   2. the "Beyond 2026" card, same clamp;
 *   3. Event.description in the ItemList JSON-LD.
 *
 * The JSON-LD block measured 35,010 B — 9.2% of the document — and because
 * dangerouslySetInnerHTML content is a prop like any other, the identical
 * string is serialised AGAIN into the RSC flight payload: the largest single
 * `self.__next_f.push` on this page measured 35,201 B, which is exactly it.
 * ~70 KB for a field Google truncates far below 200 characters.
 *
 * Nothing is deleted. Every festival keeps its card, its link, its name and
 * its Event node; the full description is the body copy of /festival/[slug],
 * which is the URL that should rank for it. Locked by
 * __tests__/catalogue-index-payload-weight.perf04.test.tsx.
 *
 * ── WHY THIS PAGE DELIBERATELY DOES *NOT* USE content-visibility: auto ────
 *
 * /chants got it and the homepage has it in four places, so the obvious next
 * step is to "finish the job" here on the twelve month sections. Do not.
 *
 * This page's primary navigation is the row of twelve jump chips above, each
 * an `#m-N` anchor onto a month <section>. `content-visibility: auto` makes a
 * section's height an ESTIMATE from contain-intrinsic-size until it has been
 * rendered once, and the scroll offset of `#m-11` is the sum of the eleven
 * estimates before it. On a first visit — the only visit that matters here,
 * since nothing has been measured yet — every chip would land short and then
 * jerk into place as the real heights resolve. That trades this page's whole
 * interaction model for a paint saving it does not need, having already given
 * up the ~120 KB above. The homepage sections it was copied from have no
 * anchors into them, which is exactly why it is safe there and not here.
 */
const CARD_SUMMARY_MAX = 180;
const LD_SUMMARY_MAX = 200;

function summarise(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export default async function CalendarPage() {
  // DF-02: `pujasAvailable` is editorial, not inventory. Counting it printed
  // "2 pujas bookable" for festivals whose pujas both 404. Count only what the
  // live catalogue confirms.
  const catalogue = await getCatalogueSlugs();
  const bookableCount = (f: { pujasAvailable: string[] }) =>
    resolveBookablePujas(f.pujasAvailable, catalogue).length;

  const byMonth: Map<number, typeof FESTIVALS> = new Map();
  for (let m = 0; m < 12; m++) {
    byMonth.set(
      m,
      festivalsInMonth(m, YEAR).sort((a, b) => a.date2026.localeCompare(b.date2026)),
    );
  }

  const inYear = FESTIVALS.filter((f) => f.date2026.startsWith(`${YEAR}-`));
  const offYear = FESTIVALS.filter((f) => !f.date2026.startsWith(`${YEAR}-`)).sort((a, b) =>
    a.date2026.localeCompare(b.date2026),
  );

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hindu Festival Calendar ${YEAR}`,
    numberOfItems: inYear.length,
    itemListElement: inYear.map((f, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Event',
        name: f.name,
        startDate: f.date2026,
        description: summarise(f.description, LD_SUMMARY_MAX),
        url: `${BASE_URL}/festival/${f.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Hindu Calendar', item: `${BASE_URL}/calendar` },
    ],
  };

  const today = new Date();
  const isCurrentYear = today.getFullYear() === YEAR;
  const todayIso = today.toISOString().slice(0, 10);

  function getDayOfWeek(iso: string): string {
    const d = new Date(iso + 'T00:00:00Z');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] || '';
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">{inYear.length} festivals · all month-by-month</p>
        <h1 className={`${H1.catalogue} mt-1`}>Hindu Calendar {YEAR}</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Every major Hindu festival in {YEAR} with dates, presiding deity, rituals, fasting requirements,
          and direct puja booking. Lunar dates are approximate — verify with your family priest for exact muhurat.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2 text-xs">
        {MONTH_NAMES.map((name, idx) => {
          const count = byMonth.get(idx)?.length || 0;
          return (
            <a
              key={idx}
              href={`#m-${idx}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:border-saffron-300 hover:bg-saffron-50"
            >
              {name} <span className="ml-1 text-gray-500">({count})</span>
            </a>
          );
        })}
      </div>

      {MONTH_NAMES.map((name, idx) => {
        const items = byMonth.get(idx) || [];
        return (
          <section key={idx} id={`m-${idx}`} className="mb-10 scroll-mt-20">
            <div className="mb-3 flex items-baseline justify-between border-b border-gray-200 pb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {name} <span className="text-base font-normal text-gray-500">{YEAR}</span>
              </h2>
              <span className="font-serif text-sm text-gray-600">{MONTH_SANSKRIT[idx]}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No major festivals in our calendar this month.</p>
            ) : (
              <div className="space-y-3">
                {items.map((f) => {
                  const isPast = isCurrentYear && f.date2026 < todayIso;
                  const isToday = f.date2026 === todayIso;
                  const [, , dd] = f.date2026.split('-');
                  return (
                    <Link
                      key={f.slug}
                      href={`/festival/${f.slug}`}
                      className={`flex gap-4 rounded-xl border p-4 transition hover:shadow-md ${
                        isToday ? 'border-saffron-400 bg-saffron-50' :
                        isPast ? 'border-gray-200 bg-gray-50/50 opacity-70' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-saffron-100 py-2 text-center">
                        <div className="text-2xl font-bold text-saffron-900">{dd}</div>
                        <div className="text-xs uppercase text-saffron-700">{getDayOfWeek(f.date2026)}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-base font-semibold text-gray-900">
                            {f.name}
                            {isToday && <span className="ml-2 rounded bg-saffron-600 px-1.5 py-0.5 text-xs font-bold uppercase text-white">Today</span>}
                          </h3>
                          <span className="font-serif text-sm text-gray-600">{f.sanskrit}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">{f.deity}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                          {summarise(f.description, CARD_SUMMARY_MAX)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                          {f.fastingType !== 'none' && (
                            <span className={`rounded px-2 py-0.5 font-semibold uppercase ${
                              f.fastingType === 'full' ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700'
                            }`}>{f.fastingType} fast</span>
                          )}
                          {bookableCount(f) > 0 && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold uppercase text-emerald-800">
                              {bookableCount(f)} puja{bookableCount(f) > 1 ? 's' : ''} bookable
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {offYear.length > 0 && (
        <section className="mb-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Beyond {YEAR}</h2>
          <p className="mt-1 text-sm text-gray-600">
            Tracked in our calendar but falling outside {YEAR}, so they are not listed in the months
            above.
          </p>
          <div className="mt-4 space-y-3">
            {offYear.map((f) => (
              <Link
                key={f.slug}
                href={`/festival/${f.slug}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-gray-900">{f.name}</h3>
                  <span className="font-serif text-sm text-gray-600">{f.sanskrit}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">
                  {formatLongDate(f.date2026)} · {f.deity}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                  {summarise(f.description, CARD_SUMMARY_MAX)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related calendars & tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/today" className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-4 hover:bg-saffron-100">
            <div className="text-sm font-semibold text-saffron-900">Today's Panchang</div>
            <div className="text-xs text-saffron-700">Tithi, nakshatra, muhurat for today</div>
          </Link>
          <Link href="/vrat" className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 hover:bg-amber-100">
            <div className="text-sm font-semibold text-amber-900">Vrat & Fasting Guide</div>
            <div className="text-xs text-amber-700">10 major fasting traditions explained</div>
          </Link>
          <Link href="/muhurat" className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 hover:bg-emerald-100">
            <div className="text-sm font-semibold text-emerald-900">Muhurat Guide</div>
            <div className="text-xs text-emerald-700">Auspicious & inauspicious time periods</div>
          </Link>
          <Link href="/pujas" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Book a Puja</div>
            <div className="text-xs text-indigo-700">Verified pandits with video proof</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
