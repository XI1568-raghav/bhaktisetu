import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { YOGA_SUTRAS, padaSlugs, getPada } from '../../../lib/yoga-sutras';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return padaSlugs().map((pada) => ({ pada }));
}

export async function generateMetadata({ params }: { params: Promise<{ pada: string }> }): Promise<Metadata> {
  const { pada } = await params;
  const p = getPada(pada);
  if (!p) return { title: 'Not found' };
  return {
    title: `${p.english} — Pada ${p.number}, ${p.sutraCount} Sutras | Yoga Sutras | Darshya`,
    description: `${p.sanskrit} (${p.iast}) — Pada ${p.number} of Patanjali Yoga Sutras. ${p.centralFocus}. ${p.summary.slice(0, 100)}`,
    alternates: { canonical: `${BASE_URL}/yoga-sutras/${p.slug}` },
    openGraph: {
      title: `${p.english} — ${p.centralFocus}`,
      description: p.summary.slice(0, 160),
      url: `${BASE_URL}/yoga-sutras/${p.slug}`,
      type: 'article',
    },
  };
}

export default async function YogaSutraPadaPage({ params }: { params: Promise<{ pada: string }> }) {
  const { pada } = await params;
  const p = getPada(pada);
  if (!p) notFound();

  const idx = YOGA_SUTRAS.findIndex((x) => x.slug === p.slug);
  const prev = idx > 0 ? YOGA_SUTRAS[idx - 1] : undefined;
  const next = idx < YOGA_SUTRAS.length - 1 ? YOGA_SUTRAS[idx + 1] : undefined;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${p.english} — Patanjali Yoga Sutras Pada ${p.number}`,
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
      { '@type': 'ListItem', position: 2, name: 'Yoga Sutras', item: `${BASE_URL}/yoga-sutras` },
      { '@type': 'ListItem', position: 3, name: p.english, item: `${BASE_URL}/yoga-sutras/${p.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/yoga-sutras" className="hover:text-gray-800">Yoga Sutras</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{p.english}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-saffron-50 p-6">
        <p className="text-xs uppercase tracking-wider text-indigo-700">Pada {p.number} · {p.sutraCount} sutras</p>
        <h1 className="mt-2 font-serif text-3xl text-gray-900 sm:text-4xl">{p.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{p.english}</p>
        <p className="mt-1 italic text-sm text-gray-600">{p.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Central focus:</span> {p.centralFocus}</p>
        <p className="mt-1 text-sm text-gray-700"><span className="font-semibold">Audience:</span> {p.audience}</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{p.summary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-base font-semibold text-emerald-900">Key concepts</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-emerald-900/90">
          {p.keyConcepts.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-emerald-500">●</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {p.practicePillars && p.practicePillars.length > 0 && (
        <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/60 p-6">
          <h2 className="text-base font-semibold text-saffron-900">Practice pillars</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.practicePillars.map((pp) => (
              <span key={pp} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-saffron-800 ring-1 ring-saffron-300">{pp}</span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Key sutras</h2>
        <div className="space-y-4">
          {p.keySutras.map((s) => (
            <article key={s.ref} className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-xs uppercase tracking-wider text-saffron-700">Sutra {s.ref}</p>
              <p className="mt-3 font-serif text-xl leading-relaxed text-gray-900">{s.sanskrit}</p>
              <p className="mt-2 italic text-sm text-gray-600">{s.iast}</p>
              <p className="mt-3 text-base text-gray-800">{s.translation}</p>
              {s.commentary && (
                <p className="mt-3 rounded bg-indigo-50 p-3 text-xs italic text-indigo-900">{s.commentary}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-800">Takeaway</h2>
        <p className="mt-2 text-base italic text-amber-900">{p.takeaway}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/yoga-sutras/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← Pada {prev.number}</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.english}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/yoga-sutras/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">Pada {next.number} →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.english}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/yoga-sutras" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to index</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 4 Padas</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">All 4 padas</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {YOGA_SUTRAS.map((pp) => (
            <Link
              key={pp.slug}
              href={`/yoga-sutras/${pp.slug}`}
              className={`rounded-lg border px-3 py-1.5 font-medium ${
                pp.slug === p.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {pp.number}. {pp.english.split(' — ')[0]}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
