import type { Metadata } from 'next';
import Link from 'next/link';
import { FESTIVALS } from '../../lib/festivals';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';
const YEAR = 2026;

export const metadata: Metadata = {
  title: `Hindu Calendar ${YEAR} — Complete Festival & Vrat Calendar | Darshya`,
  description: `Full Hindu festival calendar for ${YEAR}: dates, rituals, fasting type, presiding deity for all 30+ major festivals. Maha Shivratri, Holi, Ram Navami, Diwali, Janmashtami, Ekadashi, and more.`,
  alternates: { canonical: `${BASE_URL}/calendar` },
  openGraph: {
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

export default function CalendarPage() {
  const byMonth: Map<number, typeof FESTIVALS> = new Map();
  for (let m = 0; m < 12; m++) byMonth.set(m, []);
  for (const f of FESTIVALS) {
    const [, mm] = f.date2026.split('-');
    if (!mm) continue;
    const monthIdx = parseInt(mm, 10) - 1;
    const bucket = byMonth.get(monthIdx);
    if (bucket) bucket.push(f);
  }
  for (const arr of byMonth.values()) arr.sort((a, b) => a.date2026.localeCompare(b.date2026));

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hindu Festival Calendar ${YEAR}`,
    numberOfItems: FESTIVALS.length,
    itemListElement: FESTIVALS.map((f, idx) => ({
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
        <p className="text-xs uppercase tracking-wider text-saffron-600">{FESTIVALS.length} festivals · all month-by-month</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">Hindu Calendar {YEAR}</h1>
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
                            {isToday && <span className="ml-2 rounded bg-saffron-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Today</span>}
                          </h3>
                          <span className="font-serif text-sm text-gray-600">{f.sanskrit}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">{f.deity}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-700">{f.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          {f.fastingType !== 'none' && (
                            <span className={`rounded px-2 py-0.5 font-semibold uppercase ${
                              f.fastingType === 'full' ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700'
                            }`}>{f.fastingType} fast</span>
                          )}
                          {f.pujasAvailable.length > 0 && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold uppercase text-emerald-800">
                              {f.pujasAvailable.length} puja{f.pujasAvailable.length > 1 ? 's' : ''} bookable
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
