import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../../components/ui/heading-recipe';
import Link from 'next/link';
import {
  VIPASSANA_CENTERS,
  LINEAGE_LABEL,
  REGION_LABEL,
} from '../../../../lib/vipassana-centers';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: `Vipassana Centers Worldwide — ${VIPASSANA_CENTERS.length} Goenka & Insight Meditation Centers`,
  description: `Directory of ${VIPASSANA_CENTERS.length} Vipassana meditation centers across India and worldwide. Goenka tradition (S.N. Goenka), Tibetan, and Western Insight lineages. Apply directly via dhamma.org and partner sites.`,
  alternates: { canonical: `${BASE_URL}/wellness/vipassana/centers` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: `Vipassana Centers — India + Worldwide`,
    description: `${VIPASSANA_CENTERS.length} centers across India, USA, UK, Canada, Australia, NZ. Donation-based 10-day silent retreats.`,
    url: `${BASE_URL}/wellness/vipassana/centers`,
    type: 'website',
  },
};

const REGION_KEYS: Array<keyof typeof REGION_LABEL> = ['india', 'usa-canada', 'uk-europe', 'asia-pacific'];

const LINEAGE_ACCENT: Record<string, string> = {
  goenka: 'bg-amber-100 text-amber-800 border-amber-200',
  mahasi: 'bg-rose-100 text-rose-800 border-rose-200',
  'thai-forest': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'tibetan-vipassana': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'imc-lineage': 'bg-sky-100 text-sky-800 border-sky-200',
};

export default function VipassanaCentersIndexPage() {
  const byRegionGrouped = REGION_KEYS.map((r) => ({
    key: r,
    label: REGION_LABEL[r],
    centers: VIPASSANA_CENTERS.filter((c) => c.region === r),
  })).filter((g) => g.centers.length > 0);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Vipassana Meditation Centers Worldwide',
    numberOfItems: VIPASSANA_CENTERS.length,
    itemListElement: VIPASSANA_CENTERS.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      url: `${BASE_URL}/wellness/vipassana/centers/${c.slug}`,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Wellness', item: `${BASE_URL}/wellness` },
      { '@type': 'ListItem', position: 3, name: 'Vipassana', item: `${BASE_URL}/wellness/vipassana` },
      { '@type': 'ListItem', position: 4, name: 'Centers', item: `${BASE_URL}/wellness/vipassana/centers` },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumb]) }}
      />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/wellness" className="hover:text-gray-800">Wellness</Link>
        <span className="mx-1.5">›</span>
        <Link href="/wellness/vipassana" className="hover:text-gray-800">Vipassana</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">Centers</span>
      </nav>

      <header className="mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-emerald-600">
          {VIPASSANA_CENTERS.length} centers worldwide
        </p>
        <h1 className={`${H1.catalogue} mt-1`}>
          Vipassana Centers — India &amp; Worldwide
        </h1>
        <p className="mt-3 text-base text-gray-700">
          Directory of every major Vipassana meditation center across the four corners of
          the dhamma.org network and adjacent insight-meditation traditions.
          Applications go directly to each center — we are a discovery and preparation
          resource, not a booking middleman.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <p className="text-sm font-semibold text-emerald-900">How booking works</p>
        <ul className="mt-2 space-y-1 text-sm text-emerald-800">
          <li>• 10-day courses are <strong>donation-based</strong> — no fee. Donate after completion if you wish.</li>
          <li>• Apply directly on each center&rsquo;s official site (dhamma.org subdomain or partner URL).</li>
          <li>• Popular centers (Dhamma Giri, Dhamma Pattana, Dhamma Dhara) book out 3-6 months ahead.</li>
          <li>• First-timers apply as &ldquo;New Students&rdquo; — only the full 10-day course is open to you.</li>
        </ul>
      </section>

      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {byRegionGrouped.map((g) => (
          <a
            key={g.key}
            href={`#${g.key}`}
            className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 font-semibold text-amber-800"
          >
            {g.label} <span className="opacity-70">· {g.centers.length}</span>
          </a>
        ))}
      </nav>

      {byRegionGrouped.map((g) => (
        <section key={g.key} id={g.key} className="mb-12 scroll-mt-20">
          <header className="mb-4">
            <h2 className="font-serif text-2xl text-amber-700">{g.label}</h2>
            <p className="mt-1 text-sm text-gray-600">{g.centers.length} centers</p>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.centers.map((c) => (
              <Link
                key={c.slug}
                href={`/wellness/vipassana/centers/${c.slug}`}
                className="group block rounded-2xl border border-amber-200 bg-amber-50/30 p-4 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-900 group-hover:underline">
                    {c.name}
                  </h3>
                  {c.isFlagshipCenter ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Flagship
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {c.city}, {c.state}{c.country !== 'India' ? `, ${c.country}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${LINEAGE_ACCENT[c.lineage] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                  >
                    {LINEAGE_LABEL[c.lineage]}
                  </span>
                  {c.capacity ? (
                    <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      Cap {c.capacity}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-gray-700">
                  {c.summary}
                </p>
                <p className="mt-3 text-xs font-semibold text-amber-700">
                  View details →
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Not sure where to start?</h2>
        <p className="mt-2 text-sm text-gray-700">
          For first-time students in India, the most established centers are{' '}
          <Link href="/wellness/vipassana/centers/dhamma-giri" className="font-semibold text-amber-700 hover:underline">Dhamma Giri (Igatpuri)</Link>,{' '}
          <Link href="/wellness/vipassana/centers/dhamma-pattana" className="font-semibold text-amber-700 hover:underline">Dhamma Pattana (Mumbai)</Link>, and{' '}
          <Link href="/wellness/vipassana/centers/dhamma-sota" className="font-semibold text-amber-700 hover:underline">Dhamma Sota (Delhi NCR)</Link>.
          For NRIs, <Link href="/wellness/vipassana/centers/dhamma-dhara" className="font-semibold text-amber-700 hover:underline">Dhamma Dhara (Massachusetts)</Link> and{' '}
          <Link href="/wellness/vipassana/centers/dhamma-dipa" className="font-semibold text-amber-700 hover:underline">Dhamma Dīpa (UK)</Link> are the flagships.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/wellness/vipassana/learn"
            className="inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
          >
            Learn the technique first →
          </Link>
          <Link
            href="/wellness/vipassana"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Vipassana overview
          </Link>
        </div>
      </section>
    </main>
  );
}
