import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CHANTS, chantSlugs, getChant } from '../../../lib/chants';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return chantSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getChant(slug);
  if (!c) return { title: 'Chant not found' };

  return {
    title: `${c.name} — Lyrics, Meaning, Benefits, How to Chant | Darshya`,
    description: `${c.name}: ${c.meaning.slice(0, 130)}. Benefits: ${c.benefits.slice(0, 100)}. Source: ${c.source}.`,
    alternates: { canonical: `${BASE_URL}/chants/${c.slug}` },
    openGraph: {
      title: `${c.name} — Sanskrit Mantra Guide`,
      description: c.benefits.slice(0, 200),
      url: `${BASE_URL}/chants/${c.slug}`,
      type: 'article',
      images: ['/og/default'],
    },
  };
}

function jsonLd(c: NonNullable<ReturnType<typeof getChant>>) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Chants', item: `${BASE_URL}/chants` },
        { '@type': 'ListItem', position: 3, name: c.name, item: `${BASE_URL}/chants/${c.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${c.name} — Sanskrit Mantra Guide`,
      description: c.benefits,
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-05-27',
      mainEntityOfPage: `${BASE_URL}/chants/${c.slug}`,
    },
  ];
}

const catBadge: Record<string, string> = {
  protection: 'bg-blue-100 text-blue-800',
  wisdom: 'bg-amber-100 text-amber-800',
  wealth: 'bg-yellow-100 text-yellow-800',
  peace: 'bg-emerald-100 text-emerald-800',
  devotional: 'bg-pink-100 text-pink-800',
  invocation: 'bg-saffron-100 text-saffron-800',
};

export default async function ChantDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getChant(slug);
  if (!c) notFound();

  const idx = CHANTS.findIndex((x) => x.slug === c.slug);
  const prev = idx > 0 ? CHANTS[idx - 1] : null;
  const next = idx < CHANTS.length - 1 ? CHANTS[idx + 1] : null;
  const related = CHANTS.filter((x) => x.slug !== c.slug && x.category === c.category).slice(0, 3);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c)) }}
      />

      <nav className="text-xs text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/chants" className="hover:text-saffron-700">Chants</Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900">{c.name}</span>
      </nav>

      <header className="mb-8">
        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mb-3 ${catBadge[c.category]}`}>
          {c.category.charAt(0).toUpperCase() + c.category.slice(1)}
        </span>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-2 leading-tight">
          {c.name}
          <span className="text-surface-500 text-xl sm:text-2xl font-normal ml-3">
            {c.sanskritName}
          </span>
        </h1>
        <p className="text-surface-700 text-base sm:text-lg italic">
          Devoted to {c.deity}
        </p>
        <p className="text-surface-500 text-sm mt-1">Source: {c.source}</p>
      </header>

      <section className="mb-8 rounded-xl border-2 border-saffron-300 bg-saffron-50 p-6">
        <div className="text-xs uppercase tracking-wider text-saffron-700 font-bold mb-3">Sanskrit (Devanagari)</div>
        <div className="font-serif text-xl sm:text-2xl text-surface-900 leading-loose whitespace-pre-line text-center">
          {c.sanskrit}
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Transliteration</h2>
        <p className="font-mono text-sm sm:text-base text-surface-800 leading-relaxed">{c.transliteration}</p>
      </section>

      <section className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Meaning (English)</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.meaning}</p>
      </section>

      <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Benefits (Phal)</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.benefits}</p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Recommended count</div>
          <div className="font-bold text-surface-900">{c.recommendedCount}x daily</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Difficulty</div>
          <div className="font-bold text-surface-900 capitalize">{c.difficulty}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Category</div>
          <div className="font-bold text-surface-900 capitalize">{c.category}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">When to Chant</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.whenToChant}</p>
      </section>

      <section className="mb-10 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">How to Chant</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.howToChant}</p>
      </section>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Book a pandit for {c.name} jaap
        </h2>
        <p className="text-surface-700 text-sm mb-4">
          Major sankalp (1.25 lakh count or more) traditionally requires a trained pandit. Verified
          pandits perform on your behalf with full video proof + sankalpa with your gotra/nakshatra.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/ask-pandit"
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Ask a pandit →
          </Link>
          <Link
            href="/chants"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            All chants
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mb-6 pt-6 border-t border-surface-200">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Related chants</h3>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/chants/${r.slug}`}
                className="px-3 py-1.5 text-sm bg-white border border-surface-200 text-saffron-700 rounded-md hover:border-saffron-400"
              >
                {r.name} →
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-surface-200">
        {prev ? (
          <Link
            href={`/chants/${prev.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/chants" className="text-sm text-surface-600 hover:text-saffron-700">
          All chants
        </Link>
        {next ? (
          <Link
            href={`/chants/${next.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            {next.name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
