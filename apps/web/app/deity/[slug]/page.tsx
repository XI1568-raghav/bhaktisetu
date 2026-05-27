// Per-deity hub page: overview + mantra + pujas the user can book for this
// deity right now. Programmatic-SEO play for long-tail "{deity} puja online"
// queries. One file fans out to N deities via [slug] segment.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeity, DEITIES } from '../../../lib/deities';
import { getPujaTypes } from '../../../lib/api';
import { getMantrasForDeity } from '../../../lib/deity-mantras';

export const runtime = 'edge';
export const revalidate = 3600;

interface Params {
  params: { slug: string };
}

function fmtINR(s: string): string {
  const n = parseFloat(s);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : s;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = getDeity(params.slug);
  if (!d) return { title: 'Deity — Darshya' };
  return {
    title: `${d.name} pujas online — verified pandits, video proof`,
    description: `Book ${d.name} pujas online with verified pandits. ${d.popularPujas.join(', ')}. Mantra: ${d.mantra}. Video proof + 80G receipts.`,
    alternates: { canonical: `https://darshya.online/deity/${d.slug}` },
    openGraph: {
      title: `${d.name} — pujas, mantras, festivals`,
      description: `Verified ${d.name} pujas. Festival: ${d.festival}.`,
      url: `https://darshya.online/deity/${d.slug}`,
      type: 'website',
      images: ['/og/default'],
    },
  };
}

export default async function DeityPage({ params }: Params) {
  const d = getDeity(params.slug);
  if (!d) notFound();

  // API filter on deity field — list active pujas for this deity. Tolerant of
  // empty / errored API; static deity overview is still useful for SEO + intro.
  const pujasRes = await getPujaTypes({ deity: d.deityKey, limit: 24 }).catch(
    () => null,
  );
  const pujas = pujasRes?.data.filter((p) => p.isActive) || [];

  const mantraCount = getMantrasForDeity(d.slug).length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: d.name,
    alternateName: d.sanskrit,
    description: d.description,
    url: `https://darshya.online/deity/${d.slug}`,
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/deity" className="hover:text-saffron-700">Deities</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">{d.name}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
            🕉️ Devata
          </span>
          <span className="text-xs text-surface-500">Festival: {d.festival}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2">
          {d.name} <span className="text-2xl font-serif text-surface-500 ml-2">{d.sanskrit}</span>
        </h1>
        {d.consort ? (
          <p className="text-sm text-surface-600 mb-3">Consort: {d.consort}</p>
        ) : null}
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          {d.description}
        </p>
      </header>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">
          Sacred mantra
        </h2>
        <p className="text-2xl font-serif text-surface-900 leading-relaxed">
          {d.mantra}
        </p>
        <p className="text-xs text-surface-600 mt-2">
          Recite 108 times for maximum benefit.
          {mantraCount > 0 ? (
            <>
              {' '}See{' '}
              <Link
                href={`/deity/${d.slug}/mantras`}
                className="text-saffron-700 hover:underline font-semibold"
              >
                all {mantraCount} {d.name} mantras →
              </Link>
            </>
          ) : (
            <>
              {' '}Use{' '}
              <Link href="/shlokas" className="text-saffron-700 hover:underline">our shloka library</Link>
              {' '}for more.
            </>
          )}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">
          Book {d.name} pujas online
        </h2>
        {pujas.length === 0 ? (
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-6">
            <p className="text-surface-700 mb-3">
              Popular {d.name} pujas: {d.popularPujas.join(', ')}.
            </p>
            <p className="text-sm text-surface-600 mb-4">
              Catalogue is being onboarded. Browse all pujas while we add {d.name} listings.
            </p>
            <Link
              href="/pujas"
              className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
            >
              Browse all pujas →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pujas.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="text-xs uppercase tracking-wider text-saffron-700 font-semibold">
                    {p.category}
                  </span>
                  <span className="text-xs text-surface-500">{p.durationMinutes} min</span>
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-1">{p.name}</h3>
                {p.nameLocal ? (
                  <p className="text-xs text-surface-500 font-serif mb-2">{p.nameLocal}</p>
                ) : null}
                <p className="text-sm text-surface-700 mb-4 line-clamp-3">{p.description}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-surface-900">{fmtINR(p.basePrice)}</span>
                  <Link
                    href={`/pujas/${p.slug}`}
                    className="text-sm font-semibold text-saffron-700 hover:underline"
                  >
                    Book now →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Other deities</h2>
        <div className="flex flex-wrap gap-2">
          {DEITIES.filter((x) => x.slug !== d.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/deity/${x.slug}`}
              className="inline-block px-3 py-1.5 rounded-full border border-surface-200 bg-white text-xs text-surface-700 hover:border-saffron-300 hover:text-saffron-700"
            >
              {x.name}
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-sm text-surface-600">
        <p className="mb-2">
          <strong>Why Darshya?</strong> Every {d.name} puja booking includes mandatory video proof of the ceremony, 80G donation receipt where applicable, and a verified pandit gated on Aadhaar.
        </p>
        <Link href="/deity" className="text-saffron-700 hover:underline">
          ← All deities
        </Link>
      </footer>
    </main>
  );
}
