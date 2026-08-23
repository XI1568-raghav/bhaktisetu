import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { CIRCUITS } from '../../lib/pilgrimage-circuits';
import { buttonClass } from '../../components/ui/button-recipe';

// CI-10: the page announced "the 8 canonical circuits" above a grid of 19, and
// two of those 19 were the SAME url — sapta-puri appeared twice in CIRCUITS, at
// ₹48,000 and at ₹35,000, with two different stop lists. One card per URL, and
// every count on the page is read off that list rather than typed by hand.
// FIRST wins, because `getCircuit()` — which the detail page uses — is a
// `.find()`. Keeping the last would have made the card advertise ₹35k while
// /pilgrimage/sapta-puri charged ₹48k.
//
// The duplicate is now gone at source (CIRCUITS is 16 distinct records), so
// this filter is a no-op today. It stays as a render-level backstop: if a
// duplicate is ever reintroduced the grid still shows one card per URL rather
// than two contradicting each other, and the CI-02 uniqueness test fails.
const CIRCUIT_CARDS = CIRCUITS.filter(
  (c, i) => CIRCUITS.findIndex((x) => x.slug === c.slug) === i,
);

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Hindu Pilgrimage Circuits — Char Dham, Jyotirlinga, Shakti Peeth & More',
  description:
    `Plan ${CIRCUIT_CARDS.length} Hindu pilgrimage circuits — Char Dham, 12 Jyotirlinga, Sapta Puri, Shakti Peethas, Pancha Bhoota, Ashta Vinayak, Panch Kedar, Do Dham and more.`,
  alternates: { canonical: 'https://darshya.online/pilgrimage' },
  openGraph: {
    title: 'Hindu Pilgrimage Circuits — Darshya',
    description: `${CIRCUIT_CARDS.length} yatra circuits with itineraries, costs, best season, practical tips.`,
    url: 'https://darshya.online/pilgrimage',
    type: 'website',
    images: ['/og/default.png'],
  },
};

function formatInr(n: number): string {
  return `₹${(n / 1000).toFixed(0)}k`;
}

export default function PilgrimageIndex() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: CIRCUIT_CARDS.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/pilgrimage/${c.slug}`,
      name: c.name,
    })),
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🛕 Yatra · Pilgrimage Circuits
        </div>
        <h1 className={`${H1.marketing} mb-3`}>
          Hindu Pilgrimage Circuits
        </h1>
        <p className="prose-lead text-surface-700 leading-relaxed max-w-3xl mx-auto">
          {CIRCUIT_CARDS.length} Hindu pilgrimage circuits — from the 4-temple Char Dham
          to the 51 Shakti Peethas. Each page covers stops, days needed, best season,
          starting cost, and practical tips. Pair any circuit with a verified yatra
          package.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {CIRCUIT_CARDS.map((c) => (
          <Link
            key={c.slug}
            href={`/pilgrimage/${c.slug}`}
            className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-semibold text-surface-900 leading-tight">{c.name}</h2>
              <span className="text-xs font-mono text-surface-500 shrink-0 ml-2">{c.stops.length} stops</span>
            </div>
            {c.sanskritName && (
              <p className="text-sm text-saffron-700 mb-2" lang="sa">{c.sanskritName}</p>
            )}
            <p className="text-sm text-surface-700 leading-relaxed mb-3">{c.shortDesc}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 bg-surface-100 rounded text-surface-700">{c.totalDays.min}-{c.totalDays.max} days</span>
              <span className="px-2 py-0.5 bg-saffron-50 rounded text-saffron-800">from {formatInr(c.startingFromInr)}</span>
              <span className={`px-2 py-0.5 rounded ${
                c.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-800' :
                c.difficulty === 'moderate' ? 'bg-amber-50 text-amber-800' :
                'bg-rose-50 text-rose-800'
              }`}>{c.difficulty}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center mb-6">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Want a custom pilgrimage plan?</h2>
        <p className="text-surface-700 text-sm mb-4 max-w-xl mx-auto">
          Our yatra desk builds custom circuits — hotel + transport + temple darshan
          coordination, NRI-friendly. Inquiry only, no commitment.
        </p>
        <Link
          href="/yatra"
          className={buttonClass('primary', 'md')}
        >
          Browse yatra packages →
        </Link>
      </section>
    </main>
  );
}
