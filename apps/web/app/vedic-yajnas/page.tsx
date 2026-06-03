import type { Metadata } from 'next';
import Link from 'next/link';
import {
  VEDIC_YAJNAS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  type YajnaCategory,
  type YajnaModernStatus,
} from '../../lib/vedic-yajnas';

export const runtime = 'edge';
export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Vedic Yajnas — 10 Fire Rituals of the Shrauta Tradition | Darshya',
  description:
    'Ten classical Vedic fire rituals — Agnihotra, Darshapurnamasa, Chaturmasya, Pashubandha, Soma-yajna, Ashvamedha, Rajasuya, Vajapeya, Sarvamedha, Gosava. Category, deities, mantra source, modern status.',
  alternates: { canonical: `${BASE_URL}/vedic-yajnas` },
  openGraph: {
    title: 'Vedic Yajnas — 10 Fire Rituals of the Shrauta Tradition',
    description:
      'From the daily Agnihotra to the imperial Ashvamedha — ten classical Vedic fire rituals, their scriptural sources, and their living or historical status today.',
    url: `${BASE_URL}/vedic-yajnas`,
    type: 'website',
  },
};

const CATEGORY_ORDER: YajnaCategory[] = ['nitya', 'naimittika', 'kamya', 'royal'];

const CATEGORY_COLOR: Record<YajnaCategory, { bg: string; border: string; text: string; accent: string }> = {
  nitya: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', accent: 'text-amber-700' },
  naimittika: { bg: 'bg-saffron-50', border: 'border-saffron-200', text: 'text-saffron-900', accent: 'text-saffron-700' },
  kamya: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', accent: 'text-indigo-700' },
  royal: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', accent: 'text-rose-700' },
};

const STATUS_LABEL: Record<YajnaModernStatus, string> = {
  'actively-performed': 'Actively performed',
  rare: 'Rare in living tradition',
  extinct: 'Not performed today',
  reconstructed: 'Reconstructed / revived',
};

const STATUS_COLOR: Record<YajnaModernStatus, string> = {
  'actively-performed': 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  rare: 'bg-amber-100 text-amber-900 ring-amber-300',
  extinct: 'bg-gray-200 text-gray-800 ring-gray-300',
  reconstructed: 'bg-indigo-100 text-indigo-900 ring-indigo-300',
};

export default function VedicYajnasIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Vedic Yajnas — 10 Fire Rituals',
    numberOfItems: VEDIC_YAJNAS.length,
    itemListElement: VEDIC_YAJNAS.map((y, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Article',
        name: y.name,
        url: `${BASE_URL}/vedic-yajnas/${y.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Vedic Yajnas', item: `${BASE_URL}/vedic-yajnas` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span> <span>Vedic Yajnas</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-saffron-50 via-amber-50 to-rose-50 p-6 ring-1 ring-saffron-200">
        <h1 className="text-3xl font-bold text-saffron-900 sm:text-4xl">Vedic Yajnas — वैदिक यज्ञ</h1>
        <p className="mt-2 text-lg text-amber-900">The ten classical fire rituals of the Shrauta tradition</p>
        <p className="mt-3 max-w-3xl text-gray-800">
          The yajna — the offering into the consecrated fire with prescribed mantra — is the central act of Vedic religion. From the daily Agnihotra performed at every householder hearth to the imperial Ashvamedha that consecrated paramount sovereigns, the Shrauta corpus organises ten classical performances of vastly different scale and scope. Some continue, in attenuated form, in living agnihotri lineages; many belong to a closed scriptural and historical past.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-300 text-amber-900">10 yajnas</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-saffron-300 text-saffron-900">4 categories</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-indigo-300 text-indigo-900">Krishna + Shukla Yajurveda</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-emerald-300 text-emerald-900">Shatapatha Brahmana</span>
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Four categories of yajna</h2>
        <p className="text-sm text-gray-800">
          The Shrauta and Smarta literature classifies yajnas by the obligation under which they are performed. <em>Nitya</em> rites are unconditional daily duties; <em>naimittika</em> rites are triggered by a calendar occasion; <em>kamya</em> rites are optional and undertaken only when their specific fruit is desired; and the royal yajnas form an apex category historically reserved to consecrated sovereigns.
        </p>
      </section>

      {CATEGORY_ORDER.map((cat) => {
        const inCat = VEDIC_YAJNAS.filter((y) => y.category === cat);
        if (inCat.length === 0) return null;
        const c = CATEGORY_COLOR[cat];
        return (
          <section key={cat} className="mb-10">
            <h2 className={`mb-1 text-xl font-bold ${c.text}`}>{CATEGORY_LABELS[cat]}</h2>
            <p className="mb-3 text-sm text-gray-700">{CATEGORY_DESCRIPTIONS[cat]}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {inCat.map((y) => (
                <Link
                  key={y.slug}
                  href={`/vedic-yajnas/${y.slug}`}
                  className={`group rounded-lg border ${c.border} ${c.bg} p-4 transition hover:shadow-md`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className={`text-lg font-semibold ${c.text} group-hover:underline`}>{y.name}</h3>
                    <span className={`text-sm ${c.accent}`} lang="sa">{y.sanskrit}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-gray-300 text-gray-700">
                      {y.priestsRequired} priest{y.priestsRequired === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-gray-300 text-gray-700">
                      {y.durationDays}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 ring-1 ${STATUS_COLOR[y.modernStatus]}`}>
                      {STATUS_LABEL[y.modernStatus]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-800 line-clamp-3">{y.purpose}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-amber-900">Related study</h2>
        <ul className="space-y-2 text-sm text-gray-800">
          <li>• <Link href="/vedas" className="text-saffron-700 hover:underline">4 Vedas</Link> — the source corpus of all Shrauta yajna</li>
          <li>• <Link href="/upanishads" className="text-saffron-700 hover:underline">Upanishads</Link> — the philosophical critique that reframed yajna as inner practice</li>
          <li>• <Link href="/samskaras" className="text-saffron-700 hover:underline">16 Samskaras</Link> — the household life-cycle rites parallel to Shrauta yajna</li>
          <li>• <Link href="/sapta-rishis" className="text-saffron-700 hover:underline">Sapta Rishis</Link> — the seven seers whose hymns are recited in soma yajna</li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <strong className="text-gray-900">A note on historical framing.</strong> The yajnas described on these pages are presented as scriptural and historical references. Several of them — notably the Ashvamedha, Rajasuya, Vajapeya, Sarvamedha, Pashubandha, and Gosava — included animal-offering components in their Vedic-era form and are not performed in any living tradition today. No procedural instruction for any such rite is provided here. Living agnihotri lineages continue the Agnihotra and a small number of related ishti and soma performances, often using a pishtapashu (rice-flour effigy) in place of any historical animal offering.
      </section>
    </main>
  );
}
