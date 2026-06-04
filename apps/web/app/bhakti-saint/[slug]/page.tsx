import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BHAKTI_SAINTS, bhaktiSaintSlugs, getBhaktiSaint } from '../../../lib/bhakti-saints';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return bhaktiSaintSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getBhaktiSaint(slug);
  if (!s) return { title: 'Not found' };
  return {
    title: `${s.name} (${s.sanskrit}) — ${s.era} ${s.tradition} | Darshya`,
    description: `${s.name}, ${s.era} ${s.region}. ${s.bestKnownFor}. Deity: ${s.deity}.`,
    alternates: { canonical: `${BASE_URL}/bhakti-saint/${s.slug}` },
    openGraph: {
      title: `${s.name} — ${s.bestKnownFor}`,
      description: s.storySummary.slice(0, 180),
      url: `${BASE_URL}/bhakti-saint/${s.slug}`,
      type: 'article',
    },
  };
}

export default async function BhaktiSaintDetailPage({ params }: Props) {
  const { slug } = await params;
  const s = getBhaktiSaint(slug);
  if (!s) notFound();

  const idx = BHAKTI_SAINTS.findIndex((x) => x.slug === s.slug);
  const prev = idx > 0 ? BHAKTI_SAINTS[idx - 1] : null;
  const next = idx < BHAKTI_SAINTS.length - 1 ? BHAKTI_SAINTS[idx + 1] : null;

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: s.name,
    alternateName: [s.sanskrit, s.iast],
    birthDate: s.birthYear ?? undefined,
    deathDate: s.deathYear ?? undefined,
    birthPlace: { '@type': 'Place', name: s.birthPlace },
    description: s.bestKnownFor,
    knowsAbout: s.tradition,
  };

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${s.name} — ${s.bestKnownFor}`,
    description: s.keyTeaching,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Bhakti Saints', item: `${BASE_URL}/bhakti-saint` },
      { '@type': 'ListItem', position: 3, name: s.name, item: `${BASE_URL}/bhakti-saint/${s.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([person, article, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span>
        <Link href="/bhakti-saint" className="hover:underline">Bhakti Saints</Link> <span className="mx-1">/</span>
        <span>{s.name}</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-indigo-50 via-saffron-50 to-amber-50 p-6 ring-1 ring-indigo-200">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">{s.era}</span>
          <span className="rounded-full bg-white px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-300">{s.region}</span>
          <span className="rounded-full bg-white px-3 py-1 text-sm text-saffron-900 ring-1 ring-saffron-300">Deity: {s.deity}</span>
        </div>
        <h1 className="text-3xl font-bold text-indigo-900 sm:text-4xl">{s.name}</h1>
        <p className="mt-1 text-2xl text-saffron-900" lang="sa">{s.sanskrit}</p>
        <p className="mt-1 text-sm italic text-gray-600">{s.iast}</p>
        <p className="mt-3 text-gray-800">{s.bestKnownFor}</p>
        {(s.birthYear || s.deathYear) && (
          <p className="mt-2 text-xs text-gray-600">
            {s.birthYear ?? '?'} – {s.deathYear ?? '?'} · Born at {s.birthPlace}
          </p>
        )}
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-saffron-200 bg-saffron-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-saffron-900">Tradition</h3>
          <p className="text-sm text-gray-800">{s.tradition}</p>
        </section>
        {s.guru && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-1 text-sm font-semibold uppercase text-amber-900">Guru</h3>
            <p className="text-sm text-gray-800">{s.guru}</p>
          </section>
        )}
        <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 sm:col-span-2">
          <h3 className="mb-1 text-sm font-semibold uppercase text-indigo-900">Principal works</h3>
          <ul className="text-sm text-gray-800">
            {s.principalWorks.map((w) => <li key={w}>• {w}</li>)}
          </ul>
        </section>
      </div>

      {s.signatureVerse && (
        <section className="mb-8 rounded-lg border border-rose-200 bg-rose-50 p-5">
          <h2 className="mb-3 text-lg font-semibold text-rose-900">Signature verse</h2>
          <p className="mb-2 text-lg text-rose-900" lang="sa">{s.signatureVerse.devanagari}</p>
          <p className="mb-2 text-sm italic text-gray-700">{s.signatureVerse.iast}</p>
          <p className="mb-2 text-sm text-gray-800">{s.signatureVerse.translation}</p>
          <p className="text-xs text-gray-600">— {s.signatureVerse.reference}</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-saffron-900">Life and work</h2>
        <p className="text-gray-800 leading-relaxed">{s.storySummary}</p>
      </section>

      <section className="mb-8 rounded-lg border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Key teaching</h2>
        <p className="text-gray-800">{s.keyTeaching}</p>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-gray-700">Associated places</h3>
          <ul className="text-sm text-gray-800">
            {s.associatedPlaces.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-amber-900">Modern relevance</h3>
          <p className="text-sm text-gray-800">{s.modernRelevance}</p>
        </section>
      </div>

      <nav className="mt-10 flex justify-between gap-3 border-t border-gray-200 pt-5 text-sm">
        {prev ? (
          <Link href={`/bhakti-saint/${prev.slug}`} className="text-saffron-700 hover:underline">
            ← {prev.name}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/bhakti-saint/${next.slug}`} className="text-saffron-700 hover:underline text-right">
            {next.name} →
          </Link>
        ) : <span />}
      </nav>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Jump to any saint</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {BHAKTI_SAINTS.map((x) => (
            <Link
              key={x.slug}
              href={`/bhakti-saint/${x.slug}`}
              className={`rounded-full px-3 py-1 ring-1 ${x.slug === s.slug ? 'bg-indigo-600 text-white ring-indigo-700' : 'bg-indigo-50 text-indigo-800 ring-indigo-200 hover:bg-indigo-100'}`}
            >
              {x.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
