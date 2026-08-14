import type { Metadata } from 'next';
import Link from 'next/link';
import { DWADASHA_ADITYAS } from '../../lib/dwadasha-aditya';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Dwadasha Aditya — 12 Forms of Surya (Names, Mantras, Months)',
  description:
    'All 12 Adityas (sons of Aditi) per Bhagavata Purana — Vivasvan, Aryaman, Pushan, Tvashta, Savitar, Bhaga, Dhata, Vidhata, Varuna, Mitra, Indra, Trivikrama. Each presides over one solar month with unique mantra, ratna, vahana and Surya Namaskar invocation.',
  alternates: { canonical: `${BASE_URL}/aditya` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Dwadasha Aditya — 12 forms of Surya',
    description: 'Names, mantras, presiding months and Surya Namaskar invocations for all 12 Adityas.',
    url: `${BASE_URL}/aditya`,
    type: 'website',
  },
};

export default function AdityaIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Dwadasha Aditya — 12 forms of Surya',
    numberOfItems: DWADASHA_ADITYAS.length,
    itemListElement: DWADASHA_ADITYAS.map((a) => ({
      '@type': 'ListItem',
      position: a.number,
      url: `${BASE_URL}/aditya/${a.slug}`,
      name: `${a.number}. ${a.name} — ${a.presidingMonth}`,
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Dwadasha Aditya', item: `${BASE_URL}/aditya` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-amber-700">12 Sons of Aditi · 12 Solar months</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">Dwadasha Aditya</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">द्वादश आदित्य</p>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Surya manifests in 12 forms — each presiding over one solar month of the Vedic year. The 12 Surya Namaskar
          mantras (Mitraya, Ravaye, Suryaya…) invoke these Adityas. From Vivasvan (father of dharma) to Trivikrama
          (Vishnu&apos;s solar form), they form the complete solar grid of Sanatana Dharma.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-gray-600">
          See also <Link href="/nava-graha" className="text-amber-700 underline">Nava Graha</Link>,{' '}
          <Link href="/ashta-lakshmi" className="text-amber-700 underline">Ashta Lakshmi</Link> and{' '}
          <Link href="/dashavatar" className="text-amber-700 underline">Dashavatar of Vishnu</Link>.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {DWADASHA_ADITYAS.map((a) => (
          <Link
            key={a.slug}
            href={`/aditya/${a.slug}`}
            className="block rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-yellow-50/40 p-5 transition hover:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                <span className="mr-2 inline-block rounded bg-amber-600 px-1.5 py-0.5 text-xs font-bold text-white">{a.number}</span>
                {a.name}
              </h2>
              <span className="font-serif text-sm text-gray-700">{a.sanskrit}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-amber-900">
              Month: <span className="font-normal text-gray-700">{a.presidingMonth}</span>
            </p>
            <p className="mt-2 text-sm text-gray-700">{a.domain}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-900">Ratna: {a.ratna.split(' ')[0]}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">{a.qualityOfLight.split(' — ')[0]}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900">The 12 Surya Namaskar mantras</h2>
        <p className="mt-2 text-sm text-gray-700">
          Each round of Surya Namaskar invokes one Aditya: Mitraya, Ravaye, Suryaya, Bhanave, Khagaya, Pushne,
          Hiranyagarbhaya, Marichaye, Adityaya, Savitre, Arkaya, Bhaskaraya. Practitioners complete 12 rounds at sunrise
          for full solar circuit. See <Link href="/wellness/yoga" className="text-amber-700 underline">yoga practice guides</Link> and{' '}
          <Link href="/sankalp" className="text-amber-700 underline">Vedic sankalp generator</Link> for ritual setup.
        </p>
      </section>
    </main>
  );
}
