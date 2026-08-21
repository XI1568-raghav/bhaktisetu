import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  CIRCUITS,
  CIRCUIT_ALIASES,
  canonicalCircuitSlug,
  getCircuit,
  circuitSlugs,
} from '../../../lib/pilgrimage-circuits';
import { getTempleDetail } from '../../../lib/temple-details';
import { canonicalTempleSlug } from '../../../lib/temple-slug';

export const revalidate = 86400;

/**
 * CI-16 — a stop is a link only when /temples/<slug> actually renders.
 *
 * The route used to emit `<Link href={`/temples/${s.templeSlug}`}>` for every
 * stop that carried a templeSlug, unchecked. Five of the sixteen distinct
 * slugs named no curated temple, so five stop names looked clickable and went
 * to a 404. Gating on the resolver rather than on a hand-kept deny-list means
 * this cannot rot back open as the temple catalogue changes.
 */
function templeHref(templeSlug: string | undefined): string | null {
  if (!templeSlug) return null;
  const canonical = canonicalTempleSlug(templeSlug);
  return getTempleDetail(canonical) ? `/temples/${canonical}` : null;
}

// CI-10: the retired circuit slugs stay in the prerender set so that the URLs
// they were indexed at 308 onto the survivor instead of 404ing. circuitSlugs()
// stays canonical-only — app/sitemap.ts builds from it and a sitemap must not
// advertise a redirect.
export async function generateStaticParams() {
  return [...circuitSlugs(), ...Object.keys(CIRCUIT_ALIASES)].map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const c = getCircuit(canonicalCircuitSlug(slug));
  if (!c) return { title: 'Pilgrimage circuit not found' };
  return {
    title: `${c.name} — ${c.stops.length}-temple circuit, ${c.totalDays.min}-${c.totalDays.max} days`,
    description: c.shortDesc,
    alternates: { canonical: `https://darshya.online/pilgrimage/${c.slug}` },
    openGraph: {
      title: `${c.name} — Hindu Pilgrimage`,
      description: c.shortDesc,
      url: `https://darshya.online/pilgrimage/${c.slug}`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default async function CircuitDetail({ params }: PageProps) {
  const { slug } = await params;
  // CI-10: one circuit, one URL. A retired slug redirects onto the survivor
  // rather than serving a second copy of the same itinerary.
  const canonical = canonicalCircuitSlug(slug);
  if (canonical !== slug) permanentRedirect(`/pilgrimage/${canonical}`);
  const c = getCircuit(canonical);
  if (!c) notFound();

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Pilgrimage', item: 'https://darshya.online/pilgrimage' },
      { '@type': 'ListItem', position: 3, name: c.name, item: `https://darshya.online/pilgrimage/${c.slug}` },
    ],
  };

  const tripJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: c.name,
    description: c.longDesc.slice(0, 300),
    touristType: 'Religious pilgrim',
    itinerary: c.stops.map((s, i) => ({
      '@type': 'TouristAttraction',
      position: i + 1,
      name: s.name,
      address: { '@type': 'PostalAddress', addressRegion: s.state, addressCountry: 'IN' },
    })),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: c.startingFromInr,
      availability: 'https://schema.org/InStock',
    },
  };

  const related = CIRCUITS.filter((x) => x.slug !== c.slug && x.region === c.region).slice(0, 3);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tripJsonLd) }} />

      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        {' › '}
        <Link href="/pilgrimage" className="hover:text-saffron-700">Pilgrimage</Link>
        {' › '}
        <span className="text-surface-800">{c.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2 leading-tight">{c.name}</h1>
        {c.sanskritName && (
          <p className="text-lg text-saffron-700 mb-3" lang="sa">{c.sanskritName}</p>
        )}
        <div className="flex flex-wrap gap-2 text-sm mb-4">
          <span className="px-2.5 py-1 bg-surface-100 rounded font-medium text-surface-800">{c.stops.length} temples</span>
          <span className="px-2.5 py-1 bg-surface-100 rounded font-medium text-surface-800">{c.totalDays.min}-{c.totalDays.max} days</span>
          <span className="px-2.5 py-1 bg-saffron-100 rounded font-medium text-saffron-800">Starting {formatInr(c.startingFromInr)}</span>
          <span className={`px-2.5 py-1 rounded font-medium ${
            c.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' :
            c.difficulty === 'moderate' ? 'bg-amber-100 text-amber-800' :
            'bg-rose-100 text-rose-800'
          }`}>{c.difficulty}</span>
          <span className="px-2.5 py-1 bg-blue-50 rounded font-medium text-blue-800">Best: {c.bestSeason}</span>
        </div>
        <p className="text-surface-700 text-base leading-relaxed">{c.shortDesc}</p>
      </header>

      <section className="prose prose-sm max-w-none mb-10 text-surface-800 leading-relaxed">
        <p>{c.longDesc}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">Stops in this circuit</h2>
        <ol className="space-y-3">
          {c.stops.map((s, i) => {
            const href = templeHref(s.templeSlug);
            return (
            <li key={s.name} className="flex gap-4 p-4 rounded-lg border border-surface-200 bg-white">
              <span className="shrink-0 w-8 h-8 rounded-full bg-saffron-100 text-saffron-800 font-bold text-sm flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h3 className="text-lg font-semibold text-surface-900">
                    {href ? (
                      <Link href={href} className="hover:text-saffron-700 hover:underline">{s.name}</Link>
                    ) : s.name}
                  </h3>
                  <span className="text-xs text-surface-500">{s.bestMonths}</span>
                </div>
                <p className="text-sm text-surface-700 mt-1">{s.deity} · {s.state}</p>
              </div>
            </li>
            );
          })}
        </ol>
      </section>

      <section className="mb-10 p-5 rounded-xl bg-saffron-50 border border-saffron-200">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Spiritual significance</h2>
        <p className="text-surface-800 text-sm leading-relaxed">{c.spiritualSignificance}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">Practical tips</h2>
        <ul className="space-y-2">
          {c.practicalTips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm text-surface-800 leading-relaxed">
              <span className="text-saffron-600 shrink-0">✓</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center mb-8">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Ready to plan your {c.name}?</h2>
        <p className="text-surface-700 text-sm mb-4 max-w-xl mx-auto">
          Get a customized itinerary from our yatra desk — hotels, transport, and
          temple coordination handled. Starting {formatInr(c.startingFromInr)}.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {c.relatedYatra && (
            <Link
              href={`/yatra/${c.relatedYatra}/book`}
              className="px-5 py-2.5 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
            >
              Request booking →
            </Link>
          )}
          <Link
            href="/yatra"
            className="px-5 py-2.5 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Browse all packages
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-surface-200 pt-6">
          <h2 className="text-lg font-bold text-surface-900 mb-3">Related circuits ({c.region})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/pilgrimage/${r.slug}`}
                className="block rounded-lg border border-surface-200 bg-white p-3 hover:border-saffron-300 transition"
              >
                <h3 className="text-sm font-semibold text-surface-900">{r.name}</h3>
                <p className="text-xs text-surface-600 mt-1">{r.totalDays.min}-{r.totalDays.max} days · {formatInr(r.startingFromInr)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
