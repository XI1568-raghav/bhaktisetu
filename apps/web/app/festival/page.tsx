// Festival index — gateway to /festival/[slug] pages. Drives seasonal
// search traffic (Diwali / Holi / Navaratri queries spike hard).
import type { Metadata } from 'next';
import Link from 'next/link';
import { FESTIVALS, nextFestival } from '../../lib/festivals';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Hindu festival calendar 2026 — pujas, rituals, dates',
  description:
    'Complete Hindu festival calendar 2026: Maha Shivratri, Holi, Ram Navami, Diwali, Navaratri, Janmashtami, Ganesh Chaturthi. Book online pujas, rituals, fasting guide.',
  alternates: { canonical: 'https://darshya.online/festival' },
  openGraph: {
    title: 'Hindu festival calendar 2026',
    description: 'Dates, rituals, pujas — every major Sanatan festival.',
    url: 'https://darshya.online/festival',
    type: 'website',
    images: ['/og/default'],
  },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function FestivalIndex() {
  const upcoming = nextFestival();

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu festivals 2026',
    numberOfItems: FESTIVALS.length,
    itemListElement: FESTIVALS.map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: f.name,
      url: `https://darshya.online/festival/${f.slug}`,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Festivals</span>
      </nav>

      <header className="mb-10">
        <span className="inline-block px-2.5 py-0.5 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          📅 Tyohar Samay
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-3">
          Hindu festival calendar 2026
        </h1>
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          {FESTIVALS.length} major Sanatan festivals — dates, rituals, fasting
          rules, mantras and online puja booking. Plan your year, observe with
          shastric precision, wherever you are in the world.
        </p>
      </header>

      {upcoming ? (
        <section className="mb-10 rounded-xl border border-saffron-300 bg-saffron-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">
            Next festival
          </p>
          <h2 className="text-2xl font-bold text-surface-900 mb-1">
            {upcoming.name} <span className="text-base text-surface-500 font-serif ml-2">{upcoming.sanskrit}</span>
          </h2>
          <p className="text-sm text-surface-700 mb-3">
            {fmtDate(upcoming.date2026)} — {upcoming.deity}
          </p>
          <Link
            href={`/festival/${upcoming.slug}`}
            className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Plan {upcoming.name} →
          </Link>
        </section>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FESTIVALS.map((f) => (
          <Link
            key={f.slug}
            href={`/festival/${f.slug}`}
            className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-lg font-semibold text-surface-900">{f.name}</h2>
              <span className="text-xs text-surface-500 font-serif">{f.sanskrit}</span>
            </div>
            <p className="text-xs text-saffron-700 font-semibold mb-2">
              {fmtDate(f.date2026)} · {f.deity}
            </p>
            <p className="text-sm text-surface-700 leading-relaxed line-clamp-3">
              {f.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
