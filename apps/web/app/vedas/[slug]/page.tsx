import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VEDAS, vedaSlugs, getVeda } from '../../../lib/vedas';
import { formatNumber } from '../../../lib/format-locale';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return vedaSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = getVeda(slug);
  if (!v) return { title: 'Not found' };
  return {
    title: `${v.name} (${v.sanskrit}) — ${v.bestKnownFor}`,
    description: `${v.name} — ${formatNumber(v.totalMantras)} mantras, ${v.shakhasExtant} extant shakhas, presiding priest ${v.associatedPriest}. ${v.summary.slice(0, 100)}`,
    alternates: { canonical: `${BASE_URL}/vedas/${v.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${v.name} — ${v.bestKnownFor}`,
      description: v.primaryFocus.slice(0, 160),
      url: `${BASE_URL}/vedas/${v.slug}`,
      type: 'article',
    },
  };
}

export default async function VedaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = getVeda(slug);
  if (!v) notFound();

  const idx = VEDAS.findIndex((x) => x.slug === v.slug);
  const prev = idx > 0 ? VEDAS[idx - 1] : undefined;
  const next = idx < VEDAS.length - 1 ? VEDAS[idx + 1] : undefined;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${v.name} — ${v.bestKnownFor}`,
    description: v.summary,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-27',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Vedas', item: `${BASE_URL}/vedas` },
      { '@type': 'ListItem', position: 3, name: v.name, item: `${BASE_URL}/vedas/${v.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/vedas" className="hover:text-gray-800">Vedas</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{v.name}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Veda #{v.number} of 4 · {v.approxDate}</p>
        <h1 className="mt-2 font-serif text-3xl text-gray-900 sm:text-4xl">{v.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{v.name}</p>
        <p className="mt-1 italic text-sm text-gray-600">{v.iast} — {v.meaning}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700 sm:grid-cols-4">
          <div><div className="text-xs uppercase text-gray-500">Mantras</div><div className="font-semibold">{formatNumber(v.totalMantras)}</div></div>
          <div><div className="text-xs uppercase text-gray-500">{v.mandalaLabel}</div><div className="font-semibold">{v.mandalaOrKandaCount}</div></div>
          <div><div className="text-xs uppercase text-gray-500">Shakhas extant</div><div className="font-semibold">{v.shakhasExtant} / {v.shakhasOriginal}</div></div>
          <div><div className="text-xs uppercase text-gray-500">Priest</div><div className="font-semibold">{v.associatedPriest}</div></div>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{v.summary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
        <h2 className="text-base font-semibold text-indigo-900">Principal deities</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {v.principalDeities.map((d) => (
            <span key={d} className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-indigo-900">{d}</span>
          ))}
        </div>
        <p className="mt-4 text-sm text-indigo-900/90"><span className="font-semibold">Role of the {v.associatedPriest}:</span> {v.associatedPriestRole}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">The four parts of the {v.name}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-4">
            <div className="text-xs uppercase font-semibold text-saffron-800">Samhita (mantras)</div>
            <p className="mt-1 text-sm text-saffron-900">{v.fourParts.samhita}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="text-xs uppercase font-semibold text-amber-800">Brahmana (ritual)</div>
            <p className="mt-1 text-sm text-amber-900">{v.fourParts.brahmana}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="text-xs uppercase font-semibold text-emerald-800">Aranyaka (forest)</div>
            <p className="mt-1 text-sm text-emerald-900">{v.fourParts.aranyaka}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="text-xs uppercase font-semibold text-indigo-800">Upanishad (jnana)</div>
            <p className="mt-1 text-sm text-indigo-900">{v.fourParts.upanishad}</p>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
        <h2 className="text-base font-semibold text-rose-900">Famous hymns + mantras</h2>
        <ul className="mt-3 space-y-3">
          {v.famousHymns.map((h) => (
            <li key={h.name} className="rounded-xl bg-white p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-rose-900">{h.name}</span>
                <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-mono text-rose-800">{h.reference}</span>
              </div>
              <p className="mt-1 text-xs text-gray-700">{h.significance}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Oral preservation</h2>
        <p className="mt-2 text-sm text-emerald-900">{v.oralPreservation}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-800">Modern relevance</h2>
        <p className="mt-2 text-sm text-amber-900">{v.modernRelevance}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/vedas/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← #{prev.number}</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.name}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/vedas/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">#{next.number} →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.name}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/vedas" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to index</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 4 Vedas</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">All 4 Vedas</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {VEDAS.map((vv) => (
            <Link
              key={vv.slug}
              href={`/vedas/${vv.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                vv.slug === v.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {vv.number}. {vv.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
