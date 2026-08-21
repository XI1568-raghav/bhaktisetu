import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PURANAS, puranaSlugs, getPurana } from '../../../lib/puranas';
import { formatNumber } from '../../../lib/format-locale';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return puranaSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPurana(slug);
  if (!p) return { title: 'Not found' };
  return {
    title: `${p.name} (${p.sanskrit}) — Summary, Verse Count, Notable Stories`,
    description: `${p.name} — ${formatNumber(p.verseCount)} verses, presiding deity ${p.presidingDeity}. ${p.centralTheme}. ${p.summary.slice(0, 100)}`,
    alternates: { canonical: `${BASE_URL}/puranas/${p.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${p.name} — ${p.bestKnownFor}`,
      description: p.summary.slice(0, 160),
      url: `${BASE_URL}/puranas/${p.slug}`,
      type: 'article',
    },
  };
}

export default async function PuranaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPurana(slug);
  if (!p) notFound();

  const idx = PURANAS.findIndex((x) => x.slug === p.slug);
  const prev = idx > 0 ? PURANAS[idx - 1] : undefined;
  const next = idx < PURANAS.length - 1 ? PURANAS[idx + 1] : undefined;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${p.name} — ${p.bestKnownFor}`,
    description: p.summary,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-27',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Puranas', item: `${BASE_URL}/puranas` },
      { '@type': 'ListItem', position: 3, name: p.name, item: `${BASE_URL}/puranas/${p.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/puranas" className="hover:text-gray-800">Puranas</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{p.name}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Mahapurana #{p.number} of 18 · {p.alignment} · {p.presidingDeity}</p>
        <h1 className={`${H1.catalogue} mt-2`}>{p.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{p.name}</p>
        <p className="mt-1 italic text-sm text-gray-600">{p.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Verses:</span> {formatNumber(p.verseCount)} · <span className="font-semibold">Best known for:</span> {p.bestKnownFor}</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Central theme</h2>
        <p className="text-base leading-relaxed text-gray-700">{p.centralTheme}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{p.summary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
        <h2 className="text-base font-semibold text-indigo-900">Notable stories + sections</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-indigo-900/90">
          {p.notableStories.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="text-indigo-500">●</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Why read it</h2>
        <p className="mt-2 text-base italic text-emerald-900">{p.whyRead}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/puranas/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← #{prev.number}</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.name}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/puranas/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">#{next.number} →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.name}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/puranas" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to index</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 18 Mahapuranas</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">All 18 Mahapuranas</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {PURANAS.map((pp) => (
            <Link
              key={pp.slug}
              href={`/puranas/${pp.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                pp.slug === p.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {pp.number}. {pp.name.replace(' Purana', '')}
            </Link>
          ))}
        </div>
      </section>
      {detailCta({
        routePrefix: 'puranas',
        subject: p.name,
      })}
    </main>
  );
}
