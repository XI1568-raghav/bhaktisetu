import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { DARSHANAS, TOTAL_DARSHANAS, PAIR_LABELS, PAIR_ORDER, type DarshanaPair } from '../../lib/darshanas';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'The 6 Darshanas — Schools of Hindu Philosophy',
  description: 'Nyaya, Vaisheshika, Sankhya, Yoga, Purva Mimamsa, Vedanta — the six astika darshanas. Founders, central thesis, key concepts, pramanas, liberation paths.',
  alternates: { canonical: `${BASE_URL}/darshanas` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'The 6 Darshanas (Shad-Darshana)',
    description: 'Six orthodox schools of Hindu philosophy — Nyaya, Vaisheshika, Sankhya, Yoga, Purva Mimamsa, Vedanta — paired into 3 complementary couples.',
    url: `${BASE_URL}/darshanas`,
    type: 'website',
  },
};

const PAIR_COLORS: Record<DarshanaPair, string> = {
  'logic-atomism': 'indigo',
  'enumeration-discipline': 'emerald',
  'ritual-knowledge': 'saffron',
};

export default function DarshanasIndexPage() {
  const byPair = PAIR_ORDER.reduce<Record<DarshanaPair, typeof DARSHANAS>>((acc, p) => {
    acc[p] = DARSHANAS.filter((d) => d.pair === p);
    return acc;
  }, { 'logic-atomism': [], 'enumeration-discipline': [], 'ritual-knowledge': [] });

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The 6 Darshanas — Schools of Hindu Philosophy',
    numberOfItems: DARSHANAS.length,
    itemListElement: DARSHANAS.map((d, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Article',
        name: d.name,
        url: `${BASE_URL}/darshanas/${d.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Darshanas', item: `${BASE_URL}/darshanas` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">{TOTAL_DARSHANAS} astika darshanas · 3 complementary pairs</p>
        <h1 className={`${H1.catalogue} mt-1`}>षड्दर्शन</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The 6 Darshanas — Schools of Hindu Philosophy</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          The shad-darshana are the six classical orthodox (astika — accepting the Veda)
          schools of Hindu philosophy. Each is a complete system with its own founder,
          root sutra text, accepted means of knowledge (pramanas), and characteristic
          definition of liberation. Tradition groups them into three complementary pairs:
          Nyaya–Vaisheshika (logic + atomism), Sankhya–Yoga (enumeration + discipline),
          and Purva Mimamsa–Vedanta (ritual + knowledge).
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">Why six, why pairs?</h2>
        <p className="mt-2 text-sm text-gray-700">
          The pairing is not accidental. Nyaya supplies the logic that Vaisheshika applies to its atomistic ontology;
          Sankhya supplies the metaphysics that Yoga reduces to practice; Purva Mimamsa establishes the authority
          of the Vedic word, and Uttara Mimamsa (Vedanta) reads that same Veda for the knowledge of brahman.
          Together the six form a single integrated study — debate, ontology, cosmology, contemplation, ritual, knowledge.
        </p>
      </section>

      {PAIR_ORDER.map((pair) => {
        const items = byPair[pair];
        if (items.length === 0) return null;
        const color = PAIR_COLORS[pair];
        return (
          <section key={pair} className="mb-10">
            <h2 className={`mb-4 border-b border-${color}-200 pb-2 text-xl font-bold text-${color}-900`}>{PAIR_LABELS[pair]}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((d) => (
                <Link
                  key={d.slug}
                  href={`/darshanas/${d.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-saffron-300 hover:shadow-md"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-gray-500">#{d.number}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{d.approxDate}</span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-gray-900 group-hover:text-saffron-700">{d.name}</h3>
                  <p className="mt-0.5 font-serif text-sm text-gray-700">{d.sanskrit}</p>
                  <p className="mt-1 text-xs text-gray-500">Founder: {d.founder}</p>
                  <p className="mt-1 text-xs text-gray-500">Root text: {d.foundingText}</p>
                  <p className="mt-2 rounded bg-saffron-50 px-2 py-1 text-xs font-medium text-saffron-900">{d.bestKnownFor}</p>
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
            <div className="text-xs text-saffron-700">Shruti — Vedanta&apos;s source</div>
          </Link>
          <Link href="/yoga-sutras" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Patanjali Yoga Sutras</div>
            <div className="text-xs text-indigo-700">The Yoga darshana root text</div>
          </Link>
          <Link href="/gita" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">Bhagavad Gita</div>
            <div className="text-xs text-rose-700">Vedanta + Sankhya + Yoga synthesis</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
