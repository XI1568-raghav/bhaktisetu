import type { Metadata } from 'next';
import Link from 'next/link';
import { VEDIC_MONTHS } from '../../lib/vedic-months';

export const runtime = 'edge';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: '12 Vedic Months (Masa) — Hindu Lunar Calendar | Darshya',
  description:
    'All 12 Vedic months from Chaitra through Phalguna — Gregorian range, ritu (season), presiding Aditya, major festivals, vrata practices, and ritual character of each month.',
  alternates: { canonical: 'https://darshya.online/masa' },
};

const RITU_COLOR: Record<string, string> = {
  Spring: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Summer: 'bg-amber-100 text-amber-900 border-amber-300',
  'Monsoon (early)': 'bg-cyan-100 text-cyan-900 border-cyan-300',
  Monsoon: 'bg-cyan-100 text-cyan-900 border-cyan-300',
  'Monsoon (late)': 'bg-cyan-100 text-cyan-900 border-cyan-300',
  Autumn: 'bg-orange-100 text-orange-900 border-orange-300',
  'Early winter': 'bg-indigo-100 text-indigo-900 border-indigo-300',
  Winter: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  'Spring (transition)': 'bg-emerald-100 text-emerald-900 border-emerald-300',
};

export default function MasaIndexPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '12 Vedic Months (Masa)',
    itemListElement: VEDIC_MONTHS.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/masa/${m.slug}`,
      name: m.name,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Vedic Months', item: 'https://darshya.online/masa' },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-saffron-50 via-white to-amber-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> / <span className="text-gray-900">Vedic Months</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">12 Vedic Months — Masa</h1>
        <p className="text-lg text-gray-700 max-w-3xl">
          The Hindu lunar year has 12 masa (months) from Chaitra (March–April) through Phalguna (February–March). Each is
          presided by one of the 12 Adityas, belongs to a ritu (season), and carries its own festival cycle, vrata calendar,
          and ritual character. The masa system anchors every Hindu festival, fast, and muhurat.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VEDIC_MONTHS.map((m) => (
            <Link
              key={m.slug}
              href={`/masa/${m.slug}`}
              className="block rounded-xl border border-saffron-200 bg-white p-5 hover:border-saffron-400 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-2xl font-bold text-saffron-900">{m.name}</div>
                  <div className="text-lg text-gray-700">{m.sanskrit}</div>
                </div>
                <span className="text-xs text-saffron-600 font-semibold">#{m.number}</span>
              </div>
              <div className="text-xs text-gray-600 mb-2">{m.gregorianRange}</div>
              <div className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Aditya:</span> {m.presidingAditya}
              </div>
              <span className={`inline-block text-xs px-2 py-1 rounded border ${RITU_COLOR[m.ritu] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                {m.ritu}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl bg-white border border-saffron-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">How the Hindu lunar year works</h2>
          <p className="text-gray-700 mb-3">
            Each masa has two pakshas (fortnights) — shukla paksha (waxing moon, 15 days) and krishna paksha (waning moon, 15 days).
            A masa runs from one new moon to the next (amanta system, used in South + West India) or one full moon to the next
            (purnimanta system, used in North India). Every ~3 years an extra adhik masa (intercalary month) is inserted to keep
            the lunar year aligned with the solar year.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/tithi" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              30 Tithis
            </Link>
            <Link href="/aditya" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
              12 Adityas
            </Link>
            <Link href="/calendar" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
              Festival calendar
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
