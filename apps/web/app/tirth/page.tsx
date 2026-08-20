import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { TIRTHAS, type TirthaCategory } from '../../lib/tirthas';
import { dedupeTirthas } from '../../lib/tirtha-slug';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

// CI-07: one card per temple. TIRTHAS carries twelve temples twice under two
// slugs each; the grid used to render both, so the same shrine appeared twice
// with different darshan timings behind each card.
const TIRTHA_CARDS = dedupeTirthas(TIRTHAS);

export const metadata: Metadata = {
  // CI-07: the page said "12 Most Sacred Tirthas" above a grid of eighty-odd.
  // The count now comes from the catalogue so the two cannot drift again.
  title: `${TIRTHA_CARDS.length} Sacred Tirthas of India — Complete Pilgrim Guide`,
  description:
    `Single-destination deep dive into ${TIRTHA_CARDS.length} tirthas — Kashi Vishwanath, Tirupati Balaji, Vaishno Devi, Somnath, Jagannath Puri, Amarnath, Rameswaram, Badrinath, Kedarnath, Dwarka, Mahakaleshwar, Ayodhya and more. Timings, darshan booking, how to reach, dress code, prasad.`,
  alternates: { canonical: `${BASE_URL}/tirth` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Sacred Tirthas of India — pilgrim guide',
    description: 'Deep guide to each major Hindu pilgrimage destination with darshan timings, how-to-reach, dress code, and recommended pujas.',
    url: `${BASE_URL}/tirth`,
    type: 'website',
  },
};

// Every category the catalogue actually uses gets a section. The list used to
// stop at shakti, which silently orphaned every jain / sikh / syncretic tirtha
// — they were prerendered and sitemapped but reachable from no index page.
const CATEGORIES: { key: TirthaCategory; title: string; color: string }[] = [
  { key: 'shaiva', title: 'Shaiva (Shiva-centric)', color: 'border-amber-300 bg-amber-50/40' },
  { key: 'vaishnava', title: 'Vaishnava (Vishnu-centric)', color: 'border-emerald-300 bg-emerald-50/40' },
  { key: 'shakti', title: 'Shakti (Goddess-centric)', color: 'border-pink-300 bg-pink-50/40' },
  { key: 'jain', title: 'Jain', color: 'border-sky-300 bg-sky-50/40' },
  { key: 'sikh', title: 'Sikh', color: 'border-indigo-300 bg-indigo-50/40' },
  { key: 'syncretic', title: 'Syncretic (shared traditions)', color: 'border-violet-300 bg-violet-50/40' },
];

export default function TirthIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sacred Tirthas of India',
    numberOfItems: TIRTHA_CARDS.length,
    itemListElement: TIRTHA_CARDS.map((t, idx) => ({
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
        <p className="text-xs uppercase tracking-wider text-saffron-600">{TIRTHA_CARDS.length} destinations · deep guide</p>
        <h1 className={`${H1.catalogue} mt-1`}>Sacred Tirthas of India</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Deep single-destination guides — darshan timings, how to reach, dress code, what to offer,
          nearby tirthas, and the legends behind each. Different from <Link href="/pilgrimage" className="text-saffron-700 underline">pilgrimage circuits</Link> (multi-destination journeys).
        </p>
      </header>

      {CATEGORIES.map((cat) => {
        const items = TIRTHA_CARDS.filter((t) => t.category === cat.key);
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
          For multi-destination circuits, see <Link href="/pilgrimage" className="text-saffron-700 underline">Char Dham, 12 Jyotirlinga, Shakti Peeth and the other circuits</Link>.
          For day-trip city visits, see <Link href="/city" className="text-saffron-700 underline">25 sacred cities</Link>.
        </p>
      </section>
    </main>
  );
}
