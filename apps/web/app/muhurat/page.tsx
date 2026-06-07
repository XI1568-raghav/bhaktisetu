import type { Metadata } from 'next';
import Link from 'next/link';
import { MUHURATS, muhuratsByCategory } from '../../lib/muhurats';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Muhurat Guide — Rahu Kalam, Abhijit, Brahma Muhurta, Vivah Dates | Darshya',
  description:
    'Complete guide to Vedic muhurats — Brahma Muhurta, Abhijit, Rahu Kalam, Yamaganda, Pradosh, Amrit Kaal, Vivah, Griha Pravesh, Mundan. Auspicious & inauspicious time windows.',
  alternates: { canonical: `${BASE_URL}/muhurat` },
  openGraph: {
    title: 'Vedic Muhurat Guide — Auspicious Time Windows',
    description: 'Daily and planning muhurats with timing, significance, modern application.',
    url: `${BASE_URL}/muhurat`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Vedic Muhurats',
    numberOfItems: MUHURATS.length,
    itemListElement: MUHURATS.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/muhurat/${m.slug}`,
      name: m.name,
    })),
  };
}

const sections = [
  { key: 'daily' as const, title: 'Daily Auspicious Windows', desc: 'Recurring sacred windows every day — use for sadhana and important actions.' },
  { key: 'inauspicious' as const, title: 'Daily Inauspicious Windows', desc: 'Daily windows ruled by malefic energies — avoid starting new ventures.' },
  { key: 'planning' as const, title: 'Life-Event Muhurats', desc: 'For major life decisions — wedding, home, child samskara dates.' },
];

const catColor: Record<string, string> = {
  daily: 'border-emerald-300 bg-emerald-50',
  inauspicious: 'border-rose-300 bg-rose-50',
  planning: 'border-saffron-300 bg-saffron-50',
};

export default function MuhuratIndex() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd()) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          Vedic Time Science · Kala Vidya
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-3 leading-tight">
          Muhurat Guide
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          The Vedic science of choosing the right time. From daily Brahma Muhurta and Rahu Kalam to
          wedding and griha-pravesh dates — auspicious windows govern how energy flows. Time is the
          fifth essential resource in Vedic culture (along with people, place, intention, ritual).
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-saffron-200 bg-saffron-50 p-5 text-center">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Need today&apos;s muhurat?</h2>
        <p className="text-surface-700 text-sm mb-3">
          Live panchang with today&apos;s Brahma Muhurta, Abhijit, Rahu Kalam in your local time.
        </p>
        <Link
          href="/today"
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          Today&apos;s panchang →
        </Link>
      </section>

      {sections.map((sec) => {
        const items = muhuratsByCategory(sec.key);
        if (items.length === 0) return null;
        return (
          <section key={sec.key} className="mb-10">
            <h2 className="text-2xl font-bold text-surface-900 mb-1">{sec.title}</h2>
            <p className="text-sm text-surface-600 mb-4">{sec.desc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((m) => (
                <Link
                  key={m.slug}
                  href={`/muhurat/${m.slug}`}
                  className={`group rounded-xl border p-5 hover:shadow-md transition ${catColor[m.category]}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                        {m.name}
                      </h3>
                      <div className="text-sm text-surface-600">{m.sanskritName}</div>
                    </div>
                  </div>
                  <p className="text-sm text-surface-700 leading-snug mb-3">{m.shortDesc}</p>
                  <div className="text-xs text-surface-600">
                    <strong className="text-surface-800">Duration:</strong> {m.duration}
                    <span className="mx-2">·</span>
                    <strong className="text-surface-800">Ruled by:</strong> {m.ruledBy}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Personal muhurat consultation</h2>
        <p className="text-surface-700 text-sm mb-4">
          Need a wedding date, griha pravesh, mundan, or business launch muhurat matched to your
          chart? Our pandits provide hand-calculated muhurat reports.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/ask-pandit"
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Ask a pandit →
          </Link>
          <Link
            href="/astrology"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Free birth chart
          </Link>
        </div>
      </section>
    </main>
  );
}
