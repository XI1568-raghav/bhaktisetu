import type { Metadata } from 'next';
import Link from 'next/link';
import { NAVA_GRAHAS } from '../../lib/nava-grahas';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Nava-Graha — 9 Planets of Vedic Astrology, Mantras & Remedies | Darshya',
  description:
    'All 9 grahas of Jyotish — Surya, Chandra, Mangal, Budh, Brihaspati, Shukra, Shani, Rahu, Ketu. Beej mantra, gemstone, fasting day, remedies for each. Find your weak planet.',
  alternates: { canonical: `${BASE_URL}/nava-graha` },
  openGraph: {
    title: 'Nava-Graha — 9 Vedic Planets Complete Guide',
    description: 'Each graha with deity, beej mantra, gemstone, fasting day, charity, and remedies.',
    url: `${BASE_URL}/nava-graha`,
    type: 'website',
    images: ['/og/default'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Nava-Graha — 9 Vedic Planets',
    numberOfItems: NAVA_GRAHAS.length,
    itemListElement: NAVA_GRAHAS.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/nava-graha/${g.slug}`,
      name: `${g.sanskritName} (${g.english})`,
    })),
  };
}

const dayColor: Record<string, string> = {
  Sunday: 'bg-rose-100 text-rose-800 border-rose-300',
  Monday: 'bg-sky-100 text-sky-800 border-sky-300',
  Tuesday: 'bg-red-100 text-red-800 border-red-300',
  Wednesday: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Thursday: 'bg-amber-100 text-amber-800 border-amber-300',
  Friday: 'bg-pink-100 text-pink-800 border-pink-300',
  Saturday: 'bg-slate-200 text-slate-900 border-slate-400',
};

function dayBadge(day: string) {
  const k = day.split(' ')[0];
  return dayColor[k] || 'bg-surface-100 text-surface-700 border-surface-300';
}

export default function NavaGrahaIndex() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd()) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          Vedic Astrology · Jyotish
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-3 leading-tight">
          The Nava-Graha
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          Nine planets of Jyotish — seven visible bodies (Surya, Chandra, Mangal, Budh,
          Brihaspati, Shukra, Shani) plus two shadow nodes (Rahu, Ketu). Each rules a day,
          a deity, a gemstone, a body part. The strongest determines your career; the
          weakest dictates your remedy. Click a graha for full profile.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAVA_GRAHAS.map((g, i) => (
          <Link
            key={g.slug}
            href={`/nava-graha/${g.slug}`}
            className="group rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-xs text-surface-500 font-mono mb-0.5">#{i + 1}</div>
                <h2 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                  {g.sanskritName}
                </h2>
                <div className="text-sm text-surface-600">
                  {g.english} · <span className="font-mono">{g.sanskritDevanagari}</span>
                </div>
              </div>
              <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${dayBadge(g.dayOfWeek)}`}>
                {g.dayOfWeek.split(' ')[0]}
              </span>
            </div>
            <div className="text-xs text-surface-600 mb-3 line-clamp-2">
              {g.natureKaraka}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-600">
              <span>
                <strong className="text-surface-800">Gem:</strong> {g.gemstone.split(' ')[0]}
              </span>
              <span>
                <strong className="text-surface-800">Dasha:</strong> {g.mahadashaYears}y
              </span>
              <span>
                <strong className="text-surface-800">Deity:</strong> {g.presidingDeity.split(',')[0].split('(')[0].trim()}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Which graha rules your day?</h2>
        <p className="text-surface-700 text-sm mb-4">
          Each weekday is sacred to one planet. Worship that day&apos;s graha for its blessing.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d) => {
            const g = NAVA_GRAHAS.find((x) => x.dayOfWeek.startsWith(d));
            return g ? (
              <Link
                key={d}
                href={`/nava-graha/${g.slug}`}
                className={`rounded-md border px-2 py-2 font-semibold ${dayBadge(d)} hover:opacity-80`}
              >
                {d}
                <div className="text-[10px] font-normal mt-0.5">{g.sanskritName}</div>
              </Link>
            ) : null;
          })}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-surface-200 bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Related Vedic tools</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/rashi" className="px-4 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700">12 Rashis</Link>
          <Link href="/nakshatra" className="px-4 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50">27 Nakshatras</Link>
          <Link href="/muhurat" className="px-4 py-2 border border-surface-300 text-surface-700 rounded-md text-sm font-semibold hover:bg-surface-50">Muhurats</Link>
          <Link href="/astrology" className="px-4 py-2 border border-surface-300 text-surface-700 rounded-md text-sm font-semibold hover:bg-surface-50">Free birth chart</Link>
        </div>
      </section>
    </main>
  );
}
