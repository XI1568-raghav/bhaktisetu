import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSacredRiver, SACRED_RIVERS, sacredRiverSlugs } from '../../../lib/sacred-rivers';
import { getTirtha } from '../../../lib/tirthas';
import { formatNumber } from '../../../lib/format-locale';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getSacredRiver(slug);
  if (!r) return { title: 'Not found' };
  return {
    title: `${r.name} — Sacred River Guide: Origin, Ghats, Legends`,
    description: `${r.name}: origin at ${r.origin.split(',')[0]}, flows through ${r.states.slice(0, 3).join(', ')}. ${r.spiritualSignificance.slice(0, 110)}…`,
    alternates: { canonical: `${BASE_URL}/sacred-rivers/${r.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${r.name} — Sacred River of Bharat`,
      description: r.spiritualSignificance,
      url: `${BASE_URL}/sacred-rivers/${r.slug}`,
      type: 'article',
    },
  };
}

export default async function SacredRiverPage({ params }: Props) {
  const { slug } = await params;
  const r = getSacredRiver(slug);
  if (!r) notFound();

  const slugs = sacredRiverSlugs();
  const idx = slugs.findIndex((s) => s === slug);
  const prevSlug = slugs[(idx - 1 + slugs.length) % slugs.length];
  const nextSlug = slugs[(idx + 1) % slugs.length];
  const prev = getSacredRiver(prevSlug ?? '');
  const next = getSacredRiver(nextSlug ?? '');

  const relatedTirthas = r.majorTirthas
    .map((s) => getTirtha(s))
    .filter((t): t is NonNullable<ReturnType<typeof getTirtha>> => Boolean(t));

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Sacred Rivers', item: `${BASE_URL}/sacred-rivers` },
      { '@type': 'ListItem', position: 3, name: r.name, item: `${BASE_URL}/sacred-rivers/${r.slug}` },
    ],
  };
  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: r.name,
    description: r.spiritualSignificance,
    address: { '@type': 'PostalAddress', addressRegion: r.states[0], addressCountry: 'IN' },
  };
  const river = {
    '@context': 'https://schema.org',
    '@type': 'RiverBodyOfWater',
    name: r.name,
    alternateName: r.sanskrit,
    description: r.legend,
    geo: { '@type': 'GeoCoordinates', address: r.origin },
    containedInPlace: r.states.map((s) => ({ '@type': 'AdministrativeArea', name: s })),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, place, river]) }}
      />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/sacred-rivers" className="hover:underline">Sacred Rivers</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{r.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">Sacred river · {r.states.join(' · ')}</p>
        <h1 className={`${H1.catalogue} mt-1`}>{r.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{r.sanskrit}</p>
        <p className="mt-3 text-base text-gray-700">
          <strong>Presiding goddess:</strong>{' '}
          {r.goddessSlug ? (
            <Link href={`/deity/${r.goddessSlug}`} className="text-saffron-700 underline">{r.goddessName}</Link>
          ) : (
            <span>{r.goddessName}</span>
          )}
        </p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Origin</h2>
          <p className="mt-2 text-sm text-gray-800">{r.origin}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-800">Mouth</h2>
          <p className="mt-2 text-sm text-gray-800">{r.mouth}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Length</h2>
          <p className="mt-2 text-sm text-gray-800">{formatNumber(r.length)} km</p>
        </div>
        <div className="rounded-2xl border border-pink-200 bg-pink-50/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-pink-800">Best pilgrim season</h2>
          <p className="mt-2 text-sm text-gray-800">{r.bestPilgrimSeason}</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Sacred ghats</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {r.sacredGhats.map((g) => (
            <div key={g} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
              {g}
            </div>
          ))}
        </div>
      </section>

      {relatedTirthas.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Major tirthas on this river</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedTirthas.map((t) => (
              <Link
                key={t.slug}
                href={`/tirth/${t.slug}`}
                className="block rounded-xl border border-saffron-200 bg-saffron-50/40 p-4 transition hover:shadow"
              >
                <h3 className="text-sm font-semibold text-gray-900">{t.name}</h3>
                <p className="mt-1 text-xs text-gray-600">{t.state} · {t.presiding.split('(')[0]?.trim()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Legend &amp; origin story</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-800">{r.legend}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Spiritual significance</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-800">{r.spiritualSignificance}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Mentioned in</h2>
        <div className="flex flex-wrap gap-2">
          {r.mentionedIn.map((m) => (
            <span key={m} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{m}</span>
          ))}
        </div>
      </section>

      <nav className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/sacred-rivers/${prev.slug}`} className="text-saffron-700 hover:underline">
            ← {prev.name}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/sacred-rivers/${next.slug}`} className="text-saffron-700 hover:underline">
            {next.name} →
          </Link>
        ) : <span />}
      </nav>
    </main>
  );
}
