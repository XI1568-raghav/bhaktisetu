import type { Metadata } from 'next';
import Link from 'next/link';
import { SAMSKARAS, STAGE_LABELS, type SamskaraStage } from '../../lib/samskaras';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '16 Samskaras — Hindu Rites of Passage from Conception to Cremation | Darshya',
  description: 'The complete 16 samskaras (sodasa-samskaras) of the Hindu lifecycle — Garbhadhana, Namakarana, Annaprashana, Upanayana, Vivaha, Antyeshti and more. Sanskrit, timing, ritual + modern relevance.',
  alternates: { canonical: `${BASE_URL}/samskaras` },
  openGraph: {
    title: 'The 16 Hindu Samskaras',
    description: 'Sodasa-samskaras — the sacred rites that consecrate every passage of a Hindu life.',
    url: `${BASE_URL}/samskaras`,
    type: 'website',
  },
};

const STAGE_ORDER: SamskaraStage[] = ['prenatal', 'childhood', 'student', 'householder', 'final'];
const STAGE_COLORS: Record<SamskaraStage, string> = {
  prenatal: 'rose',
  childhood: 'saffron',
  student: 'indigo',
  householder: 'emerald',
  final: 'gray',
};

export default function SamskarasIndexPage() {
  const byStage = STAGE_ORDER.reduce<Record<SamskaraStage, typeof SAMSKARAS>>((acc, s) => {
    acc[s] = SAMSKARAS.filter((x) => x.stage === s);
    return acc;
  }, { prenatal: [], childhood: [], student: [], householder: [], final: [] });

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The 16 Hindu Samskaras',
    numberOfItems: SAMSKARAS.length,
    itemListElement: SAMSKARAS.map((s, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Article',
        name: s.name,
        url: `${BASE_URL}/samskaras/${s.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Samskaras', item: `${BASE_URL}/samskaras` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">16 rites · 5 life stages · Sanskaras for the whole lifecycle</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">षोडश संस्कार</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The 16 Hindu Samskaras</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          A samskara is a Sanskrit rite of passage — literally "that which refines."
          The Grihya Sutras enumerate 16 (sodasa) samskaras consecrating every major
          transition of a Hindu life, from the moment of conception (Garbhadhana) to
          the final cremation rites (Antyeshti). Some have evolved or merged; many
          remain fully alive in households and temples across India today.
        </p>
      </header>

      {STAGE_ORDER.map((stage) => {
        const items = byStage[stage];
        if (items.length === 0) return null;
        const color = STAGE_COLORS[stage];
        return (
          <section key={stage} className="mb-10">
            <h2 className={`mb-4 border-b border-${color}-200 pb-2 text-xl font-bold text-${color}-900`}>{STAGE_LABELS[stage]} · {items.length} samskara{items.length === 1 ? '' : 's'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((s) => (
                <Link
                  key={s.slug}
                  href={`/samskaras/${s.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-saffron-300 hover:shadow-md"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-gray-500">#{s.number}</span>
                    <span className="font-serif text-base text-gray-700">{s.sanskrit}</span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-gray-900 group-hover:text-saffron-700">{s.name}</h3>
                  <p className="mt-1 text-xs italic text-gray-500">{s.iast}</p>
                  <p className="mt-2 text-xs font-medium text-gray-600">{s.timing}</p>
                  <p className="mt-2 text-xs text-gray-700 line-clamp-2">{s.purpose}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/upanishads" className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-4 hover:bg-saffron-100">
            <div className="text-sm font-semibold text-saffron-900">10 Upanishads</div>
            <div className="text-xs text-saffron-700">Shruti — philosophical foundation</div>
          </Link>
          <Link href="/yoga-sutras" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Yoga Sutras</div>
            <div className="text-xs text-indigo-700">Inner discipline of the householder</div>
          </Link>
          <Link href="/sankalp" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">Vedic Sankalp</div>
            <div className="text-xs text-rose-700">Build the resolve recited in every samskara</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
