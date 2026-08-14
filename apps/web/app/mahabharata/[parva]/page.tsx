import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MAHABHARATA_PARVAS, parvaSlugs, getParva } from '../../../lib/mahabharata-parvas';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return parvaSlugs().map((parva) => ({ parva }));
}

export async function generateMetadata({ params }: { params: Promise<{ parva: string }> }): Promise<Metadata> {
  const { parva } = await params;
  const p = getParva(parva);
  if (!p) return { title: 'Not found' };
  return {
    title: `Mahabharata ${p.english} (${p.sanskrit}) — Parva ${p.number} Summary, Episodes`,
    description: `${p.english} — Parva ${p.number} of the Mahabharata in ${p.adhyayaCount} adhyayas. ${p.summary.slice(0, 140)}`,
    alternates: { canonical: `${BASE_URL}/mahabharata/${p.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `Mahabharata Parva ${p.number}: ${p.english}`,
      description: p.summary.slice(0, 160),
      url: `${BASE_URL}/mahabharata/${p.slug}`,
      type: 'article',
    },
  };
}

export default async function MahabharataParvaPage({ params }: { params: Promise<{ parva: string }> }) {
  const { parva } = await params;
  const p = getParva(parva);
  if (!p) notFound();

  const prev = MAHABHARATA_PARVAS.find((x) => x.number === p.number - 1);
  const next = MAHABHARATA_PARVAS.find((x) => x.number === p.number + 1);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Mahabharata Parva ${p.number}: ${p.english}`,
    description: p.summary,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-28',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Mahabharata', item: `${BASE_URL}/mahabharata` },
      { '@type': 'ListItem', position: 3, name: `Parva ${p.number}: ${p.english}`, item: `${BASE_URL}/mahabharata/${p.slug}` },
    ],
  };

  const hasGita = p.slug === 'bhishma-parva';

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/mahabharata" className="hover:text-gray-800">Mahabharata</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">Parva {p.number}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Parva {p.number} of 18 · {p.adhyayaCount} adhyayas</p>
        <h1 className="mt-2 font-serif text-3xl text-gray-900 sm:text-4xl">{p.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{p.english}</p>
        <p className="mt-1 italic text-sm text-gray-600">{p.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Setting:</span> {p.setting}</p>
        <p className="mt-1 text-sm text-gray-700"><span className="font-semibold">Central figure:</span> {p.centralCharacter}</p>
      </header>

      {hasGita ? (
        <section className="mb-8 rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-6">
          <p className="text-xs uppercase tracking-wider text-indigo-700">Inside this parva</p>
          <h2 className="mt-1 text-xl font-bold text-indigo-900">The Bhagavad Gita</h2>
          <p className="mt-2 text-sm text-indigo-900/80">
            Adhyayas 25-42 of Bhishma Parva contain the 700-verse dialogue between Krishna
            and Arjuna on the Kurukshetra battlefield — the most-quoted scripture in all
            Hinduism.
          </p>
          <Link href="/gita" className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline">Read the Gita →</Link>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Parva summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{p.summary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
        <h2 className="text-base font-semibold text-indigo-900">Key episodes</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-indigo-900/90">
          {p.keyEpisodes.map((e) => (
            <li key={e} className="flex gap-2">
              <span className="text-indigo-500">●</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Central teaching</h2>
        <p className="mt-2 text-base italic text-emerald-900">{p.takeaway}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/mahabharata/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← Previous parva</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.number}. {prev.english}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/mahabharata/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">Next parva →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.number}. {next.english}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/mahabharata" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to all parvas</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 18 parvas index</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">All parvas</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {MAHABHARATA_PARVAS.map((pp) => (
            <Link
              key={pp.slug}
              href={`/mahabharata/${pp.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                pp.slug === p.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {pp.number}. {pp.english}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
