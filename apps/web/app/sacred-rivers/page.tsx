import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { SACRED_RIVERS } from '../../lib/sacred-rivers';
import { formatNumber } from '../../lib/format-locale';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '10 Sacred Rivers of Bharat — Sapta Sindhu Complete Guide',
  description:
    'Origins, mouths, sacred ghats and legends of Ganga, Yamuna, Saraswati, Narmada, Godavari, Kaveri, Sindhu, Brahmaputra, Krishna and Tapti — the rivers worshipped as goddesses across Sanatana Dharma.',
  alternates: { canonical: `${BASE_URL}/sacred-rivers` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Sacred Rivers of Bharat — Sapta Sindhu',
    description:
      'Deep guides to the ten rivers worshipped as living goddesses — their Vedic origins, sacred ghats, presiding goddesses, and the tirthas on their banks.',
    url: `${BASE_URL}/sacred-rivers`,
    type: 'website',
  },
};

export default function SacredRiversIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sacred Rivers of Bharat',
    numberOfItems: SACRED_RIVERS.length,
    itemListElement: SACRED_RIVERS.map((r, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${BASE_URL}/sacred-rivers/${r.slug}`,
      name: r.name,
    })),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">10 rivers · Sapta Sindhu + 3 canonical</p>
        <h1 className={`${H1.catalogue} mt-1`}>Sacred Rivers of Bharat</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Every river in Sanatana Dharma is worshipped as a living goddess — origin glaciers, sacred ghats,
          presiding deities and the legends that turn flowing water into amrit. From Ganga’s descent through Shiva’s
          jata to the underground Saraswati at Triveni Sangam.
        </p>
      </header>

      <section className="mb-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {SACRED_RIVERS.map((r) => (
            <Link
              key={r.slug}
              href={`/sacred-rivers/${r.slug}`}
              className="block rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 transition hover:shadow-md"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">{r.name}</h2>
                <span className="font-serif text-sm text-gray-600">{r.sanskrit}</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-indigo-700">
                Origin · {r.origin.split(',')[0]?.trim()}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-gray-700">{r.spiritualSignificance}</p>
              <div className="mt-3 flex flex-wrap gap-1 text-xs font-medium uppercase tracking-wide">
                {r.states.slice(0, 4).map((s) => (
                  <span key={s} className="rounded bg-saffron-100 px-2 py-0.5 text-saffron-800">{s}</span>
                ))}
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">{formatNumber(r.length)} km</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related pilgrimage surfaces</h2>
        <p className="mt-2 text-sm text-gray-700">
          For destination guides on the tirthas that line these rivers, see{' '}
          <Link href="/tirth" className="text-saffron-700 underline">42 sacred tirthas</Link>. For multi-river circuits,
          see <Link href="/pilgrimage" className="text-saffron-700 underline">Char Dham &amp; Panch Prayag</Link>.
        </p>
      </section>
    </main>
  );
}
