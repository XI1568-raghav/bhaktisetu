import type { Metadata } from 'next';
import Link from 'next/link';
import { VEDAS, TOTAL_MANTRAS } from '../../lib/vedas';
import { formatNumber } from '../../lib/format-locale';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'The 4 Vedas, Rigveda, Samaveda, Yajurveda, Atharvaveda',
  description: 'The four Vedas of Sanatana Dharma, Rig (hymns), Sama (melody), Yajur (ritual), Atharva (life). ~20,000 mantras, principal Upanishads, shakhas, presiding priests.',
  alternates: { canonical: `${BASE_URL}/vedas` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'The 4 Vedas, Shruti foundation',
    description: 'The oldest sacred literature preserved continuously by human civilisation, ~20,000 mantras across four Vedas, each with samhita, brahmana, aranyaka, upanishad.',
    url: `${BASE_URL}/vedas`,
    type: 'website',
  },
};

export default function VedasIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The 4 Vedas',
    numberOfItems: VEDAS.length,
    itemListElement: VEDAS.map((v, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Book',
        name: v.name,
        url: `${BASE_URL}/vedas/${v.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Vedas', item: `${BASE_URL}/vedas` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-indigo-600">4 Vedas · ~{(TOTAL_MANTRAS / 1000).toFixed(0)}k mantras · Shruti, the heard, revealed scripture</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">चत्वारो वेदाः</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The 4 Vedas</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          The Vedas are the oldest sacred literature continuously preserved by any human
          civilisation. They are shruti, that which was heard by the rishis in deep
          contemplation, not composed by them. Each Veda has four parts, Samhita
          (mantras), Brahmana (ritual exegesis), Aranyaka (forest contemplation), and
          Upanishad (philosophical inquiry), together comprising the complete Vedic
          corpus.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">The four priests of the yajna</h2>
        <p className="mt-2 text-sm text-gray-700">
          Each Veda is the textual property of one of the four priests of the great yajna:
          the <strong>hotr</strong> recites the Rigveda, the <strong>udgatr</strong> sings
          the Samaveda, the <strong>adhvaryu</strong> mutters the Yajurveda while
          performing the actions, and the <strong>brahmin</strong> (in the technical
          Vedic sense) silently supervises and corrects using Atharvavedic knowledge.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {VEDAS.map((v) => (
          <Link
            key={v.slug}
            href={`/vedas/${v.slug}`}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-gray-500">#{v.number} of 4</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900">{formatNumber(v.totalMantras)} mantras</span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-900 group-hover:text-indigo-700">{v.name}</h2>
            <p className="mt-1 font-serif text-lg text-gray-700">{v.sanskrit}</p>
            <p className="mt-0.5 italic text-xs text-gray-500">{v.iast} · {v.meaning}</p>
            <p className="mt-3 text-sm text-gray-700">{v.primaryFocus}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="font-semibold">Priest:</span> {v.associatedPriest}</div>
              <div><span className="font-semibold">Shakhas:</span> {v.shakhasExtant} of {v.shakhasOriginal} extant</div>
            </div>
            <p className="mt-3 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900">{v.bestKnownFor}</p>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/upanishads" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">10 Upanishads</div>
            <div className="text-xs text-indigo-700">Vedanta, concluding part of each Veda</div>
          </Link>
          <Link href="/darshanas" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">6 Darshanas</div>
            <div className="text-xs text-indigo-700">The systematic Vedic philosophies</div>
          </Link>
          <Link href="/samskaras" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">16 Samskaras</div>
            <div className="text-xs text-rose-700">Vedic life-cycle ritual</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
