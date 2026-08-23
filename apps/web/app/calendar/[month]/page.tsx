import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
// CI-11: `date2026` is not always in 2026 — Maha Kumbh Mela is 2027-01-14.
// A month filter that reads only the MONTH segment files it under "Hindu
// Festivals in January 2026". `festivalsInMonth` filters on the year too;
// every count and every list on this page goes through it.
import { festivalsInMonth, resolveBookablePujas } from '../../../lib/festivals';
import { getCatalogueSlugs } from '../../../lib/puja-catalogue';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';
const YEAR = 2026;

const MONTHS = [
  { slug: 'january', name: 'January', idx: 0, sanskrit: 'पौष / माघ', season: 'Winter (Shishir)', focus: 'Makar Sankranti, sun moves to Capricorn — auspicious uttarayana begins.' },
  { slug: 'february', name: 'February', idx: 1, sanskrit: 'माघ / फाल्गुन', season: 'Late winter', focus: 'Vasant Panchami invokes Saraswati; Maha Shivratri night-long Shiva vigil.' },
  { slug: 'march', name: 'March', idx: 2, sanskrit: 'फाल्गुन / चैत्र', season: 'Spring (Vasant)', focus: 'Holi triumph of good; Chaitra Navratri begins the Vikram new year.' },
  { slug: 'april', name: 'April', idx: 3, sanskrit: 'चैत्र / वैशाख', season: 'Spring → Summer', focus: 'Ram Navami birth of Rama; Hanuman Jayanti devotion of the chiranjeevi.' },
  { slug: 'may', name: 'May', idx: 4, sanskrit: 'वैशाख / ज्येष्ठ', season: 'Summer (Grishma)', focus: 'Akshaya Tritiya — undying merit day, ideal for new ventures and gold.' },
  { slug: 'june', name: 'June', idx: 5, sanskrit: 'ज्येष्ठ / आषाढ', season: 'Pre-monsoon', focus: 'Rath Yatra Puri Jagannath chariot procession draws millions.' },
  { slug: 'july', name: 'July', idx: 6, sanskrit: 'आषाढ / श्रावण', season: 'Monsoon (Varsha)', focus: 'Guru Poornima honors spiritual teachers; Shravan Mondays begin.' },
  { slug: 'august', name: 'August', idx: 7, sanskrit: 'श्रावण / भाद्रपद', season: 'Monsoon peak', focus: 'Raksha Bandhan sibling vow; Janmashtami birth of Krishna at midnight.' },
  { slug: 'september', name: 'September', idx: 8, sanskrit: 'भाद्रपद / आश्विन', season: 'Late monsoon', focus: 'Ganesh Chaturthi 10-day Vinayaka festival; Pitru Paksha ancestor rites.' },
  { slug: 'october', name: 'October', idx: 9, sanskrit: 'आश्विन / कार्तिक', season: 'Sharad (autumn)', focus: 'Sharad Navratri nine nights of Devi; Dussehra triumph of Rama.' },
  { slug: 'november', name: 'November', idx: 10, sanskrit: 'कार्तिक / मार्गशीर्ष', season: 'Autumn', focus: 'Diwali festival of lights; Govardhan Puja and Bhai Dooj close the cycle.' },
  { slug: 'december', name: 'December', idx: 11, sanskrit: 'मार्गशीर्ष / पौष', season: 'Early winter', focus: 'Vivah Panchami marriage of Sita-Rama; Mokshada Ekadashi Gita Jayanti.' },
];

export function generateStaticParams() {
  return MONTHS.map((m) => ({ month: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ month: string }> }): Promise<Metadata> {
  const { month } = await params;
  const m = MONTHS.find((x) => x.slug === month);
  if (!m) return { title: 'Not found' };
  const count = festivalsInMonth(m.idx).length;
  return {
    title: `Hindu Festivals in ${m.name} ${YEAR} — ${count} Festivals with Dates`,
    description: `Complete list of Hindu festivals in ${m.name} ${YEAR}: ${m.focus} Dates, deities, rituals, fasting requirements, and puja booking.`,
    alternates: { canonical: `${BASE_URL}/calendar/${m.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${m.name} ${YEAR} — ${count} Hindu festivals`,
      description: m.focus,
      url: `${BASE_URL}/calendar/${m.slug}`,
      type: 'website',
    },
  };
}

function getDayOfWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()] || '';
}

export default async function CalendarMonthPage({ params }: { params: Promise<{ month: string }> }) {
  // DF-02: only count pujas the live catalogue can actually sell.
  const catalogue = await getCatalogueSlugs();
  const bookableCount = (f: { pujasAvailable: string[] }) =>
    resolveBookablePujas(f.pujasAvailable, catalogue).length;
  const { month } = await params;
  const m = MONTHS.find((x) => x.slug === month);
  if (!m) notFound();

  const items = festivalsInMonth(m.idx).sort((a, b) => a.date2026.localeCompare(b.date2026));

  const prev = MONTHS[(m.idx + 11) % 12]!;
  const next = MONTHS[(m.idx + 1) % 12]!;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hindu Festivals in ${m.name} ${YEAR}`,
    numberOfItems: items.length,
    itemListElement: items.map((f, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Event',
        name: f.name,
        startDate: f.date2026,
        description: f.description,
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
      { '@type': 'ListItem', position: 3, name: `${m.name} ${YEAR}`, item: `${BASE_URL}/calendar/${m.slug}` },
    ],
  };

  const today = new Date();
  const isCurrentYear = today.getFullYear() === YEAR;
  const todayIso = today.toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/calendar" className="hover:text-gray-800">Hindu Calendar {YEAR}</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{m.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">{items.length} festival{items.length === 1 ? '' : 's'} · {m.season}</p>
        <h1 className={`${H1.catalogue} mt-1`}>Hindu Festivals in {m.name} {YEAR}</h1>
        <p className="mt-2 font-serif text-base text-gray-600">{m.sanskrit}</p>
        <p className="mt-3 max-w-2xl text-base text-gray-700">{m.focus}</p>
      </header>

      {items.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">No major festivals fall in {m.name} {YEAR} in our tracked calendar.</p>
          <p className="mt-2 text-xs text-gray-500">Ekadashi twice-monthly and Pradosh fasts are still observed — see <Link href="/vrat" className="text-saffron-700 underline">Vrat guide</Link>.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {items.map((f) => {
            const isPast = isCurrentYear && f.date2026 < todayIso;
            const isToday = f.date2026 === todayIso;
            const [, , dd] = f.date2026.split('-');
            return (
              <article
                key={f.slug}
                className={`rounded-2xl border p-5 transition ${
                  isToday ? 'border-saffron-400 bg-saffron-50' :
                  isPast ? 'border-gray-200 bg-gray-50/50 opacity-75' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-saffron-100 py-3 text-center">
                    <div className="text-3xl font-bold text-saffron-900">{dd}</div>
                    <div className="text-xs uppercase text-saffron-700">{getDayOfWeek(f.date2026).slice(0, 3)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-xl font-bold text-gray-900">
                        <Link href={`/festival/${f.slug}`} className="hover:text-saffron-700">{f.name}</Link>
                        {isToday && <span className="ml-2 rounded bg-saffron-600 px-1.5 py-0.5 text-xs font-bold uppercase text-white">Today</span>}
                      </h2>
                      <span className="font-serif text-base text-gray-700">{f.sanskrit}</span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">{getDayOfWeek(f.date2026)} · {f.deity}</p>
                    <p className="mt-3 text-sm text-gray-700">{f.description}</p>

                    {f.rituals.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Key rituals</p>
                        <ul className="mt-1 space-y-0.5 text-sm text-gray-700">
                          {f.rituals.slice(0, 3).map((r) => (
                            <li key={r} className="flex gap-2"><span className="text-saffron-500">•</span><span>{r}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                      {f.fastingType !== 'none' && (
                        <span className={`rounded px-2 py-0.5 font-semibold uppercase ${
                          f.fastingType === 'full' ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700'
                        }`}>{f.fastingType} fast</span>
                      )}
                      {bookableCount(f) > 0 && (
                        <Link
                          href={`/festival/${f.slug}`}
                          className="rounded bg-emerald-100 px-2 py-0.5 font-semibold uppercase text-emerald-800 hover:bg-emerald-200"
                        >
                          Book {bookableCount(f)} puja{bookableCount(f) > 1 ? 's' : ''} →
                        </Link>
                      )}
                      {f.deitySlug && (
                        <Link
                          href={`/deity/${f.deitySlug}`}
                          className="rounded bg-indigo-50 px-2 py-0.5 font-semibold uppercase text-indigo-800 hover:bg-indigo-100"
                        >
                          About {f.deity}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link href={`/calendar/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
          <div className="text-xs uppercase text-gray-500">← Previous</div>
          <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.name} {YEAR}</div>
          <div className="text-xs text-gray-600">{prev.focus.split('.')[0]}</div>
        </Link>
        <Link href={`/calendar/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
          <div className="text-xs uppercase text-gray-500">Next →</div>
          <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.name} {YEAR}</div>
          <div className="text-xs text-gray-600">{next.focus.split('.')[0]}</div>
        </Link>
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Jump to another month</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {MONTHS.map((mm) => {
            const count = festivalsInMonth(mm.idx).length;
            const isCurrent = mm.slug === m.slug;
            return (
              <Link
                key={mm.slug}
                href={`/calendar/${mm.slug}`}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  isCurrent ? 'border-saffron-500 bg-saffron-100 text-saffron-900' :
                  'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
                }`}
              >
                {mm.name} <span className="ml-1 text-gray-500">({count})</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <Link href="/calendar" className="text-sm font-semibold text-saffron-700 hover:text-saffron-800">
            ← Back to full calendar {YEAR}
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/today" className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-4 hover:bg-saffron-100">
          <div className="text-sm font-semibold text-saffron-900">Today's Panchang</div>
          <div className="text-xs text-saffron-700">Tithi, nakshatra, muhurat for today</div>
        </Link>
        <Link href="/vrat" className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 hover:bg-amber-100">
          <div className="text-sm font-semibold text-amber-900">Vrat & Fasting Guide</div>
          <div className="text-xs text-amber-700">10 major fasting traditions</div>
        </Link>
      </section>
    </main>
  );
}
