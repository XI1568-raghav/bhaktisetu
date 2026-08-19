// City index — entry into /city/[slug] programmatic-SEO pages.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { CITIES } from '../../lib/cities';


export const metadata: Metadata = {
  title: 'Pujas and temples by city — Varanasi, Mumbai, Tirupati & more',
  description:
    'Book online pujas in your city. Explore famous temples in Varanasi, Mumbai, Delhi, Tirupati, Haridwar, Rishikesh, Ujjain, Ayodhya, Dwarka, Puri.',
  alternates: { canonical: 'https://darshya.online/city' },
  openGraph: {
    title: 'Pujas and temples city-by-city',
    description: 'Verified pujas, famous temples, online booking — by city.',
    url: 'https://darshya.online/city',
    type: 'website',
    images: ['/og/default.png'],
  },
};

export default function CityIndex() {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sacred cities of India',
    numberOfItems: CITIES.length,
    itemListElement: CITIES.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      url: `https://darshya.online/city/${c.slug}`,
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
        <span className="text-surface-900">Cities</span>
      </nav>

      <header className="mb-10">
        <span className="inline-block px-2.5 py-0.5 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🏛️ Tirth Nagar
        </span>
        <h1 className={`${H1.catalogue} mb-3`}>
          Sacred cities of India
        </h1>
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          From Varanasi (the oldest living city) to Tirupati (the world&apos;s richest
          temple), each sacred city carries thousands of years of devotion. Find
          famous temples, popular pujas, and online booking — city by city.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CITIES.map((c) => (
          <Link
            key={c.slug}
            href={`/city/${c.slug}`}
            className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-lg font-semibold text-surface-900">{c.name}</h2>
              <span className="text-xs text-surface-500 font-serif">{c.hindi}</span>
            </div>
            <p className="text-xs text-surface-500 mb-2">{c.state} · {c.population}</p>
            <p className="text-sm text-surface-700 leading-relaxed line-clamp-3 mb-3">
              {c.description}
            </p>
            <p className="text-xs text-saffron-700 font-semibold">
              {c.famousTemples[0]} & more →
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
