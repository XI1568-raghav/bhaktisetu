import type { Metadata } from 'next';
import Link from 'next/link';
import { SHLOKAS } from '../../lib/shlokas';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
  title: 'Sanskrit Shlokas — Sacred Verses with Meaning',
  description:
    'Curated collection of sacred Sanskrit shlokas from the Bhagavad Gita, Vedas, Upanishads and traditional invocations — with transliteration, English meaning and shareable cards.',
  alternates: { canonical: 'https://darshya.online/shlokas' },
  openGraph: {
    title: 'Sanskrit Shlokas — Sacred Verses with Meaning',
    description:
      'Bhagavad Gita, Vedas, Upanishads — devanagari shlokas with transliteration, meaning and one-tap share.',
    url: 'https://darshya.online/shlokas',
    type: 'website',
    images: ['/og/default.png'],
  },
};

export default function ShlokasIndexPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-10">
        <h1 className={`${H1.catalogue} mb-3`}>
          Sanskrit Shlokas
        </h1>
        <p className="text-surface-700 text-base leading-relaxed mb-4">
          A curated selection of sacred Sanskrit verses from the Bhagavad Gita,
          Vedas, Upanishads and traditional invocations. Each verse includes
          devanagari, transliteration, English meaning and a shareable image
          card.
        </p>
        <Link
          href="/shloka-card"
          className={buttonClass('primary', 'md')}
        >
          ✨ Make your own shareable card →
        </Link>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SHLOKAS.map((s) => (
          <li
            key={s.slug}
            className="border border-surface-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
          >
            <Link href={`/shlokas/${s.slug}`} className="block">
              <p
                className="text-saffron-700 text-sm font-medium mb-2"
                style={{ fontFamily: 'var(--font-noto-devanagari)' }}
              >
                {s.source}
              </p>
              <p
                className="text-surface-900 text-lg leading-relaxed mb-3 whitespace-pre-line"
                style={{ fontFamily: 'var(--font-noto-devanagari)' }}
              >
                {s.text}
              </p>
              <p className="text-surface-600 text-sm line-clamp-3">{s.meaning}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs uppercase tracking-wider text-saffron-700 bg-saffron-50 px-2 py-0.5 rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
