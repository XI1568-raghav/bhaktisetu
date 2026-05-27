// Chalisa index — 40-verse devotional hymns library.
// Targets "hindu chalisa", "chalisa lyrics collection".
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { CHALISAS } from '../../lib/chalisas';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Hindu Chalisa Lyrics — Hanuman, Ganesh, Shiv, Durga, Sai',
  description: `Read full lyrics and meaning of ${CHALISAS.length} most-recited Hindu chalisas. Devanagari + English transliteration + word-for-word meaning + benefits.`,
  alternates: { canonical: 'https://darshya.online/chalisa' },
};

export default function ChalisaIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu Chalisa Collection',
    numberOfItems: CHALISAS.length,
    itemListElement: CHALISAS.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/chalisa/${c.slug}`,
      name: c.name,
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
          Hindu Chalisa Lyrics
        </h1>
        <p className="text-lg text-surface-700 max-w-2xl mx-auto">
          40-verse devotional hymns to the principal deities. Each chalisa with significance, benefits, opening verses, and meaning.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {CHALISAS.map((c) => (
          <Link
            key={c.slug}
            href={`/chalisa/${c.slug}`}
            className="group block rounded-2xl border border-surface-200 bg-white p-6 hover:border-saffron-300 hover:shadow-md transition"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                  {c.name}
                </h2>
                <p className="text-xs font-serif text-saffron-700 mb-1">{c.sanskrit}</p>
                <p className="text-sm text-surface-600 mb-2 line-clamp-2">{c.significance.split('.')[0]}.</p>
                <div className="flex items-center gap-3 text-xs text-surface-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {c.durationMinutes} min
                  </span>
                  <span>By {c.composer}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-saffron-600 flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
