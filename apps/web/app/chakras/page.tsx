import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { CHAKRAS } from '../../lib/chakras';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '7 Chakras (Muladhara → Sahasrara) — Bija Mantras, Deities, Awakening',
  description:
    'Complete Tantric guide to all 7 chakras — Muladhara, Svadhisthana, Manipura, Anahata, Vishuddha, Ajna, Sahasrara. Bija mantras, presiding deities, petals, elements, yoga practices, awakening path.',
  alternates: { canonical: `${BASE_URL}/chakras` },
  openGraph: {
    title: '7 Chakras — Complete Tantric Guide',
    description: 'All 7 chakras with bija mantras, deities, petals, element, awakening practices.',
    url: `${BASE_URL}/chakras`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '7 Chakras of the Subtle Body',
    numberOfItems: CHAKRAS.length,
    itemListElement: CHAKRAS.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/chakras/${c.slug}`,
      name: `${c.english} (${c.iast})`,
    })),
  };
}

function breadcrumbJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Chakras', item: `${BASE_URL}/chakras` },
    ],
  };
}

// Map chakra colour names to Tailwind utility pairs (border / bg / text accents).
const COLOR_STYLE: Record<string, { border: string; bg: string; text: string; chip: string }> = {
  Red: { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-900', chip: 'bg-red-600 text-white' },
  Orange: { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-900', chip: 'bg-orange-500 text-white' },
  Yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-900', chip: 'bg-yellow-500 text-white' },
  Green: { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-900', chip: 'bg-emerald-700 text-white' },
  Blue: { border: 'border-sky-300', bg: 'bg-sky-50', text: 'text-sky-900', chip: 'bg-sky-600 text-white' },
  Indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50', text: 'text-indigo-900', chip: 'bg-indigo-600 text-white' },
  Violet: { border: 'border-violet-300', bg: 'bg-violet-50', text: 'text-violet-900', chip: 'bg-violet-600 text-white' },
};

const FALLBACK_STYLE: { border: string; bg: string; text: string; chip: string } = {
  border: 'border-violet-300',
  bg: 'bg-violet-50',
  text: 'text-violet-900',
  chip: 'bg-violet-600 text-white',
};

function colorStyle(color: string): { border: string; bg: string; text: string; chip: string } {
  // CHAKRAS use compound colour strings (e.g. 'Green (some traditions pink)', 'Blue (sky blue or turquoise)',
  // 'Violet or pure white / golden'). Match by leading token.
  const first = color.split(/[\s(/]/)[0];
  const matched = first ? COLOR_STYLE[first] : undefined;
  return matched ?? FALLBACK_STYLE;
}

export default function ChakrasIndex() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([itemListJsonLd(), breadcrumbJsonLd()]) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          Tantra · Kundalini · Subtle Body
        </div>
        <h1 className={`${H1.marketing} mb-3`}>
          The 7 Chakras
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          The seven energy centres of the subtle body — from Muladhara at the base of the spine
          to Sahasrara at the crown. Each chakra has a bija mantra, presiding deity, petals,
          element, and an awakening practice. Click any chakra for full Tantric detail.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHAKRAS.map((c) => {
          const style = colorStyle(c.color);
          return (
            <Link
              key={c.slug}
              href={`/chakras/${c.slug}`}
              className={`group rounded-xl border ${style.border} ${style.bg} p-5 hover:shadow-md transition`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-xs text-surface-500 font-mono mb-0.5">#{c.number}</div>
                  <h2 className={`text-lg font-bold ${style.text}`}>
                    {c.english}{' '}
                    <span className="text-sm font-normal text-surface-600">({c.iast})</span>
                  </h2>
                  <div className="text-sm text-surface-700 font-medium">{c.sanskrit}</div>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${style.chip}`}>
                  {c.bijaMantra}
                </span>
              </div>
              <p className="text-sm text-surface-700 leading-snug mb-3">
                <strong>Location:</strong> {c.location}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-700">
                <span>
                  <strong className="text-surface-900">Element:</strong> {c.element}
                </span>
                <span>
                  <strong className="text-surface-900">Petals:</strong> {c.petals}
                </span>
                <span>
                  <strong className="text-surface-900">Deity:</strong> {c.presidingDeity.split(' (')[0]}
                </span>
              </div>
              <p className="text-xs text-surface-600 mt-2 italic line-clamp-2">{c.governs}</p>
            </Link>
          );
        })}
      </div>

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Awaken the Kundalini</h2>
        <p className="text-surface-700 text-sm mb-4">
          Pair daily chakra meditation with bija mantra chanting + yoga asanas.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/chants"
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Sacred mantras →
          </Link>
          <Link
            href="/yoga-sutras"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Yoga Sutras
          </Link>
        </div>
      </section>
    </main>
  );
}
