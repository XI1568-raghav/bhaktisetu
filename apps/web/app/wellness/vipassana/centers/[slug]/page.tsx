import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  VIPASSANA_CENTERS,
  centerSlugs,
  getCenter,
  LINEAGE_LABEL,
  REGION_LABEL,
} from '../../../../../lib/vipassana-centers';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return centerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const c = getCenter(slug);
  if (!c) return { title: 'Center not found' };
  return {
    title: `${c.name}, ${c.city} — Vipassana 10-Day Course`,
    description: `Apply for a 10-day Vipassana course at ${c.name} in ${c.city}, ${c.state}, ${c.country}. ${LINEAGE_LABEL[c.lineage]}. Donation-based, direct application via official center site.`,
    alternates: { canonical: `${BASE_URL}/wellness/vipassana/centers/${c.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${c.name} — Vipassana 10-day course`,
      description: `${c.city}, ${c.state}, ${c.country}. ${LINEAGE_LABEL[c.lineage]}. Donation-based.`,
      url: `${BASE_URL}/wellness/vipassana/centers/${c.slug}`,
      type: 'article',
    },
  };
}

export default async function VipassanaCenterDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const c = getCenter(slug);
  if (!c) notFound();

  const allInRegion = VIPASSANA_CENTERS.filter((x) => x.region === c.region && x.slug !== c.slug);
  const related = allInRegion.slice(0, 3);

  const index = VIPASSANA_CENTERS.findIndex((x) => x.slug === c.slug);
  const prev = index > 0 ? VIPASSANA_CENTERS[index - 1] : null;
  const next = index < VIPASSANA_CENTERS.length - 1 ? VIPASSANA_CENTERS[index + 1] : null;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Wellness', item: `${BASE_URL}/wellness` },
      { '@type': 'ListItem', position: 3, name: 'Vipassana', item: `${BASE_URL}/wellness/vipassana` },
      { '@type': 'ListItem', position: 4, name: 'Centers', item: `${BASE_URL}/wellness/vipassana/centers` },
      { '@type': 'ListItem', position: 5, name: c.name, item: `${BASE_URL}/wellness/vipassana/centers/${c.slug}` },
    ],
  };

  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: c.name,
    description: c.summary,
    url: `${BASE_URL}/wellness/vipassana/centers/${c.slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: c.city,
      addressRegion: c.state,
      addressCountry: c.country,
    },
  };

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${c.name} — Vipassana 10-day course in ${c.city}`,
    description: c.summary,
    mainEntityOfPage: `${BASE_URL}/wellness/vipassana/centers/${c.slug}`,
    inLanguage: 'en',
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, place, article]) }}
      />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/wellness" className="hover:text-gray-800">Wellness</Link>
        <span className="mx-1.5">›</span>
        <Link href="/wellness/vipassana" className="hover:text-gray-800">Vipassana</Link>
        <span className="mx-1.5">›</span>
        <Link href="/wellness/vipassana/centers" className="hover:text-gray-800">Centers</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{c.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-emerald-600">
          {LINEAGE_LABEL[c.lineage]} · {REGION_LABEL[c.region]}
        </p>
        <h1 className={`${H1.catalogue} mt-1`}>{c.name}</h1>
        <p className="mt-2 text-base text-gray-700">
          {c.city}, {c.state}, {c.country}
        </p>
        {c.isFlagshipCenter ? (
          <span className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Flagship center
          </span>
        ) : null}
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Founded</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{c.foundedYear || '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Capacity</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{c.capacity ? `${c.capacity} students` : '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Tradition</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{LINEAGE_LABEL[c.lineage]}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Languages</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{c.languagesTaught.join(', ')}</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-2xl text-amber-700">About this center</h2>
        <p className="mt-3 text-base leading-relaxed text-gray-800">{c.summary}</p>
      </section>

      <section className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="font-serif text-xl text-emerald-800">How to reach</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {c.nearestAirport ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Nearest airport</dt>
              <dd className="mt-0.5 text-sm text-emerald-900">{c.nearestAirport}</dd>
            </div>
          ) : null}
          {c.nearestRailway ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Nearest railway</dt>
              <dd className="mt-0.5 text-sm text-emerald-900">{c.nearestRailway}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Climate</dt>
            <dd className="mt-0.5 text-sm text-emerald-900">{c.climate}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Best season</dt>
            <dd className="mt-0.5 text-sm text-emerald-900">{c.bestSeason}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <h2 className="font-serif text-xl text-amber-800">Before you apply</h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-900">{c.notesForFirstTimers}</p>
        <p className="mt-3 text-sm text-amber-900">
          New to Vipassana?{' '}
          <Link href="/wellness/vipassana/learn" className="font-semibold underline hover:text-amber-700">
            Read the full guide
          </Link>{' '}
          before applying — the 10-day course expects you to know what you are committing to.
        </p>
      </section>

      <section className="mb-10 rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
        <h2 className="font-serif text-xl text-saffron-900">Apply for a course</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Applications go directly to {c.name}. Darshya does not handle bookings — the
          center reviews each applicant personally. The course itself is{' '}
          <strong>donation-based</strong> (no fee).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={c.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
          >
            Apply on official site →
          </a>
          <a
            href={c.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-saffron-400 bg-white px-4 py-2 text-sm font-semibold text-saffron-800 hover:bg-saffron-50"
          >
            Visit center site
          </a>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mb-10">
          <h2 className="font-serif text-xl text-gray-900">Other centers in {REGION_LABEL[c.region]}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/wellness/vipassana/centers/${r.slug}`}
                className="block rounded-xl border border-gray-200 bg-white p-3 hover:border-amber-300 hover:shadow-sm"
              >
                <p className="text-sm font-bold text-gray-900">{r.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {r.city}, {r.state}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/wellness/vipassana/centers/${prev.slug}`} className="text-amber-700 hover:underline">
            ← {prev.name}
          </Link>
        ) : <span />}
        <Link href="/wellness/vipassana/centers" className="font-semibold text-gray-700 hover:underline">
          All centers
        </Link>
        {next ? (
          <Link href={`/wellness/vipassana/centers/${next.slug}`} className="text-amber-700 hover:underline">
            {next.name} →
          </Link>
        ) : <span />}
      </nav>
    </main>
  );
}
