import type { Metadata } from 'next';
import Link from 'next/link';
import { GITA_CHAPTERS, TOTAL_VERSES } from '../../lib/gita-chapters';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Bhagavad Gita — All 18 Chapters with Sanskrit, Meaning & Key Verses | Darshya',
  description: `Complete chapter-by-chapter guide to the Bhagavad Gita: all 18 chapters, ${TOTAL_VERSES} verses, themes, key shlokas, and the yoga path each chapter teaches. Krishna's teaching to Arjuna at Kurukshetra.`,
  alternates: { canonical: `${BASE_URL}/gita` },
  openGraph: {
    title: 'Bhagavad Gita — 18 chapters complete guide',
    description: `Sanskrit, transliteration, key verses, and teaching of each of the Gita's 18 chapters across ${TOTAL_VERSES} verses.`,
    url: `${BASE_URL}/gita`,
    type: 'website',
  },
};

const SECTIONS = [
  { title: 'Karma Khanda (chapters 1-6) — Path of Action', range: [1, 6], color: 'saffron' },
  { title: 'Bhakti Khanda (chapters 7-12) — Path of Devotion', range: [7, 12], color: 'rose' },
  { title: 'Jnana Khanda (chapters 13-18) — Path of Knowledge', range: [13, 18], color: 'indigo' },
] as const;

export default function GitaIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Bhagavad Gita Chapters',
    numberOfItems: GITA_CHAPTERS.length,
    itemListElement: GITA_CHAPTERS.map((c) => ({
      '@type': 'ListItem',
      position: c.number,
      item: {
        '@type': 'Chapter',
        name: `Chapter ${c.number}: ${c.english}`,
        url: `${BASE_URL}/gita/${c.slug}`,
        position: c.number,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Bhagavad Gita', item: `${BASE_URL}/gita` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-indigo-600">18 chapters · {TOTAL_VERSES} verses · Krishna&apos;s teaching to Arjuna</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">श्रीमद्भगवद्गीता</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The Bhagavad Gita — All 18 Chapters</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          Spoken on the battlefield of Kurukshetra by Lord Krishna to the warrior Arjuna,
          the Gita is a complete spiritual manual: how to act, how to love, how to know.
          Each chapter teaches a distinct yoga — a way to liberation.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
        <h2 className="text-base font-semibold text-amber-900">How to use this guide</h2>
        <p className="mt-2 text-sm text-amber-900/80">
          Click any chapter for its theme, Sanskrit name, key verses with translation,
          and a single takeaway. Read sequentially or jump to the chapter that meets you
          where you are. Chapters 2, 9, 11, 12 and 18 are the most-cited.
        </p>
      </section>

      {SECTIONS.map((sec) => {
        const items = GITA_CHAPTERS.filter((c) => c.number >= sec.range[0] && c.number <= sec.range[1]);
        return (
          <section key={sec.title} className="mb-10">
            <h2 className={`mb-4 border-b border-${sec.color}-200 pb-2 text-xl font-bold text-${sec.color}-900`}>{sec.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((c) => (
                <Link
                  key={c.slug}
                  href={`/gita/${c.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-900">{c.number}</span>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700">{c.english}</h3>
                    </div>
                    <span className="text-xs text-gray-500">{c.verseCount} verses</span>
                  </div>
                  <p className="mt-1 font-serif text-sm text-gray-700">{c.sanskrit}</p>
                  <p className="mt-2 text-xs text-gray-600">{c.theme}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/chants/gita-jayanti" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Gita Jayanti Mantras</div>
            <div className="text-xs text-indigo-700">Verses recited on Gita&apos;s birth day</div>
          </Link>
          <Link href="/shlokas" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">All Shlokas</div>
            <div className="text-xs text-indigo-700">Sanskrit verses from many sources</div>
          </Link>
          <Link href="/deity/krishna" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">About Krishna</div>
            <div className="text-xs text-rose-700">The speaker of the Gita</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
