import type { Metadata } from 'next';
import Link from 'next/link';
import { PURANAS, TOTAL_VERSES, ALIGNMENT_LABELS, type PuranaAlignment } from '../../lib/puranas';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'The 18 Mahapuranas, Complete List, Summaries, Presiding Deities | Darshya',
  description: 'All 18 Mahapuranas of Sanatana Dharma, Bhagavata, Vishnu, Shiva, Skanda, Markandeya (Devi Mahatmya), Garuda, Brahma, Padma, Agni and 9 more. Sanskrit, verse counts, central themes.',
  alternates: { canonical: `${BASE_URL}/puranas` },
  openGraph: {
    title: 'The 18 Mahapuranas',
    description: '~400,000 verses across 18 Mahapuranas, the smriti foundation of every living Hindu temple tradition.',
    url: `${BASE_URL}/puranas`,
    type: 'website',
  },
};

const ALIGNMENT_ORDER: PuranaAlignment[] = ['sattvic', 'rajasic', 'tamasic'];
const ALIGNMENT_COLORS: Record<PuranaAlignment, string> = {
  sattvic: 'emerald',
  rajasic: 'saffron',
  tamasic: 'indigo',
};

export default function PuranasIndexPage() {
  const byAlignment = ALIGNMENT_ORDER.reduce<Record<PuranaAlignment, typeof PURANAS>>((acc, a) => {
    acc[a] = PURANAS.filter((p) => p.alignment === a);
    return acc;
  }, { sattvic: [], rajasic: [], tamasic: [] });

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The 18 Mahapuranas',
    numberOfItems: PURANAS.length,
    itemListElement: PURANAS.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Book',
        name: p.name,
        url: `${BASE_URL}/puranas/${p.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Puranas', item: `${BASE_URL}/puranas` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-indigo-600">18 mahapuranas · ~{(TOTAL_VERSES / 1000).toFixed(0)}k verses · Smriti encyclopedia</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">अष्टादश महापुराण</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The 18 Mahapuranas</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          The Mahapuranas are the 18 major books of smriti, the encyclopedia of Hindu
          cosmology, mythology, dharma, geography of pilgrimage, ritual, and devotion.
          Each is traditionally compiled by Vyasa. Together they hold approximately
          400,000 verses across the five canonical lakshanas: sarga (creation),
          pratisarga (dissolution + recreation), vamsa (lineages), manvantara (epochs),
          and vamsanucharita (the deeds of dynasties).
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">The three-guna classification (Padma Purana)</h2>
        <p className="mt-2 text-sm text-gray-700">Traditional Vaishnava tradition divides the 18 Mahapuranas by their predominant guna, 6 sattvic (Vaishnava), 6 rajasic (Brahma), 6 tamasic (Shaiva).</p>
      </section>

      {ALIGNMENT_ORDER.map((align) => {
        const items = byAlignment[align];
        if (items.length === 0) return null;
        const color = ALIGNMENT_COLORS[align];
        return (
          <section key={align} className="mb-10">
            <h2 className={`mb-4 border-b border-${color}-200 pb-2 text-xl font-bold text-${color}-900`}>{ALIGNMENT_LABELS[align]}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((p) => (
                <Link
                  key={p.slug}
                  href={`/puranas/${p.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-gray-500">#{p.number}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{p.verseCount.toLocaleString()} verses</span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-gray-900 group-hover:text-indigo-700">{p.name}</h3>
                  <p className="mt-0.5 font-serif text-sm text-gray-700">{p.sanskrit}</p>
                  <p className="mt-1 text-xs text-gray-500">Presiding: {p.presidingDeity}</p>
                  <p className="mt-2 text-xs text-gray-700 line-clamp-2">{p.centralTheme}</p>
                  <p className="mt-2 rounded bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-900">{p.bestKnownFor}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/upanishads" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">10 Upanishads</div>
            <div className="text-xs text-indigo-700">Shruti, philosophical root</div>
          </Link>
          <Link href="/ramayana" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Ramayana</div>
            <div className="text-xs text-indigo-700">Itihasa, companion smriti epic</div>
          </Link>
          <Link href="/tirth" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">12 Sacred Tirthas</div>
            <div className="text-xs text-rose-700">Pilgrim guide rooted in puranic mahatmyas</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
