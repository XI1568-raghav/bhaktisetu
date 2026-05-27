// Devotional aarti index — links to per-aarti lyrics pages.
// Targets "hindu aarti lyrics", "aarti collection", "devotional songs".
import type { Metadata } from 'next';
import Link from 'next/link';
import { Music, Clock, ArrowRight } from 'lucide-react';
import { AARTIS } from '../../lib/aartis';

export const runtime = 'edge';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Hindu Aarti Lyrics — Shiv, Ganesh, Lakshmi, Durga, Hanuman, Sai',
  description: `Complete lyrics in Hindi and English transliteration for ${AARTIS.length} most-sung Hindu aartis with meaning. Sing along during daily puja, Diwali, Navaratri.`,
  alternates: { canonical: 'https://darshya.online/aarti' },
};

export default function AartiIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu Aarti Lyrics Collection',
    numberOfItems: AARTIS.length,
    itemListElement: AARTIS.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/aarti/${a.slug}`,
      name: a.name,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-surface-900 mb-3">
          Hindu Aarti Lyrics
        </h1>
        <p className="text-lg text-surface-700 max-w-2xl mx-auto">
          Sacred devotional songs sung at the conclusion of every puja. Full lyrics in Devanagari + transliteration + meaning in English.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {AARTIS.map((a) => (
          <Link
            key={a.slug}
            href={`/aarti/${a.slug}`}
            className="group block rounded-2xl border border-surface-200 bg-white p-6 hover:border-saffron-300 hover:shadow-md transition"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-saffron-100 flex items-center justify-center">
                <Music className="w-5 h-5 text-saffron-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                  {a.name}
                </h2>
                <p className="text-xs font-serif text-saffron-700 mb-1">{a.sanskrit}</p>
                <p className="text-sm text-surface-600 mb-3">{a.deity}</p>
                <div className="flex items-center gap-3 text-xs text-surface-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {a.durationMinutes} min
                  </span>
                  <span className="truncate">{a.whenSung.split(',')[0]}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-saffron-600 flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-2xl bg-gradient-to-br from-saffron-50 to-amber-50 border border-saffron-200 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Book a puja with traditional aarti
        </h2>
        <p className="text-sm text-surface-700 mb-4">
          Every Darshya puja concludes with the appropriate aarti, recorded as video proof.
        </p>
        <Link
          href="/pujas"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-saffron-600 text-white font-semibold hover:bg-saffron-700"
        >
          Browse all pujas <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </main>
  );
}
