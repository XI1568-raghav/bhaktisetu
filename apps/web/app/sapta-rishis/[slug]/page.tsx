import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SAPTA_RISHIS, rishiSlugs, getRishi } from '../../../lib/sapta-rishis';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return rishiSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getRishi(slug);
  if (!r) return { title: 'Not found' };
  return {
    title: `${r.name} (${r.sanskrit}) — Sapta Rishi #${r.number}`,
    description: `${r.name}, one of the seven great rishis. ${r.bestKnownFor}. Star: ${r.associatedStar}. Gotra: ${r.gotra}.`,
    alternates: { canonical: `${BASE_URL}/sapta-rishis/${r.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${r.name} — ${r.bestKnownFor}`,
      description: r.storySummary.slice(0, 180),
      url: `${BASE_URL}/sapta-rishis/${r.slug}`,
      type: 'article',
    },
  };
}

export default async function RishiDetailPage({ params }: Props) {
  const { slug } = await params;
  const r = getRishi(slug);
  if (!r) notFound();

  const idx = SAPTA_RISHIS.findIndex((x) => x.slug === r.slug);
  const prev = idx > 0 ? SAPTA_RISHIS[idx - 1] : null;
  const next = idx < SAPTA_RISHIS.length - 1 ? SAPTA_RISHIS[idx + 1] : null;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${r.name} — Sapta Rishi #${r.number}`,
    description: r.bestKnownFor,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Sapta Rishis', item: `${BASE_URL}/sapta-rishis` },
      { '@type': 'ListItem', position: 3, name: r.name, item: `${BASE_URL}/sapta-rishis/${r.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([article, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span>
        <Link href="/sapta-rishis" className="hover:underline">Sapta Rishis</Link> <span className="mx-1">/</span>
        <span>{r.name}</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-indigo-50 via-saffron-50 to-amber-50 p-6 ring-1 ring-indigo-200">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">#{r.number} of 7</span>
          <span className="rounded-full bg-white px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-300">{r.associatedStar}</span>
          <span className="rounded-full bg-white px-3 py-1 text-sm text-saffron-900 ring-1 ring-saffron-300">Gotra: {r.gotra}</span>
        </div>
        <h1 className="text-3xl font-bold text-indigo-900 sm:text-4xl">{r.name}</h1>
        <p className="mt-1 text-2xl text-saffron-900" lang="sa">{r.sanskrit}</p>
        <p className="mt-1 text-sm italic text-gray-600">{r.iast}</p>
        <p className="mt-3 text-gray-800">{r.bestKnownFor}</p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-saffron-200 bg-saffron-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-saffron-900">Consort</h3>
          <p className="text-sm text-gray-800">{r.consort}</p>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-amber-900">Presiding deity</h3>
          <p className="text-sm text-gray-800">{r.presidingDeity}</p>
        </section>
        <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 sm:col-span-2">
          <h3 className="mb-1 text-sm font-semibold uppercase text-indigo-900">Principal sons</h3>
          <ul className="text-sm text-gray-800">
            {r.principalSons.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </section>
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
          <h3 className="mb-1 text-sm font-semibold uppercase text-emerald-900">Veda contribution</h3>
          <p className="text-sm text-gray-800">{r.vedaContribution}</p>
          {r.rishiOfMandala ? <p className="mt-1 text-xs text-emerald-800">{r.rishiOfMandala}{r.hymnsCount ? ` — ${r.hymnsCount}` : ''}</p> : null}
        </section>
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 sm:col-span-2">
          <h3 className="mb-1 text-sm font-semibold uppercase text-rose-900">Associated tirthas</h3>
          <ul className="text-sm text-gray-800">
            {r.associatedTirthas.map((t) => <li key={t}>• {t}</li>)}
          </ul>
        </section>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-saffron-900">Story</h2>
        <p className="text-gray-800 leading-relaxed">{r.storySummary}</p>
      </section>

      <section className="mb-8 rounded-lg border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Key teaching</h2>
        <p className="text-gray-800">{r.keyTeaching}</p>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-gray-700">Principal scriptures</h3>
          <ul className="text-sm text-gray-800">
            {r.principalScriptures.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-amber-900">Modern relevance</h3>
          <p className="text-sm text-gray-800">{r.modernRelevance}</p>
        </section>
      </div>

      <nav className="mt-10 flex justify-between gap-3 border-t border-gray-200 pt-5 text-sm">
        {prev ? (
          <Link href={`/sapta-rishis/${prev.slug}`} className="text-saffron-700 hover:underline">
            ← #{prev.number} {prev.name}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/sapta-rishis/${next.slug}`} className="text-saffron-700 hover:underline text-right">
            #{next.number} {next.name} →
          </Link>
        ) : <span />}
      </nav>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Jump to any rishi</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {SAPTA_RISHIS.map((x) => (
            <Link
              key={x.slug}
              href={`/sapta-rishis/${x.slug}`}
              className={`rounded-full px-3 py-1 ring-1 ${x.slug === r.slug ? 'bg-indigo-600 text-white ring-indigo-700' : 'bg-indigo-50 text-indigo-800 ring-indigo-200 hover:bg-indigo-100'}`}
            >
              #{x.number} {x.name}
            </Link>
          ))}
        </div>
      </section>
      {detailCta({
        routePrefix: 'sapta-rishis',
        subject: r.name,
      })}
    </main>
  );
}
