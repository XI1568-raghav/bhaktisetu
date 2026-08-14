import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SAMSKARAS, samskaraSlugs, getSamskara, STAGE_LABELS } from '../../../lib/samskaras';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return samskaraSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSamskara(slug);
  if (!s) return { title: 'Not found' };
  return {
    title: `${s.name} (${s.sanskrit}) — Hindu Samskara #${s.number}`,
    description: `${s.name} (${s.iast}) — samskara #${s.number} of 16. ${s.timing}. ${s.purpose.slice(0, 110)}`,
    alternates: { canonical: `${BASE_URL}/samskaras/${s.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${s.name} — ${s.iast}`,
      description: s.purpose.slice(0, 160),
      url: `${BASE_URL}/samskaras/${s.slug}`,
      type: 'article',
    },
  };
}

export default async function SamskaraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getSamskara(slug);
  if (!s) notFound();

  const idx = SAMSKARAS.findIndex((x) => x.slug === s.slug);
  const prev = idx > 0 ? SAMSKARAS[idx - 1] : undefined;
  const next = idx < SAMSKARAS.length - 1 ? SAMSKARAS[idx + 1] : undefined;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${s.name} — Hindu Samskara #${s.number}`,
    description: s.purpose,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-27',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Samskaras', item: `${BASE_URL}/samskaras` },
      { '@type': 'ListItem', position: 3, name: s.name, item: `${BASE_URL}/samskaras/${s.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/samskaras" className="hover:text-gray-800">Samskaras</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{s.name}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-rose-50 p-6">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Samskara #{s.number} of 16 · {STAGE_LABELS[s.stage]}</p>
        <h1 className="mt-2 font-serif text-3xl text-gray-900 sm:text-4xl">{s.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{s.name}</p>
        <p className="mt-1 italic text-sm text-gray-600">{s.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Timing:</span> {s.timing}</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Purpose</h2>
        <p className="text-base leading-relaxed text-gray-700">{s.purpose}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
        <h2 className="text-base font-semibold text-indigo-900">The ritual</h2>
        <p className="mt-3 text-sm leading-relaxed text-indigo-900/90">{s.ritualSummary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-base font-semibold text-emerald-900">Key elements</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-emerald-900/90">
          {s.keyElements.map((e) => (
            <li key={e} className="flex gap-2">
              <span className="text-emerald-500">●</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Performed by</p>
          <p className="mt-2 text-sm text-gray-800">{s.whoPerforms}</p>
        </div>
        {s.scripturalReference && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Scriptural reference</p>
            <p className="mt-2 text-sm italic text-gray-800">{s.scripturalReference}</p>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-800">Modern relevance</h2>
        <p className="mt-2 text-base italic text-amber-900">{s.modernRelevance}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/samskaras/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← #{prev.number}</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.name}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/samskaras/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">#{next.number} →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.name}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/samskaras" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to index</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 16 Samskaras</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">All 16 samskaras</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {SAMSKARAS.map((ss) => (
            <Link
              key={ss.slug}
              href={`/samskaras/${ss.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                ss.slug === s.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {ss.number}. {ss.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
