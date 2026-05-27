import type { Metadata } from 'next';
import Link from 'next/link';
import { SAPTA_RISHIS } from '../../lib/sapta-rishis';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Sapta Rishis — The 7 Great Sages of Sanatana Dharma | Darshya',
  description: 'The seven great rishis who composed the Rigveda and founded the brahmana gotras — Atri, Bharadvaja, Gautama, Jamadagni, Kashyapa, Vasishtha, Vishvamitra. The Ursa Major constellation in the sky.',
  alternates: { canonical: `${BASE_URL}/sapta-rishis` },
  openGraph: {
    title: 'Sapta Rishis — The 7 Great Sages',
    description: 'The seven rishis whose names are carried by every brahmana gotra and whose mandalas form the core of the Rigveda — visible nightly as Ursa Major.',
    url: `${BASE_URL}/sapta-rishis`,
    type: 'website',
  },
};

export default function SaptaRishisIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sapta Rishis — The 7 Great Sages',
    numberOfItems: SAPTA_RISHIS.length,
    itemListElement: SAPTA_RISHIS.map((r, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Person',
        name: r.name,
        url: `${BASE_URL}/sapta-rishis/${r.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Sapta Rishis', item: `${BASE_URL}/sapta-rishis` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span> <span>Sapta Rishis</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-indigo-50 via-saffron-50 to-amber-50 p-6 ring-1 ring-indigo-200">
        <h1 className="text-3xl font-bold text-indigo-900 sm:text-4xl">Sapta Rishis — सप्त ऋषयः</h1>
        <p className="mt-2 text-lg text-saffron-900">The seven great sages of Sanatana Dharma</p>
        <p className="mt-3 max-w-3xl text-gray-800">
          The seven rishis who composed the bulk of the Rigveda and from whom every brahmana traces gotra descent. By tradition they sit forever in the northern sky as Ursa Major — the Saptarshi-mandala — circling the pole star Dhruva. Each gives a mandala to the Veda, a gotra to the lineage, a teaching to dharma, and a star to the night.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-indigo-300 text-indigo-900">7 rishis</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-300 text-amber-900">7 stars of Ursa Major</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-saffron-300 text-saffron-900">7 gotras + descendants</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-emerald-300 text-emerald-900">Rigveda Mandalas 3, 5, 6, 7</span>
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-amber-900">The seven stars in the sky</h2>
        <p className="text-sm text-gray-800">
          In Hindu astronomy each of the seven stars of Ursa Major bears the name of one of the rishis. The faint companion star Alcor, sitting beside Mizar in the handle of the constellation, is Arundhati — the wife of Vasishtha — visible only to keen sight, and traditionally sighted by the bride and groom on every Hindu wedding night as a vow of fidelity.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {SAPTA_RISHIS.map((r) => (
          <Link
            key={r.slug}
            href={`/sapta-rishis/${r.slug}`}
            className="group rounded-lg border border-saffron-200 bg-saffron-50 p-4 transition hover:shadow-md"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-saffron-900 group-hover:underline">
                #{r.number} {r.name}
              </h3>
              <span className="text-sm text-amber-800">{r.sanskrit}</span>
            </div>
            <p className="mt-1 text-xs italic text-gray-600">{r.associatedStar}</p>
            <p className="mt-2 text-sm text-gray-800">{r.bestKnownFor}</p>
            <p className="mt-2 text-xs text-indigo-700">Gotra: {r.gotra}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-emerald-900">Related study</h2>
        <ul className="space-y-2 text-sm text-gray-800">
          <li>• <Link href="/vedas/rigveda" className="text-saffron-700 hover:underline">Rigveda</Link> — composed across 10 mandalas, 4 by the sapta rishis</li>
          <li>• <Link href="/upanishads" className="text-saffron-700 hover:underline">Principal Upanishads</Link> — many transmitted by rishi-paramparas descended from these seven</li>
          <li>• <Link href="/samskaras" className="text-saffron-700 hover:underline">16 Samskaras</Link> — the gotra ascription used at every rite traces back to one of these rishis</li>
          <li>• <Link href="/dashavatar" className="text-saffron-700 hover:underline">Dashavatar</Link> — Parashurama (son of Jamadagni) and Vamana (born to Kashyapa) are direct avataras of these lineages</li>
        </ul>
      </section>
    </main>
  );
}
