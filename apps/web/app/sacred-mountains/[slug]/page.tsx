import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSacredMountain, SACRED_MOUNTAINS } from '../../../lib/sacred-mountains';
import { formatNumber } from '../../../lib/format-locale';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = getSacredMountain(slug);
  if (!m) return { title: 'Not found' };
  const heightLabel = m.height !== null ? `${formatNumber(m.height)} m` : 'cosmic axis';
  return {
    title: `${m.name} (${m.sanskrit}) — Sacred Mountain Guide`,
    description: `${m.name}: ${heightLabel}, ${m.location}. Associated with ${m.associatedDeity}. ${m.significance.slice(0, 110)}…`,
    alternates: { canonical: `${BASE_URL}/sacred-mountains/${m.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${m.name} — Sacred Mountain`,
      description: m.significance,
      url: `${BASE_URL}/sacred-mountains/${m.slug}`,
      type: 'article',
    },
  };
}

const ACCESS_LABEL: Record<string, string> = {
  vehicle: 'Vehicle accessible (road / bus / cable-car)',
  trek: 'Trek required (foot pilgrimage)',
  'spiritual-only': 'Spiritual / parikrama only (not climbed)',
};

export default async function SacredMountainPage({ params }: Props) {
  const { slug } = await params;
  const m = getSacredMountain(slug);
  if (!m) notFound();

  const idx = SACRED_MOUNTAINS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? SACRED_MOUNTAINS[idx - 1] : undefined;
  const next = idx < SACRED_MOUNTAINS.length - 1 ? SACRED_MOUNTAINS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Sacred Mountains', item: `${BASE_URL}/sacred-mountains` },
      { '@type': 'ListItem', position: 3, name: m.name, item: `${BASE_URL}/sacred-mountains/${m.slug}` },
    ],
  };

  // schema.org/Mountain — valid Place subtype.
  const place: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Mountain',
    name: m.name,
    alternateName: m.sanskrit,
    description: m.significance,
    isAccessibleForFree: true,
  };
  if (m.height !== null) {
    place.elevation = `${m.height} m`;
  }
  if (m.slug !== 'mount-meru-cosmic') {
    place.address = { '@type': 'PostalAddress', addressLocality: m.location, addressCountry: m.slug === 'kailash' ? 'CN' : 'IN' };
  }

  const isCosmic = m.slug === 'mount-meru-cosmic';

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, place]) }}
      />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/sacred-mountains" className="hover:underline">Sacred Mountains</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{m.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">
          Sacred mountain · {isCosmic ? 'cosmological' : m.location.split(',').slice(-1)[0]?.trim()}
        </p>
        <h1 className={`${H1.catalogue} mt-1`}>{m.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{m.sanskrit}</p>
        {isCosmic && (
          <p className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900">
            <strong>Note:</strong> Cosmological description from the Puranas, not a single geographic peak.
          </p>
        )}
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Height</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {m.height !== null ? `${formatNumber(m.height)} m` : 'Cosmic / non-geographic'}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Location</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{m.location}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Associated deity</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{m.associatedDeity}</div>
          {m.deitySlug && (
            <Link href={`/deity/${m.deitySlug}`} className="mt-1 inline-block text-xs text-saffron-700 underline">
              View deity guide →
            </Link>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Significance</h2>
        <p className="text-base leading-relaxed text-gray-700">{m.significance}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Pilgrim route</h2>
        <p className="text-sm leading-relaxed text-gray-800">{m.pilgrimRoute}</p>
        <p className="mt-3 text-xs text-emerald-900">
          <strong>Best season:</strong> {m.bestSeason}
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-saffron-900">Legend</h2>
        <p className="text-sm leading-relaxed text-gray-800">{m.legend}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Modern access</h2>
        <p className="text-sm leading-relaxed text-gray-800">{ACCESS_LABEL[m.modernAccess]}</p>
        {m.templeAtSummit && (
          <p className="mt-3 text-xs text-indigo-900">
            <strong>Temple at summit:</strong> {m.templeAtSummit}
          </p>
        )}
      </section>

      {m.nearbyTirthas.length > 0 && (
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Nearby tirthas</h2>
          <ul className="grid list-disc gap-1 pl-5 text-sm text-gray-700 sm:grid-cols-2">
            {m.nearbyTirthas.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-600">
            See deep guides at <Link href="/tirth" className="text-saffron-700 underline">/tirth</Link>.
          </p>
        </section>
      )}

      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/sacred-mountains/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.name}</div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link href={`/sacred-mountains/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.name}</div>
          </Link>
        ) : (
          <div />
        )}
      </nav>
      {detailCta({
        routePrefix: 'sacred-mountains',
        subject: m.name,
      })}
    </main>
  );
}
