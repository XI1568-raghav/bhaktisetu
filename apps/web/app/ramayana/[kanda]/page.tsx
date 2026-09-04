import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RAMAYANA_KANDAS, kandaSlugs, getKanda } from '../../../lib/ramayana-kandas';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return kandaSlugs().map((kanda) => ({ kanda }));
}

export async function generateMetadata({ params }: { params: Promise<{ kanda: string }> }): Promise<Metadata> {
  const { kanda } = await params;
  const k = getKanda(kanda);
  if (!k) return { title: 'Not found' };
  return {
    title: `Ramayana ${k.english} (${k.sanskrit}) — Kanda ${k.number} Summary, Episodes`,
    description: `${k.english} — Kanda ${k.number} of the Valmiki Ramayana in ${k.sargaCount} sargas. ${k.summary.slice(0, 140)}`,
    alternates: { canonical: `${BASE_URL}/ramayana/${k.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `Ramayana Kanda ${k.number}: ${k.english}`,
      description: k.summary.slice(0, 160),
      url: `${BASE_URL}/ramayana/${k.slug}`,
      type: 'article',
    },
  };
}

export default async function RamayanaKandaPage({ params }: { params: Promise<{ kanda: string }> }) {
  const { kanda } = await params;
  const k = getKanda(kanda);
  if (!k) notFound();

  const prev = RAMAYANA_KANDAS.find((x) => x.number === k.number - 1);
  const next = RAMAYANA_KANDAS.find((x) => x.number === k.number + 1);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Ramayana Kanda ${k.number}: ${k.english}`,
    description: k.summary,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-27',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Ramayana', item: `${BASE_URL}/ramayana` },
      { '@type': 'ListItem', position: 3, name: `Kanda ${k.number}: ${k.english}`, item: `${BASE_URL}/ramayana/${k.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/ramayana" className="hover:text-gray-800">Ramayana</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">Kanda {k.number}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Kanda {k.number} of 7 · {k.sargaCount} sargas</p>
        <h1 className={`${H1.catalogue} mt-2`}>{k.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{k.english}</p>
        <p className="mt-1 italic text-sm text-gray-600">{k.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Setting:</span> {k.setting}</p>
        <p className="mt-1 text-sm text-gray-700"><span className="font-semibold">Central figure:</span> {k.centralCharacter}</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Kanda summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{k.summary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
        <h2 className="text-base font-semibold text-indigo-900">Key episodes</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-indigo-900/90">
          {k.keyEpisodes.map((e) => (
            <li key={e} className="flex gap-2">
              <span className="text-indigo-500">●</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Central teaching</h2>
        <p className="mt-2 text-base italic text-emerald-900">{k.takeaway}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/ramayana/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← Previous kanda</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.number}. {prev.english}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/ramayana/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">Next kanda →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.number}. {next.english}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/ramayana" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to all kandas</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All 7 kandas index</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">All kandas</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {RAMAYANA_KANDAS.map((kk) => (
            <Link
              key={kk.slug}
              href={`/ramayana/${kk.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                kk.slug === k.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {kk.number}. {kk.english}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
