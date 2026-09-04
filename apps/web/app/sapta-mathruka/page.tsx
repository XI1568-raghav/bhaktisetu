import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { SAPTA_MATHRUKA } from '../../lib/sapta-mathruka';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Sapta Matrika — 7 Mother Goddesses (Names, Mantras, Vahana, Weapons)',
  description:
    'All 7 Matrikas per Devi Mahatmya — Brahmani, Vaishnavi, Maheshwari, Indrani, Kaumari, Varahi, Chamunda. Each shakti emerged from a god to slay Raktabija and Andhakasura. Beej mantras, vahana, weapons, signature vrata.',
  alternates: { canonical: `${BASE_URL}/sapta-mathruka` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Sapta Matrika — 7 mother goddesses',
    description: 'Brahmani, Vaishnavi, Maheshwari, Indrani, Kaumari, Varahi, Chamunda — full Tantric grid.',
    url: `${BASE_URL}/sapta-mathruka`,
    type: 'website',
  },
};

export default function SaptaMathrukaIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sapta Matrika — 7 mother goddesses',
    numberOfItems: SAPTA_MATHRUKA.length,
    itemListElement: SAPTA_MATHRUKA.map((m) => ({
      '@type': 'ListItem',
      position: m.number,
      url: `${BASE_URL}/sapta-mathruka/${m.slug}`,
      name: `${m.number}. ${m.name} — Shakti of ${m.consortDeity}`,
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Sapta Matrika', item: `${BASE_URL}/sapta-mathruka` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-rose-700">7 Mother Goddesses · Devi Mahatmya</p>
        <h1 className={`${H1.catalogue} mt-1`}>Sapta Matrika</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">सप्त मातृका</p>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          When the gods could not slay Raktabija — every drop of whose blood spawned a new demon — they each emitted
          their shakti as a mother form. Together the seven drank the demon&apos;s blood from mid-air, ending his
          multiplication. From Brahmani (wisdom) to Chamunda (death of fear), they form the complete Tantric
          mother-grid.
        </p>
        <p className="mt-3 max-w-2xl prose-meta text-gray-600">
          See also <Link href="/ashta-lakshmi" className="text-rose-700 underline">8 Ashta Lakshmi</Link>,{' '}
          <Link href="/shakti-peeth" className="text-rose-700 underline">51 Shakti Peeth</Link> and{' '}
          <Link href="/nava-graha" className="text-rose-700 underline">Nava Graha</Link>.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {SAPTA_MATHRUKA.map((m) => (
          <Link
            key={m.slug}
            href={`/sapta-mathruka/${m.slug}`}
            className="block rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/60 to-pink-50/40 p-5 transition hover:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                <span className="mr-2 inline-block rounded bg-rose-700 px-1.5 py-0.5 text-xs font-bold text-white">{m.number}</span>
                {m.name}
              </h2>
              <span className="font-serif text-sm text-gray-700">{m.sanskrit}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-rose-900">
              Shakti of: <span className="font-normal text-gray-700">{m.consortDeity}</span>
            </p>
            <p className="mt-2 text-sm text-gray-700">{m.emergedFrom}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-pink-900">Vahana: {m.vahana.split(' ')[0]}</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-900">Color: {m.color.split(' ')[0]}</span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-900">{m.bestDay}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900">The Raktabija episode</h2>
        <p className="mt-2 text-sm text-gray-700">
          In Devi Mahatmya Chapter 8, the demon Raktabija received a boon that every drop of his blood spilling on
          earth would spawn an identical copy. Faced with multiplying demons, Devi summoned the Saptamatrika — the
          shaktis of Brahma, Vishnu, Shiva, Indra, Skanda, Varaha and Devi herself (as Chamunda). They drank his
          blood from mid-air before it could touch ground, allowing Devi to finally slay him. The episode is
          recited during Navaratri Day 7 (Saptami). See{' '}
          <Link href="/calendar" className="text-rose-700 underline">Navratri 2026 dates</Link> and{' '}
          <Link href="/chants" className="text-rose-700 underline">Devi mantras</Link>.
        </p>
      </section>
    </main>
  );
}
