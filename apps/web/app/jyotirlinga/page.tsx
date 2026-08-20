import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { JYOTIRLINGAS } from '../../lib/jyotirlingas';

// CI-12: the page used to assert that all twelve are swayambhu directly above a
// grid that badges nine. Somnath, Kashi Vishwanath and Rameshwar carry
// `swayambhu: false`. Both numbers are now read off the data.
const SWAYAMBHU = JYOTIRLINGAS.filter((j) => j.swayambhu);
const NOT_SWAYAMBHU = JYOTIRLINGAS.filter((j) => !j.swayambhu);

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '12 Jyotirlinga of Lord Shiva — Canonical Order, Darshan Booking, Bhasma Aarti',
  description:
    'All 12 Jyotirlinga in canonical order: Somnath, Mallikarjuna, Mahakaleshwar, Omkareshwar, Kedarnath, Bhimashankar, Kashi Vishwanath, Trimbakeshwar, Vaidyanath, Nageshwar, Rameshwar, Grishneshwar. Timings, signature rituals (Bhasma Aarti, Sphatika Linga), how to reach, online darshan booking.',
  alternates: { canonical: `${BASE_URL}/jyotirlinga` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: '12 Jyotirlinga of Lord Shiva — complete pilgrim guide',
    description: 'Canonical order with darshan timings, signature rituals (Bhasma Aarti, Sphatika Linga), abhishekam fees, and online booking for each Jyotirlinga.',
    url: `${BASE_URL}/jyotirlinga`,
    type: 'website',
  },
};

export default function JyotirlingaIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '12 Jyotirlinga of Lord Shiva',
    numberOfItems: JYOTIRLINGAS.length,
    itemListElement: JYOTIRLINGAS.map((j) => ({
      '@type': 'ListItem',
      position: j.number,
      url: `${BASE_URL}/jyotirlinga/${j.slug}`,
      name: `${j.number}. ${j.name} (${j.state})`,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: '12 Jyotirlinga', item: `${BASE_URL}/jyotirlinga` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">{JYOTIRLINGAS.length} abodes of Shiva across 8 states</p>
        <h1 className={`${H1.catalogue} mt-1`}>The 12 Jyotirlinga</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Canonical Shiva Purana order across 8 states — each a site where the cosmic pillar of
          light is said to have emerged. {SWAYAMBHU.length} of the {JYOTIRLINGAS.length} are
          worshipped as swayambhu (self-manifest); at {NOT_SWAYAMBHU.map((j) => j.name).join(', ')}{' '}
          the linga was installed. Bhasma Aarti at Mahakal, Sphatika Linga at Rameshwar,
          22 Theerthams, Kanwar Yatra at Vaidyanath — found nowhere else.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-gray-600">
          For broader pilgrim destinations including Vaishnava + Shakti sites, see{' '}
          <Link href="/tirth" className="text-saffron-700 underline">the Sacred Tirthas guide</Link>.
          For multi-destination journeys see{' '}
          <Link href="/pilgrimage/12-jyotirlinga" className="text-saffron-700 underline">the 12 Jyotirlinga circuit</Link>.
        </p>
      </header>

      <section className="mb-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {JYOTIRLINGAS.map((j) => (
            <Link
              key={j.slug}
              href={`/jyotirlinga/${j.slug}`}
              className="block rounded-2xl border border-amber-200 bg-amber-50/40 p-5 transition hover:shadow-md"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  <span className="mr-2 inline-block rounded bg-saffron-600 px-1.5 py-0.5 text-xs font-bold text-white">{j.number}</span>
                  {j.name}
                </h3>
                <span className="font-serif text-sm text-gray-600">{j.sanskrit}</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">{j.state} · {j.city}</p>
              <p className="mt-3 line-clamp-3 text-sm text-gray-700">{j.significance}</p>
              <div className="mt-3 flex flex-wrap gap-1 text-xs font-medium uppercase tracking-wide">
                {j.swayambhu && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Swayambhu</span>}
                {j.dakshinmukhi && <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">Dakshinmukhi</span>}
                {j.onlineBookingAvailable && <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">Online booking</span>}
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">{j.bestSeason.split('(')[0]?.trim()}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Plan your darshan</h2>
        <p className="mt-2 text-sm text-gray-700">
          For day-trip city visits see <Link href="/city" className="text-saffron-700 underline">25 sacred cities</Link>.
          For festival timing see <Link href="/calendar" className="text-saffron-700 underline">Hindu festival calendar 2026</Link>.
          For online puja from anywhere see <Link href="/pujas" className="text-saffron-700 underline">all live puja services</Link>.
        </p>
      </section>
    </main>
  );
}
