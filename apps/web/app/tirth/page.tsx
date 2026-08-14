import type { Metadata } from 'next';
import Link from 'next/link';
import { TIRTHAS, type TirthaCategory } from '../../lib/tirthas';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '12 Most Sacred Tirthas of India — Complete Pilgrim Guide',
  description:
    'Single-destination deep dive into Kashi Vishwanath, Tirupati Balaji, Vaishno Devi, Somnath, Jagannath Puri, Amarnath, Rameswaram, Badrinath, Kedarnath, Dwarka, Mahakaleshwar, Ayodhya. Timings, darshan booking, how to reach, dress code, prasad.',
  alternates: { canonical: `${BASE_URL}/tirth` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Sacred Tirthas of India — pilgrim guide',
    description: 'Deep guide to each major Hindu pilgrimage destination with darshan timings, how-to-reach, dress code, and recommended pujas.',
    url: `${BASE_URL}/tirth`,
    type: 'website',
  },
};

const CATEGORIES: { key: TirthaCategory; title: string; color: string }[] = [
  { key: 'shaiva', title: 'Shaiva (Shiva-centric)', color: 'border-amber-300 bg-amber-50/40' },
  { key: 'vaishnava', title: 'Vaishnava (Vishnu-centric)', color: 'border-emerald-300 bg-emerald-50/40' },
  { key: 'shakti', title: 'Shakti (Goddess-centric)', color: 'border-pink-300 bg-pink-50/40' },
];

export default function TirthIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sacred Tirthas of India',
    numberOfItems: TIRTHAS.length,
    itemListElement: TIRTHAS.map((t, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${BASE_URL}/tirth/${t.slug}`,
      name: t.name,
    })),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">12 destinations · deep guide</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">Sacred Tirthas of India</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Deep single-destination guides — darshan timings, how to reach, dress code, what to offer,
          nearby tirthas, and the legends behind each. Different from <Link href="/pilgrimage" className="text-saffron-700 underline">pilgrimage circuits</Link> (multi-destination journeys).
        </p>
      </header>

      {CATEGORIES.map((cat) => {
        const items = TIRTHAS.filter((t) => t.category === cat.key);
        if (items.length === 0) return null;
        return (
          <section key={cat.key} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{cat.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tirth/${t.slug}`}
                  className={`block rounded-2xl border p-5 transition hover:shadow-md ${cat.color}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{t.name}</h3>
                    <span className="font-serif text-sm text-gray-600">{t.sanskrit}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{t.state} · {t.presiding.split('(')[0]?.trim()}</p>
                  <p className="mt-3 line-clamp-3 text-sm text-gray-700">{t.significance}</p>
                  <div className="mt-3 flex flex-wrap gap-1 text-xs font-medium uppercase tracking-wide">
                    {t.onlineBookingAvailable && <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">Online booking</span>}
                    {t.vipDarshanAvailable && <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-800">VIP available</span>}
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">{t.bestSeason.split(';')[0]?.trim()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Plan your full pilgrimage</h2>
        <p className="mt-2 text-sm text-gray-700">
          For multi-destination circuits, see <Link href="/pilgrimage" className="text-saffron-700 underline">Char Dham, 12 Jyotirlinga, Shakti Peeth and 6 more circuits</Link>.
          For day-trip city visits, see <Link href="/city" className="text-saffron-700 underline">25 sacred cities</Link>.
        </p>
      </section>
    </main>
  );
}
