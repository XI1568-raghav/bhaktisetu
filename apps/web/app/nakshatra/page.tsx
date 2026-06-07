import type { Metadata } from 'next';
import Link from 'next/link';
import { NAKSHATRAS } from '../../lib/nakshatras';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '27 Nakshatras — Vedic Lunar Mansions, Lords, Deities, Compatibility | Darshya',
  description:
    'Complete guide to all 27 Vedic nakshatras (lunar mansions). Find your birth nakshatra, ruling planet, deity, qualities, career, marriage compatibility, and spiritual practice.',
  alternates: { canonical: `${BASE_URL}/nakshatra` },
  openGraph: {
    title: '27 Nakshatras — Complete Vedic Astrology Guide',
    description: 'All 27 lunar mansions with lord, deity, qualities, career, compatibility.',
    url: `${BASE_URL}/nakshatra`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '27 Vedic Nakshatras',
    numberOfItems: NAKSHATRAS.length,
    itemListElement: NAKSHATRAS.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/nakshatra/${n.slug}`,
      name: n.name,
    })),
  };
}

const ganaColor: Record<string, string> = {
  Deva: 'bg-emerald-100 text-emerald-800',
  Manushya: 'bg-blue-100 text-blue-800',
  Rakshasa: 'bg-rose-100 text-rose-800',
};

export default function NakshatraIndex() {
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
          The 27 Nakshatras
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          Vedic lunar mansions — each 13°20′ of the zodiac, ruled by a planet and presided over by a
          deity. Your janma nakshatra shapes personality, career, marriage compatibility, and
          dharmic path. Click any nakshatra for the full reading.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAKSHATRAS.map((n, i) => (
          <Link
            key={n.slug}
            href={`/nakshatra/${n.slug}`}
            className="group rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-xs text-surface-500 font-mono mb-0.5">#{i + 1}</div>
                <h2 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                  {n.name}
                </h2>
                <div className="text-sm text-surface-600">{n.sanskritName}</div>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${ganaColor[n.gana]}`}
              >
                {n.gana}
              </span>
            </div>
            <p className="text-sm text-surface-700 leading-snug mb-3">{n.meaning}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-600">
              <span>
                <strong className="text-surface-800">Lord:</strong> {n.lord}
              </span>
              <span>
                <strong className="text-surface-800">Deity:</strong> {n.deity}
              </span>
              <span>
                <strong className="text-surface-800">Rashi:</strong> {n.rashi}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Don&apos;t know your nakshatra?</h2>
        <p className="text-surface-700 text-sm mb-4">
          Get a free birth-chart reading with your janma nakshatra, rashi, and Vimshottari dasha.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/astrology"
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Free birth chart →
          </Link>
          <Link
            href="/ask-pandit"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Ask a pandit
          </Link>
        </div>
      </section>
    </main>
  );
}
