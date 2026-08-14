import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JYOTIRLINGAS, JYOTIRLINGA_SLUGS, getJyotirlingaBySlug } from '../../../lib/jyotirlingas';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return JYOTIRLINGA_SLUGS.map((slug) => ({ slug }));
}

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const j = getJyotirlingaBySlug(slug);
  if (!j) return { title: 'Not found' };
  return {
    title: `${j.name} Jyotirlinga (${j.number} of 12) — Darshan Timings, ${j.signatureRitual.split('(')[0]?.trim() ?? ''}`,
    description: `${j.name} (${j.sanskrit}) — ${j.number}th Jyotirlinga in ${j.city}, ${j.state}. Darshan ${j.darshanTimings}. Signature ritual: ${j.signatureRitual}. ${j.significance.slice(0, 90)}…`,
    alternates: { canonical: `${BASE_URL}/jyotirlinga/${j.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${j.name} Jyotirlinga — ${j.number} of 12`,
      description: j.significance,
      url: `${BASE_URL}/jyotirlinga/${j.slug}`,
      type: 'article',
    },
  };
}

export default async function JyotirlingaPage({ params }: Props) {
  const { slug } = await params;
  const j = getJyotirlingaBySlug(slug);
  if (!j) notFound();

  const idx = JYOTIRLINGAS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? JYOTIRLINGAS[idx - 1] : undefined;
  const next = idx < JYOTIRLINGAS.length - 1 ? JYOTIRLINGAS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: '12 Jyotirlinga', item: `${BASE_URL}/jyotirlinga` },
      { '@type': 'ListItem', position: 3, name: j.name, item: `${BASE_URL}/jyotirlinga/${j.slug}` },
    ],
  };
  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${j.name} Jyotirlinga`,
    description: j.significance,
    address: {
      '@type': 'PostalAddress',
      addressLocality: j.city,
      addressRegion: j.state,
      addressCountry: 'IN',
    },
    isAccessibleForFree: true,
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${j.name} Jyotirlinga — ${j.number} of 12`,
    description: j.significance,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `${BASE_URL}/jyotirlinga/${j.slug}`,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, place, article]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/jyotirlinga" className="hover:underline">12 Jyotirlinga</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{j.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">
          Jyotirlinga {j.number} of 12 · {j.state}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">{j.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{j.sanskrit}</p>
        <p className="mt-3 text-base text-gray-700"><strong>Location:</strong> {j.city}, {j.state}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide">
          {j.swayambhu && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Swayambhu (self-manifest)</span>}
          {j.dakshinmukhi && <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">Dakshinmukhi (south-facing)</span>}
          {j.onlineBookingAvailable && <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">Online booking</span>}
        </div>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Darshan timings</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{j.darshanTimings}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Average wait</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{j.averageWaitTime}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Best season</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{j.bestSeason}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Daily visitors</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{j.estimatedDailyVisitors}</div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-rose-900">Signature ritual</h2>
        <p className="text-sm leading-relaxed text-gray-800"><strong>{j.signatureRitual}</strong></p>
        <p className="mt-1 text-xs text-gray-700">Time: {j.signatureRitualTime}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Significance</h2>
        <p className="text-base leading-relaxed text-gray-700">{j.significance}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-saffron-900">Legend</h2>
        <p className="text-sm leading-relaxed text-gray-800">{j.legend}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">How to reach</h2>
        <p className="text-sm leading-relaxed text-gray-800">{j.howToReach}</p>
        <div className="mt-3 grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
          <div><strong>Nearest airport:</strong> {j.nearestAirport}</div>
          <div><strong>Nearest railway:</strong> {j.nearestRailway}</div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Where to stay</h2>
        <p className="text-sm leading-relaxed text-gray-800">{j.whereToStay}</p>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-700">Abhishekam fee</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{j.abhishekamFee}</div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-indigo-700">VIP darshan</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{j.vipDarshanFee}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Primary pujas performed here</h2>
        <ul className="list-disc space-y-1.5 pl-6 text-sm text-gray-800">
          {j.primaryPujas.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <p className="mt-3 text-sm text-gray-700"><strong>What to offer:</strong> {j.whatToOffer}</p>
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-amber-700">Dress code</div>
          <div className="mt-1 text-sm text-gray-900">{j.dressCode}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-amber-700">Photo policy</div>
          <div className="mt-1 text-sm text-gray-900">{j.photoPolicy}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Modern access</h2>
        <p className="text-base leading-relaxed text-gray-700">{j.modernRelevance}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Plan online from anywhere</h2>
        <p className="text-sm text-gray-700">
          Cannot travel? Book a <Link href="/pujas" className="text-saffron-700 underline">remote puja with video proof</Link> at this Jyotirlinga.
          Or join the full <Link href="/pilgrimage/12-jyotirlinga" className="text-saffron-700 underline">12 Jyotirlinga circuit</Link>.
        </p>
      </section>

      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/jyotirlinga/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.number}. {prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/jyotirlinga/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.number}. {next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
