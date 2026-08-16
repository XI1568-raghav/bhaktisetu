import type { Metadata } from 'next';
import Link from 'next/link';
import { SACRED_MOUNTAINS } from '../../lib/sacred-mountains';
import { formatNumber } from '../../lib/format-locale';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '10 Sacred Mountains of Hindu Tradition — Pilgrim & Cosmology Guide',
  description:
    'Mount Kailash, Govardhan, Arunachala, Tirumala Seven Hills, Vindhya, Nilgiri, Mahendragiri, Palani Hills, Parashuram Kund, and cosmic Mount Meru — height, legends, pilgrim parikrama routes, best seasons, and modern access for India\'s most sacred peaks.',
  alternates: { canonical: `${BASE_URL}/sacred-mountains` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: '10 Sacred Mountains of Hindu Tradition',
    description:
      'Deep guide to Hindu sacred peaks — Kailash, Govardhan, Arunachala, Tirumala, Meru — with parikrama routes, legends, and pilgrim access.',
    url: `${BASE_URL}/sacred-mountains`,
    type: 'website',
  },
};

const ACCESS_LABEL: Record<string, { label: string; cls: string }> = {
  vehicle: { label: 'Vehicle access', cls: 'bg-emerald-100 text-emerald-800' },
  trek: { label: 'Trek required', cls: 'bg-amber-100 text-amber-800' },
  'spiritual-only': { label: 'Spiritual / parikrama only', cls: 'bg-indigo-100 text-indigo-800' },
};

export default function SacredMountainsIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sacred Mountains of Hindu Tradition',
    numberOfItems: SACRED_MOUNTAINS.length,
    itemListElement: SACRED_MOUNTAINS.map((m, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${BASE_URL}/sacred-mountains/${m.slug}`,
      name: m.name,
    })),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">
          10 sacred peaks · cosmology + geography
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">
          Sacred Mountains of Hindu Tradition
        </h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          From the eternal abode of Shiva at Kailash to the cosmic axis of Mount Meru — guides
          to each sacred peak with parikrama routes, summit temples, legends from the Puranas,
          and modern access notes. Distinct from{' '}
          <Link href="/tirth" className="text-saffron-700 underline">single-destination tirthas</Link>{' '}
          and{' '}
          <Link href="/pilgrimage" className="text-saffron-700 underline">multi-stop circuits</Link>.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {SACRED_MOUNTAINS.map((m) => {
          const access = ACCESS_LABEL[m.modernAccess] ?? { label: '', cls: '' };
          return (
            <Link
              key={m.slug}
              href={`/sacred-mountains/${m.slug}`}
              className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">{m.name}</h2>
                <span className="font-serif text-sm text-gray-600">{m.sanskrit}</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {m.location.split(',')[0]} ·{' '}
                {m.height !== null ? `${formatNumber(m.height)} m` : 'cosmic / non-geographic'}
              </p>
              <p className="mt-3 line-clamp-3 text-sm text-gray-700">{m.significance}</p>
              <div className="mt-3 flex flex-wrap gap-1 text-xs font-medium uppercase tracking-wide">
                <span className={`rounded px-2 py-0.5 ${access.cls}`}>{access.label}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                  {m.associatedDeity.split('(')[0]?.trim()}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related guides</h2>
        <p className="mt-2 text-sm text-gray-700">
          For temples at the foot of these peaks, see{' '}
          <Link href="/tirth" className="text-saffron-700 underline">sacred tirthas</Link>. For the
          12 jyotirlinga abodes of Shiva (several on mountains), see{' '}
          <Link href="/jyotirlinga" className="text-saffron-700 underline">12 jyotirlingas</Link>.
          For multi-mountain pilgrim circuits like Panch Kedar, see{' '}
          <Link href="/pilgrimage" className="text-saffron-700 underline">pilgrimage circuits</Link>.
        </p>
      </section>
    </main>
  );
}
