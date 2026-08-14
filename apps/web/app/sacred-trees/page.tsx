import type { Metadata } from 'next';
import Link from 'next/link';
import { SACRED_TREES } from '../../lib/sacred-trees';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '12 Sacred Trees of Sanatana Dharma — Peepal, Banyan, Bilva, Tulsi & More',
  description:
    'The twelve most sacred trees and plants of Hindu tradition — Peepal, Banyan, Bilva, Tulsi, Neem, Ashoka, Mango, Coconut, Banana, Sandalwood, Kadamba and Palash. Spiritual significance, associated deities, planting muhurta, and uses in puja and daily practice.',
  alternates: { canonical: `${BASE_URL}/sacred-trees` },
  openGraph: {
    title: '12 Sacred Trees of Sanatana Dharma',
    description:
      'Spiritual significance, associated deities, planting muhurta, and traditional uses of the twelve most sacred trees of Hindu tradition.',
    url: `${BASE_URL}/sacred-trees`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '12 Sacred Trees of Sanatana Dharma',
    numberOfItems: SACRED_TREES.length,
    itemListElement: SACRED_TREES.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/sacred-trees/${t.slug}`,
      name: `${t.name} (${t.sanskrit})`,
    })),
  };
}

export default function SacredTreesIndex() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd()) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full">
          Sacred Botany · Vrikshayurveda
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-3 leading-tight">
          12 Sacred Trees & Plants
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          From the cosmic Peepal of the Bhagavad Gita to the ever-fragrant Tulsi of every Vaishnava
          courtyard — twelve trees and plants that anchor Hindu ritual, festival, and daily worship.
          Spiritual significance, associated deity, planting muhurta, and traditional uses.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SACRED_TREES.map((t) => (
          <Link
            key={t.slug}
            href={`/sacred-trees/${t.slug}`}
            className="group rounded-xl border border-surface-200 bg-white p-5 hover:border-emerald-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 group-hover:text-emerald-700">
                  {t.name}
                </h2>
                <div className="text-sm text-surface-600">{t.sanskrit}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                {t.associatedDeity.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
            <div className="text-xs text-surface-500 italic mb-2">{t.botanicalName}</div>
            <p className="text-sm text-surface-700 line-clamp-3">{t.spiritualSignificance}</p>
            <div className="mt-3 text-xs text-surface-600">
              <span className="font-semibold">Plant on:</span> {t.plantingMuhurta.split(' / ')[0]}
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-12 p-6 rounded-xl bg-amber-50 border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-2">A note on traditional usage</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Uses listed reflect traditional Ayurvedic and ritual practice as preserved in classical
          texts (Charaka Samhita, Sushruta Samhita, Vrikshayurveda) and living temple tradition.
          They are presented for cultural and spiritual education and are not medical advice.
          Consult a qualified physician for health concerns.
        </p>
      </section>
    </main>
  );
}
