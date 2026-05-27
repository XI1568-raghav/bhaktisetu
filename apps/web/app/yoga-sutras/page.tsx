import type { Metadata } from 'next';
import Link from 'next/link';
import { YOGA_SUTRAS, TOTAL_SUTRAS } from '../../lib/yoga-sutras';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Patanjali Yoga Sutras — 4 Padas, 196 Sutras, Ashtanga Yoga | Darshya',
  description: '196 sutras of Patanjali in 4 padas — Samadhi, Sadhana, Vibhuti, Kaivalya. The classical eight-limbed (ashtanga) path: yama, niyama, asana, pranayama, pratyahara, dharana, dhyana, samadhi.',
  alternates: { canonical: `${BASE_URL}/yoga-sutras` },
  openGraph: {
    title: 'Patanjali Yoga Sutras — 4 Padas, 196 Sutras',
    description: 'The foundational text of Yoga darshana — Patanjali’s eight-limbed path to kaivalya.',
    url: `${BASE_URL}/yoga-sutras`,
    type: 'website',
  },
};

const PADA_COLORS = ['indigo', 'saffron', 'emerald', 'rose'] as const;

export default function YogaSutrasIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Patanjali Yoga Sutras',
    numberOfItems: YOGA_SUTRAS.length,
    itemListElement: YOGA_SUTRAS.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Chapter',
        name: p.english,
        url: `${BASE_URL}/yoga-sutras/${p.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Yoga Sutras', item: `${BASE_URL}/yoga-sutras` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-indigo-600">4 padas · {TOTAL_SUTRAS} sutras · Yoga darshana</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">पातञ्जल योगसूत्र</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Patanjali Yoga Sutras</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          Composed around the 2nd century BCE, the Yoga Sutras of Patanjali are the
          foundational text of the Yoga darshana — one of the six classical systems of
          Indian philosophy. In just {TOTAL_SUTRAS} terse sutras across 4 padas (chapters),
          Patanjali lays out the entire science of stilling the mind, culminating in
          kaivalya — the absolute liberation of consciousness.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-saffron-200 bg-saffron-50/60 p-6">
        <h2 className="text-base font-semibold text-saffron-900">The eight limbs (Aṣṭāṅga Yoga)</h2>
        <p className="mt-2 text-sm text-saffron-800">Sutra 2.29 lists the complete path:</p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          {[
            ['1. Yama', 'Ethical restraints'],
            ['2. Niyama', 'Personal observances'],
            ['3. Āsana', 'Steady posture'],
            ['4. Prāṇāyāma', 'Breath control'],
            ['5. Pratyāhāra', 'Sense withdrawal'],
            ['6. Dhāraṇā', 'Concentration'],
            ['7. Dhyāna', 'Meditation'],
            ['8. Samādhi', 'Absorption'],
          ].map(([limb, desc]) => (
            <div key={limb} className="rounded-lg bg-white p-3">
              <p className="font-semibold text-saffron-900">{limb}</p>
              <p className="text-saffron-700">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold text-gray-900">The 4 Padas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {YOGA_SUTRAS.map((p, idx) => {
            const color = PADA_COLORS[idx]!;
            return (
              <Link
                key={p.slug}
                href={`/yoga-sutras/${p.slug}`}
                className={`group rounded-xl border border-${color}-200 bg-${color}-50/40 p-5 transition hover:border-${color}-400 hover:shadow-md`}
              >
                <div className="flex items-baseline justify-between">
                  <span className={`text-xs font-semibold uppercase text-${color}-700`}>Pada {p.number}</span>
                  <span className="text-xs text-gray-500">{p.sutraCount} sutras</span>
                </div>
                <h3 className={`mt-2 font-serif text-2xl text-${color}-900`}>{p.sanskrit}</h3>
                <p className={`mt-1 text-base font-bold text-gray-900 group-hover:text-${color}-800`}>{p.english}</p>
                <p className="mt-1 text-xs italic text-gray-600">{p.iast}</p>
                <p className="mt-3 text-sm text-gray-700">{p.centralFocus}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/upanishads" className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-4 hover:bg-saffron-100">
            <div className="text-sm font-semibold text-saffron-900">10 Upanishads</div>
            <div className="text-xs text-saffron-700">Shruti foundation; Vedanta source</div>
          </Link>
          <Link href="/gita" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Bhagavad Gita</div>
            <div className="text-xs text-indigo-700">Karma, Bhakti, Jnana yogas</div>
          </Link>
          <Link href="/chants/om-namah-shivaya" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">Mantra Sadhana</div>
            <div className="text-xs text-rose-700">Japa as Kriya Yoga in practice</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
