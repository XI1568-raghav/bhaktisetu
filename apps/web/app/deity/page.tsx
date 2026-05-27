// Deity index — entry into /deity/[slug] programmatic-SEO pages.
import type { Metadata } from 'next';
import Link from 'next/link';
import { DEITIES } from '../../lib/deities';


export const metadata: Metadata = {
  title: 'Hindu deities — pujas, mantras, temples by deity',
  description:
    'Explore Hindu deities — Shiva, Vishnu, Ganesha, Devi, Hanuman, Krishna, Rama, Lakshmi, Saraswati. Verified pujas, sacred mantras, festival calendar.',
  alternates: { canonical: 'https://darshya.online/deity' },
  openGraph: {
    title: 'Hindu deities on Darshya',
    description: 'Pujas, mantras, festivals — deity by deity.',
    url: 'https://darshya.online/deity',
    type: 'website',
    images: ['/og/default'],
  },
};

export default function DeityIndex() {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu deities',
    numberOfItems: DEITIES.length,
    itemListElement: DEITIES.map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: d.name,
      url: `https://darshya.online/deity/${d.slug}`,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Deities</span>
      </nav>

      <header className="mb-10">
        <span className="inline-block px-2.5 py-0.5 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🕉️ Devata
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-3">
          Hindu deities
        </h1>
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          Each deity in the Sanatan tradition embodies a divine principle. Pick a
          deity to explore the pujas, mantras, festivals and online booking
          options associated with that worship.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEITIES.map((d) => (
          <Link
            key={d.slug}
            href={`/deity/${d.slug}`}
            className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-lg font-semibold text-surface-900">{d.name}</h2>
              <span className="text-xs text-surface-500 font-serif">{d.sanskrit}</span>
            </div>
            <p className="text-sm text-surface-700 leading-relaxed line-clamp-3 mb-3">
              {d.description}
            </p>
            <p className="text-xs text-saffron-700 font-semibold">
              {d.festival} → Explore pujas
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
