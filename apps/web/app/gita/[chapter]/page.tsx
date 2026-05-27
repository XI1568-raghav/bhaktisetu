import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GITA_CHAPTERS, chapterSlugs, getChapter } from '../../../lib/gita-chapters';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return chapterSlugs().map((chapter) => ({ chapter }));
}

export async function generateMetadata({ params }: { params: Promise<{ chapter: string }> }): Promise<Metadata> {
  const { chapter } = await params;
  const c = getChapter(chapter);
  if (!c) return { title: 'Not found' };
  return {
    title: `Bhagavad Gita Chapter ${c.number}: ${c.english} — Sanskrit, Verses & Meaning | Darshya`,
    description: `${c.english} (${c.sanskrit}) — Chapter ${c.number} of the Bhagavad Gita in ${c.verseCount} verses. ${c.theme}. Key shlokas with translation and the central teaching.`,
    alternates: { canonical: `${BASE_URL}/gita/${c.slug}` },
    openGraph: {
      title: `Gita Chapter ${c.number}: ${c.english}`,
      description: c.summary.slice(0, 160),
      url: `${BASE_URL}/gita/${c.slug}`,
      type: 'article',
    },
  };
}

export default async function GitaChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  const c = getChapter(chapter);
  if (!c) notFound();

  const prev = GITA_CHAPTERS.find((x) => x.number === c.number - 1);
  const next = GITA_CHAPTERS.find((x) => x.number === c.number + 1);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Bhagavad Gita Chapter ${c.number}: ${c.english}`,
    description: c.summary,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-27',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Bhagavad Gita', item: `${BASE_URL}/gita` },
      { '@type': 'ListItem', position: 3, name: `Ch ${c.number}: ${c.english}`, item: `${BASE_URL}/gita/${c.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/gita" className="hover:text-gray-800">Bhagavad Gita</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">Ch {c.number}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Chapter {c.number} of 18 · {c.verseCount} verses · {c.yogaType}</p>
        <h1 className="mt-2 font-serif text-3xl text-gray-900 sm:text-4xl">{c.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{c.english}</p>
        <p className="mt-1 italic text-sm text-gray-600">{c.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Theme:</span> {c.theme}</p>
        <p className="mt-1 text-sm text-gray-700"><span className="font-semibold">Speaker:</span> {c.whoSpeaks}</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Chapter summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{c.summary}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Key verses</h2>
        <div className="space-y-4">
          {c.keyVerses.map((v) => (
            <article key={v.ref} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs uppercase tracking-wider text-saffron-700">BG {v.ref}</p>
              <p className="mt-2 font-serif text-lg text-gray-900">{v.sanskrit}</p>
              <p className="mt-3 text-sm italic text-gray-700">{v.translation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Central takeaway</h2>
        <p className="mt-2 text-base italic text-emerald-900">{c.takeaway}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/gita/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← Previous</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">Ch {prev.number}: {prev.english}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/gita/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">Next →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">Ch {next.number}: {next.english}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/gita" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to all chapters</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 18 chapters index</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">Jump to chapter</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {GITA_CHAPTERS.map((cc) => (
            <Link
              key={cc.slug}
              href={`/gita/${cc.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                cc.slug === c.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {cc.number}. {cc.english}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
