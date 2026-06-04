import type { Metadata } from 'next';
import Link from 'next/link';
import { BHAKTI_SAINTS } from '../../lib/bhakti-saints';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Bhakti Saints — 12 Medieval Devotional Masters | Darshya',
  description: 'Twelve saints who shaped Hindu devotion across 8 centuries — Tulsidas, Mirabai, Kabir, Surdas, Tukaram, Namdev, Andal, Chaitanya, Adi Shankara, Ramanuja, Madhva, Ramakrishna.',
  alternates: { canonical: `${BASE_URL}/bhakti-saint` },
  openGraph: {
    title: 'Bhakti Saints — 12 Devotional Masters',
    description: 'Saguna + Nirguna, Vaishnava + Shaiva + Shakta, North + South + East + West — twelve medieval saints who carried bhakti to the people.',
    url: `${BASE_URL}/bhakti-saint`,
    type: 'website',
  },
};

const GROUPS: Array<{ heading: string; tag: string; slugs: string[] }> = [
  {
    heading: 'Vedanta Acharyas',
    tag: 'Founding philosophers of Saguna + Nirguna lineages',
    slugs: ['adi-shankaracharya', 'ramanujacharya', 'madhvacharya'],
  },
  {
    heading: 'Saguna Vaishnava Bhakti',
    tag: 'Singers of Rama, Krishna, Vitthala — bhakti through the divine name and form',
    slugs: ['tulsidas', 'mirabai', 'surdas', 'tukaram', 'namdev', 'andal', 'chaitanya-mahaprabhu'],
  },
  {
    heading: 'Nirguna Sant + Modern',
    tag: 'Formless devotion + 19th-century renewal',
    slugs: ['kabir', 'ramakrishna-paramahamsa'],
  },
];

export default function BhaktiSaintIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Bhakti Saints of Sanatana Dharma',
    numberOfItems: BHAKTI_SAINTS.length,
    itemListElement: BHAKTI_SAINTS.map((s, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Person',
        name: s.name,
        url: `${BASE_URL}/bhakti-saint/${s.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Bhakti Saints', item: `${BASE_URL}/bhakti-saint` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span> <span>Bhakti Saints</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-indigo-50 via-saffron-50 to-amber-50 p-6 ring-1 ring-indigo-200">
        <h1 className="text-3xl font-bold text-indigo-900 sm:text-4xl">Bhakti Saints — भक्ति-संत</h1>
        <p className="mt-2 text-lg text-saffron-900">Twelve medieval masters who carried devotion to the people</p>
        <p className="mt-3 max-w-3xl text-gray-800">
          From the 8th-century Vedanta of Adi Shankara to the 19th-century Kali-bhakti of Ramakrishna, these twelve saints reshaped Sanatana Dharma by making the highest teachings accessible in vernacular tongue — Awadhi, Brajbhasha, Marathi, Tamil, Bengali, Hindi. They composed in song instead of Sanskrit shastra, opened temples to women and shudras, and put the divine name on the lips of farmers, weavers, and queens alike.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-indigo-300 text-indigo-900">12 saints</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-300 text-amber-900">8th–19th centuries</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-saffron-300 text-saffron-900">Saguna + Nirguna</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-emerald-300 text-emerald-900">Vaishnava + Shaiva + Shakta</span>
        </div>
      </header>

      {GROUPS.map((g) => (
        <section key={g.heading} className="mb-10">
          <h2 className="mb-1 text-xl font-semibold text-indigo-900">{g.heading}</h2>
          <p className="mb-4 text-sm italic text-gray-600">{g.tag}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.slugs.map((slug) => {
              const s = BHAKTI_SAINTS.find((x) => x.slug === slug);
              if (!s) return null;
              return (
                <Link
                  key={s.slug}
                  href={`/bhakti-saint/${s.slug}`}
                  className="group rounded-lg border border-saffron-200 bg-saffron-50 p-4 transition hover:shadow-md"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-saffron-900 group-hover:underline">{s.name}</h3>
                    <span className="shrink-0 text-sm text-amber-800" lang="sa">{s.sanskrit}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{s.era} · {s.region}</p>
                  <p className="mt-2 text-sm text-gray-800">{s.bestKnownFor}</p>
                  <p className="mt-2 text-xs text-indigo-700">Deity: {s.deity}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <section className="mt-10 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-emerald-900">Related study</h2>
        <ul className="space-y-2 text-sm text-gray-800">
          <li>• <Link href="/chants" className="text-saffron-700 hover:underline">Famous Chants</Link> — many composed or popularised by these saints</li>
          <li>• <Link href="/chalisa" className="text-saffron-700 hover:underline">Chalisas</Link> — Tulsidas's Hanuman Chalisa being the most recited</li>
          <li>• <Link href="/aarti" className="text-saffron-700 hover:underline">Aartis</Link> — devotional songs sung in temples across India</li>
          <li>• <Link href="/sapta-rishis" className="text-saffron-700 hover:underline">Sapta Rishis</Link> — the seven Vedic sages from whom these traditions descend</li>
        </ul>
      </section>
    </main>
  );
}
