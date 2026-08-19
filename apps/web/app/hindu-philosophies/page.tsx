import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { HINDU_PHILOSOPHIES, TOTAL_HINDU_PHILOSOPHIES } from '../../lib/hindu-philosophies';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Hindu Philosophies — Shad Darshana + Vedanta Sub-Schools',
  description:
    'The six orthodox darshanas (Nyaya, Vaisheshika, Samkhya, Yoga, Mimamsa, Vedanta) and four major Vedanta sub-schools (Advaita, Vishishtadvaita, Dvaita, Achintya-Bheda-Abheda). Founders, central thesis, pramana, liberation view, key concepts.',
  alternates: { canonical: `${BASE_URL}/hindu-philosophies` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Hindu Philosophies — Shad Darshana + Vedanta Sub-Schools',
    description:
      'A neutral, scholarly overview of the six orthodox schools of Hindu philosophy and four major Vedanta sub-schools.',
    url: `${BASE_URL}/hindu-philosophies`,
    type: 'website',
  },
};

export default function HinduPhilosophiesIndexPage() {
  const orthodox = HINDU_PHILOSOPHIES.filter((p) => p.category === 'orthodox-darshana');
  const vedantaSchools = HINDU_PHILOSOPHIES.filter((p) => p.category === 'vedanta-sub-school');

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu Philosophies — Shad Darshana + Vedanta Sub-Schools',
    numberOfItems: HINDU_PHILOSOPHIES.length,
    itemListElement: HINDU_PHILOSOPHIES.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Article',
        name: p.name,
        url: `${BASE_URL}/hindu-philosophies/${p.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Hindu Philosophies', item: `${BASE_URL}/hindu-philosophies` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumb]) }}
      />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">
          {TOTAL_HINDU_PHILOSOPHIES} schools · 6 orthodox darshanas + 4 Vedanta sub-schools
        </p>
        <h1 className={`${H1.catalogue} mt-1`}>हिन्दू दर्शन</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Hindu Philosophies — Shad Darshana &amp; Vedanta Sub-Schools
        </p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          The six orthodox (astika) schools of classical Hindu philosophy — Nyaya, Vaisheshika,
          Samkhya, Yoga, Mimamsa, and Vedanta — each present a complete system with its own
          founder, root texts, accepted means of valid knowledge (pramana), and characteristic
          understanding of liberation. Within Vedanta, multiple sub-schools developed rigorous,
          mutually distinct interpretations of the same Upanishadic source texts. The pages below
          present each tradition on its own terms in scholarly neutrality.
        </p>
      </header>

      <section className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-gray-900">The Six Orthodox Darshanas (Shad Darshana)</h2>
          <span className="text-xs text-gray-500">{orthodox.length} schools</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {orthodox.map((p) => (
            <Link
              key={p.slug}
              href={`/hindu-philosophies/${p.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-saffron-400 hover:shadow-md"
            >
              <p className="font-serif text-lg text-saffron-700">{p.sanskrit}</p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">{p.name}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {p.founder} · {p.foundingEra}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-gray-700">{p.centralThesis}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Major Vedanta Sub-Schools</h2>
          <span className="text-xs text-gray-500">{vedantaSchools.length} traditions</span>
        </div>
        <p className="mb-4 max-w-3xl text-sm text-gray-600">
          Vedanta is a family of traditions that share the Upanishads, Brahma Sutras, and Bhagavad
          Gita (the prasthana-trayi) as authoritative, while differing rigorously on the nature of
          Brahman, the self, the world, and liberation. Each sub-school below is presented on its
          own terms.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {vedantaSchools.map((p) => (
            <Link
              key={p.slug}
              href={`/hindu-philosophies/${p.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-md"
            >
              <p className="font-serif text-lg text-indigo-700">{p.sanskrit}</p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">{p.name}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {p.founder} · {p.foundingEra}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-gray-700">{p.centralThesis}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">A note on neutrality</h2>
        <p className="mt-2 text-sm text-gray-700">
          Each school summarised here has been a living, internally rigorous tradition for many
          centuries, with a vast commentarial literature and contemporary teachers. The intent of
          these pages is descriptive and historical, not adjudicatory; no claim is made that any
          one school is the uniquely correct interpretation of the Veda or Vedanta.
        </p>
      </section>
    </main>
  );
}
