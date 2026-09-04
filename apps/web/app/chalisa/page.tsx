// Chalisa index — 40-verse devotional hymns library.
// Targets "hindu chalisa", "chalisa lyrics collection".
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { CHALISAS } from '../../lib/chalisas';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

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
        <h1 className={`${H1.marketing} mb-3`}>
          Hindu Chalisa Lyrics
        </h1>
        <p className="prose-lead text-surface-700 max-w-2xl mx-auto">
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

      {/* CI-05: this index offered no route to anything bookable at all. The
          aarti index already carried this CTA; the chalisa index did not. */}
      <section className="mt-12 rounded-2xl bg-gradient-to-br from-saffron-50 to-amber-50 border border-saffron-200 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Have a chalisa recited for you
        </h2>
        <p className="text-sm text-surface-700 mb-4">
          Darshya pandits recite Hanuman Chalisa, Sunderkand and the Ram Charit Manas path on
          your behalf, recorded as video proof.
        </p>
        <Link href="/pujas" className={buttonClass('primary', 'md')}>
          Browse all pujas <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </main>
  );
}
