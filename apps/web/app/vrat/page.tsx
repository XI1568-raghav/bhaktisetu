import type { Metadata } from 'next';
import Link from 'next/link';
import { VRATS, vratsByCategory } from '../../lib/vrats';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Hindu Vrats Guide — Ekadashi, Karva Chauth, Shivratri, Navratri Fasting',
  description:
    'Complete guide to 10 most-observed Hindu vrats — Ekadashi, Pradosh, Maha Shivratri, Karva Chauth, Navratri, Janmashtami, Ganesh Chaturthi, Satyanarayan, Hartalika Teej, Somvar. Fasting rules, rituals, mantras.',
  alternates: { canonical: `${BASE_URL}/vrat` },
  openGraph: {
    title: 'Hindu Vrats — Fasting Traditions Guide',
    description: 'Fasting rules, rituals, prasad, mantras for 10 major Hindu vrats.',
    url: `${BASE_URL}/vrat`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu Vrats',
    numberOfItems: VRATS.length,
    itemListElement: VRATS.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/vrat/${v.slug}`,
      name: v.name,
    })),
  };
}

const sections = [
  { key: 'lunar' as const, title: 'Lunar Vrats (Tithi-based)', desc: 'Tied to specific tithis of the lunar fortnight — observed monthly or fortnightly.' },
  { key: 'seasonal' as const, title: 'Festival & Seasonal Vrats', desc: 'Annual vrats tied to major festivals — Shivratri, Navratri, Janmashtami.' },
  { key: 'family' as const, title: 'Family & Saubhagya Vrats', desc: 'Observed for marital harmony, child welfare, family prosperity.' },
  { key: 'weekly' as const, title: 'Weekly Vrats (Vaar-based)', desc: 'Observed on a specific weekday for the ruling deity of that day.' },
];

const catColor: Record<string, string> = {
  lunar: 'border-indigo-300 bg-indigo-50',
  seasonal: 'border-emerald-300 bg-emerald-50',
  family: 'border-pink-300 bg-pink-50',
  weekly: 'border-saffron-300 bg-saffron-50',
};

export default function VratIndex() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd()) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          Hindu Fasting Traditions · Vrata
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-3 leading-tight">
          Vrats Guide
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          A vrat is a sacred vow — fasting paired with prayer, restraint, and devotion. Each
          tradition has specific rules, deities, mantras, and benefits. Done with shraddha
          (faith), vrats are said to fulfill desires, remove obstacles, and accelerate spiritual
          progress.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-saffron-200 bg-saffron-50 p-5 text-center">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Next vrat in calendar?</h2>
        <p className="text-surface-700 text-sm mb-3">
          See today&apos;s tithi, upcoming Ekadashi, and next festival on the daily devotion hub.
        </p>
        <Link
          href="/today"
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          Today&apos;s panchang →
        </Link>
      </section>

      {sections.map((sec) => {
        const items = vratsByCategory(sec.key);
        if (items.length === 0) return null;
        return (
          <section key={sec.key} className="mb-10">
            <h2 className="text-2xl font-bold text-surface-900 mb-1">{sec.title}</h2>
            <p className="text-sm text-surface-600 mb-4">{sec.desc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((v) => (
                <Link
                  key={v.slug}
                  href={`/vrat/${v.slug}`}
                  className={`group rounded-xl border p-5 hover:shadow-md transition ${catColor[v.category]}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                        {v.name}
                      </h3>
                      <div className="text-sm text-surface-600">{v.sanskritName}</div>
                    </div>
                  </div>
                  <p className="text-sm text-surface-700 leading-snug mb-3 line-clamp-3">{v.significance}</p>
                  <div className="text-xs text-surface-600">
                    <strong className="text-surface-800">Deity:</strong> {v.deity}
                    <span className="mx-2">·</span>
                    <strong className="text-surface-800">Frequency:</strong> {v.frequency.split('(')[0]?.trim() || v.frequency}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Need vrat udyapan or katha pandit?</h2>
        <p className="text-surface-700 text-sm mb-4">
          Many vrats culminate in a udyapan (concluding ceremony) with a pandit reading the katha.
          Book a verified pandit for in-person or remote katha + havan.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/ask-pandit"
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Book a pandit →
          </Link>
          <Link
            href="/pujas"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Browse pujas
          </Link>
        </div>
      </section>
    </main>
  );
}
