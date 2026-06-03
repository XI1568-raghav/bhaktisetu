import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  VEDIC_YAJNAS,
  getVedicYajna,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  type YajnaModernStatus,
} from '../../../lib/vedic-yajnas';

export const runtime = 'edge';
export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const y = getVedicYajna(slug);
  if (!y) return { title: 'Not found' };
  return {
    title: `${y.name} (${y.sanskrit}) — Vedic Yajna | Darshya`,
    description: `${y.name}: ${CATEGORY_LABELS[y.category]}. ${y.purpose.slice(0, 160)}`,
    alternates: { canonical: `${BASE_URL}/vedic-yajnas/${y.slug}` },
    openGraph: {
      title: `${y.name} — ${CATEGORY_LABELS[y.category]}`,
      description: y.purpose.slice(0, 180),
      url: `${BASE_URL}/vedic-yajnas/${y.slug}`,
      type: 'article',
    },
  };
}

const STATUS_LABEL: Record<YajnaModernStatus, string> = {
  'actively-performed': 'Actively performed in living tradition',
  rare: 'Rare in living tradition',
  extinct: 'Not performed in any living tradition today',
  reconstructed: 'Reconstructed / revived in modern times',
};

const STATUS_COLOR: Record<YajnaModernStatus, string> = {
  'actively-performed': 'border-emerald-300 bg-emerald-50 text-emerald-900',
  rare: 'border-amber-300 bg-amber-50 text-amber-900',
  extinct: 'border-gray-300 bg-gray-100 text-gray-800',
  reconstructed: 'border-indigo-300 bg-indigo-50 text-indigo-900',
};

export default async function VedicYajnaDetailPage({ params }: Props) {
  const { slug } = await params;
  const y = getVedicYajna(slug);
  if (!y) notFound();

  const idx = VEDIC_YAJNAS.findIndex((x) => x.slug === y.slug);
  const prev = idx > 0 ? VEDIC_YAJNAS[idx - 1] : null;
  const next = idx < VEDIC_YAJNAS.length - 1 ? VEDIC_YAJNAS[idx + 1] : null;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${y.name} — Vedic Yajna`,
    description: y.purpose.slice(0, 220),
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Vedic Yajnas', item: `${BASE_URL}/vedic-yajnas` },
      { '@type': 'ListItem', position: 3, name: y.name, item: `${BASE_URL}/vedic-yajnas/${y.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([article, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span>
        <Link href="/vedic-yajnas" className="hover:underline">Vedic Yajnas</Link> <span className="mx-1">/</span>
        <span>{y.name}</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-saffron-50 via-amber-50 to-rose-50 p-6 ring-1 ring-saffron-200">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className="rounded-full bg-saffron-600 px-3 py-1 text-sm font-semibold text-white">
            {CATEGORY_LABELS[y.category]}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-saffron-900 sm:text-4xl">{y.name}</h1>
        <p className="mt-1 text-2xl text-amber-900" lang="sa">{y.sanskrit}</p>
        <p className="mt-3 max-w-3xl text-sm text-gray-700">{CATEGORY_DESCRIPTIONS[y.category]}</p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Category</h3>
          <p className="text-sm text-gray-900">{CATEGORY_LABELS[y.category]}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Duration</h3>
          <p className="text-sm text-gray-900">{y.durationDays}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Priests required</h3>
          <p className="text-sm text-gray-900">
            {y.priestsRequired} ritvik{y.priestsRequired === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Purpose</h2>
        <p className="text-gray-800 leading-relaxed">{y.purpose}</p>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-saffron-200 bg-saffron-50 p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase text-saffron-900">Deities invoked</h3>
          <ul className="text-sm text-gray-800">
            {y.deities.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase text-amber-900">Mantra source</h3>
          <p className="text-sm text-gray-800">{y.mantraSource}</p>
        </section>
      </div>

      <section className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Material offerings</h2>
        <ul className="grid gap-1 text-sm text-gray-800 sm:grid-cols-2">
          {y.materialOfferings.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-emerald-900/80">
          Items listed are those prescribed in the Shrauta texts. This page does not provide procedural instruction.
        </p>
      </section>

      <section className={`mb-8 rounded-lg border p-5 ${STATUS_COLOR[y.modernStatus]}`}>
        <h2 className="mb-2 text-lg font-semibold">Modern status</h2>
        <p className="mb-2 text-sm font-semibold">{STATUS_LABEL[y.modernStatus]}</p>
        <p className="text-sm">{y.modernRelevance}</p>
      </section>

      <section className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Historical significance</h2>
        <p className="text-sm text-gray-800 leading-relaxed">{y.historicalSignificance}</p>
      </section>

      <nav className="mt-10 flex justify-between gap-3 border-t border-gray-200 pt-5 text-sm">
        {prev ? (
          <Link href={`/vedic-yajnas/${prev.slug}`} className="text-saffron-700 hover:underline">
            ← {prev.name}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/vedic-yajnas/${next.slug}`} className="text-saffron-700 hover:underline text-right">
            {next.name} →
          </Link>
        ) : <span />}
      </nav>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Jump to any yajna</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {VEDIC_YAJNAS.map((x) => (
            <Link
              key={x.slug}
              href={`/vedic-yajnas/${x.slug}`}
              className={`rounded-full px-3 py-1 ring-1 ${x.slug === y.slug ? 'bg-saffron-600 text-white ring-saffron-700' : 'bg-saffron-50 text-saffron-800 ring-saffron-200 hover:bg-saffron-100'}`}
            >
              {x.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
