import type { Metadata } from 'next';
import Link from 'next/link';
import { RASHI_PROFILES } from '../../lib/rashi-profiles';
import { getRashi } from '../../lib/rashis';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '12 Rashis (Vedic Zodiac Signs) — Traits, Compatibility, Lucky Stones',
  description:
    'All 12 Vedic rashis (sidereal zodiac signs) — Mesha to Meena. Find your rashi traits, career, marriage compatibility, lucky gemstone, ruling planet, spiritual practice.',
  alternates: { canonical: `${BASE_URL}/rashi` },
  openGraph: {
    title: '12 Rashis — Complete Vedic Zodiac Guide',
    description: 'All 12 zodiac signs with traits, career, compatibility, gemstone, mantra.',
    url: `${BASE_URL}/rashi`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '12 Vedic Rashis',
    numberOfItems: RASHI_PROFILES.length,
    itemListElement: RASHI_PROFILES.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/rashi/${r.slug}`,
      name: `${r.sanskritEnglish} (${r.slug.charAt(0).toUpperCase() + r.slug.slice(1)})`,
    })),
  };
}

const elementColor: Record<string, string> = {
  Fire: 'bg-rose-100 text-rose-800',
  Earth: 'bg-emerald-100 text-emerald-800',
  Air: 'bg-sky-100 text-sky-800',
  Water: 'bg-blue-100 text-blue-800',
};

export default function RashiIndex() {
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
          The 12 Rashis
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          Sidereal zodiac signs of Vedic astrology — Mesha to Meena. Each 30° of the zodiac,
          ruled by a planet and tied to an element. Your moon-sign (chandra rashi) shapes
          emotional patterns, career path, marriage compatibility. Click any rashi for full
          profile.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RASHI_PROFILES.map((r, i) => {
          const horo = getRashi(r.slug);
          const element = horo?.element.split(' ')[0] || 'Fire';
          return (
            <Link
              key={r.slug}
              href={`/rashi/${r.slug}`}
              className="group rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-400 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-xs text-surface-500 font-mono mb-0.5">#{i + 1}</div>
                  <h2 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                    {r.sanskritEnglish} <span className="text-sm font-normal text-surface-500">({r.slug.charAt(0).toUpperCase() + r.slug.slice(1)})</span>
                  </h2>
                  <div className="text-sm text-surface-600">{r.sanskritName}</div>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${elementColor[element] || 'bg-surface-100 text-surface-700'}`}>
                  {element}
                </span>
              </div>
              <p className="text-sm text-surface-700 leading-snug mb-3">
                Symbol: <strong>{r.symbol}</strong>
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-600">
                <span>
                  <strong className="text-surface-800">Lord:</strong> {horo?.rulingPlanet || '—'}
                </span>
                <span>
                  <strong className="text-surface-800">Gemstone:</strong> {r.gemstone.split(' (')[0]}
                </span>
                <span>
                  <strong className="text-surface-800">Day:</strong> {r.luckyDay}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Want today&apos;s rashifal?</h2>
        <p className="text-surface-700 text-sm mb-4">
          Free daily horoscope with prediction, lucky color, career, love guidance.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/astrology"
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Free birth chart →
          </Link>
          <Link
            href="/nakshatra"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            27 Nakshatras
          </Link>
        </div>
      </section>
    </main>
  );
}
