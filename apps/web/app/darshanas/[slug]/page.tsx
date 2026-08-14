import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DARSHANAS, darshanaSlugs, getDarshana } from '../../../lib/darshanas';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return darshanaSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = getDarshana(slug);
  if (!d) return { title: 'Not found' };
  return {
    title: `${d.name} (${d.sanskrit}) — ${d.bestKnownFor}`,
    description: `${d.name} darshana, founded by ${d.founder}. Root text ${d.foundingText} (${d.approxDate}). ${d.centralThesis.slice(0, 100)}`,
    alternates: { canonical: `${BASE_URL}/darshanas/${d.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${d.name} — ${d.bestKnownFor}`,
      description: d.centralThesis.slice(0, 160),
      url: `${BASE_URL}/darshanas/${d.slug}`,
      type: 'article',
    },
  };
}

export default async function DarshanaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDarshana(slug);
  if (!d) notFound();

  const idx = DARSHANAS.findIndex((x) => x.slug === d.slug);
  const prev = idx > 0 ? DARSHANAS[idx - 1] : undefined;
  const next = idx < DARSHANAS.length - 1 ? DARSHANAS[idx + 1] : undefined;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${d.name} — ${d.bestKnownFor}`,
    description: d.summary,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-27',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Darshanas', item: `${BASE_URL}/darshanas` },
      { '@type': 'ListItem', position: 3, name: d.name, item: `${BASE_URL}/darshanas/${d.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/darshanas" className="hover:text-gray-800">Darshanas</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{d.name}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Darshana #{d.number} of 6 · {d.approxDate}</p>
        <h1 className="mt-2 font-serif text-3xl text-gray-900 sm:text-4xl">{d.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{d.name} Darshana</p>
        <p className="mt-1 italic text-sm text-gray-600">{d.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Founder:</span> {d.founder}</p>
        <p className="mt-1 text-sm text-gray-700"><span className="font-semibold">Root text:</span> {d.foundingText} ({d.foundingTextSanskrit})</p>
      </header>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-800">Central thesis</h2>
        <p className="mt-2 text-base italic text-indigo-900">{d.centralThesis}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{d.summary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-base font-semibold text-emerald-900">Key concepts</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-emerald-900/90">
          {d.keyConcepts.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-emerald-500">●</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-saffron-800">Accepted pramanas</h2>
          <p className="mt-1 text-xs text-saffron-700">Means of valid knowledge</p>
          <ul className="mt-3 space-y-1 text-sm text-saffron-900">
            {d.pramanas.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-800">Liberation path</h2>
          <p className="mt-2 text-sm text-rose-900">{d.liberationPath}</p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">Key texts</h2>
        <ul className="mt-3 space-y-1 text-sm text-gray-700">
          {d.keyTexts.map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-800">Modern relevance</h2>
        <p className="mt-2 text-base text-amber-900">{d.modernRelevance}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/darshanas/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← #{prev.number}</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.name}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/darshanas/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">#{next.number} →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.name}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/darshanas" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to index</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 6 Darshanas</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">All 6 darshanas</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {DARSHANAS.map((dd) => (
            <Link
              key={dd.slug}
              href={`/darshanas/${dd.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                dd.slug === d.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {dd.number}. {dd.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
