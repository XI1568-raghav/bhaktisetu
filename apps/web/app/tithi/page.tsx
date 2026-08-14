import type { Metadata } from 'next';
import Link from 'next/link';
import { TITHIS } from '../../lib/tithis';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: '30 Tithis — Lunar Days of the Hindu Calendar',
  description:
    'All 30 tithis of the lunar month — Pratipada through Chaturdashi (×2 pakshas), plus Purnima and Amavasya. Presiding deity, fasting tradition, major festivals and beej mantra per tithi.',
  alternates: { canonical: 'https://darshya.online/tithi' },
};

const CATEGORY_COLOR: Record<string, string> = {
  nanda: 'bg-rose-100 text-rose-900 border-rose-300',
  bhadra: 'bg-amber-100 text-amber-900 border-amber-300',
  jaya: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  rikta: 'bg-slate-100 text-slate-700 border-slate-300',
  purna: 'bg-indigo-100 text-indigo-900 border-indigo-300',
};

const CATEGORY_MEANING: Record<string, string> = {
  nanda: 'Joyful — happiness, beginnings',
  bhadra: 'Auspicious — prosperity, stability',
  jaya: 'Victorious — triumph, conquest',
  rikta: 'Empty — losses, avoid major work',
  purna: 'Full — completion, climax',
};

export default function TithiIndexPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '30 Tithis of the Hindu Lunar Calendar',
    itemListElement: TITHIS.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/tithi/${t.slug}`,
      name: t.name,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Tithis', item: 'https://darshya.online/tithi' },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-indigo-50 via-white to-violet-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> / <span className="text-gray-900">Tithis</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">30 Tithis — Lunar Days</h1>
        <p className="text-lg text-gray-700 max-w-3xl">
          The Hindu lunar month has 30 tithis — 15 in the waxing fortnight (shukla paksha) and 15 in the waning fortnight (krishna paksha).
          Each tithi has a presiding deity, ritual character, and recommended activities. Vrata (fasts), muhurat (auspicious timings),
          and most festivals are scheduled by tithi rather than the solar date.
        </p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(CATEGORY_MEANING).map(([cat, meaning]) => (
            <div key={cat} className={`rounded-lg border px-3 py-2 text-xs ${CATEGORY_COLOR[cat]}`}>
              <div className="font-semibold capitalize">{cat}</div>
              <div className="opacity-80">{meaning}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TITHIS.map((t) => (
            <Link
              key={t.slug}
              href={`/tithi/${t.slug}`}
              className="block rounded-xl border border-indigo-200 bg-white p-5 hover:border-indigo-400 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-2xl font-bold text-indigo-900">{t.name}</div>
                  <div className="text-lg text-gray-700">{t.sanskrit}</div>
                </div>
                <span className="text-xs text-indigo-600 font-semibold">#{t.number}</span>
              </div>
              <div className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Deity:</span> {t.presidingDeity}
              </div>
              <span className={`inline-block text-xs px-2 py-1 rounded border ${CATEGORY_COLOR[t.category]}`}>
                {t.category}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl bg-white border border-indigo-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ekadashi, Pradosh, Chaturthi — twice-monthly cycles</h2>
          <p className="text-gray-700 mb-4">
            Three tithi-based vratas occur twice every lunar month — once in shukla paksha and once in krishna paksha. Ekadashi (11th)
            is the most observed Vaishnava fast. Pradosh (13th evening) is sacred to Shiva. Sankashti Chaturthi (4th) is Ganesha&apos;s vrata.
            See the full schedule on the Hindu festival calendar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/vrat" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              Browse vrata traditions
            </Link>
            <Link href="/calendar" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
              Hindu festival calendar
            </Link>
            <Link href="/chants" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              Tithi mantras
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
