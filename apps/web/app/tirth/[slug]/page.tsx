import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTirtha, tirthaSlugs, TIRTHAS } from '../../../lib/tirthas';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return tirthaSlugs().map((slug) => ({ slug }));
}

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = getTirtha(slug);
  if (!t) return { title: 'Not found' };
  return {
    title: `${t.name} — Complete Pilgrim Guide`,
    description: `${t.name} (${t.sanskrit}): darshan timings, how to reach, dress code, what to offer, ${t.primaryPujas.slice(0, 2).join(' & ')}. ${t.significance.slice(0, 100)}…`,
    alternates: { canonical: `${BASE_URL}/tirth/${t.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${t.name} — Pilgrim Guide`,
      description: t.significance,
      url: `${BASE_URL}/tirth/${t.slug}`,
      type: 'article',
    },
  };
}

export default async function TirthaPage({ params }: Props) {
  const { slug } = await params;
  const t = getTirtha(slug);
  if (!t) notFound();

  const idx = TIRTHAS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? TIRTHAS[idx - 1] : undefined;
  const next = idx < TIRTHAS.length - 1 ? TIRTHAS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tirthas', item: `${BASE_URL}/tirth` },
      { '@type': 'ListItem', position: 3, name: t.name, item: `${BASE_URL}/tirth/${t.slug}` },
    ],
  };
  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: t.name,
    description: t.significance,
    address: { '@type': 'PostalAddress', addressRegion: t.state, addressCountry: 'IN' },
    isAccessibleForFree: true,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, place]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/tirth" className="hover:underline">Tirthas</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{t.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">{t.category} · {t.state}</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">{t.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{t.sanskrit}</p>
        <p className="mt-3 text-base text-gray-700"><strong>Presiding deity:</strong> {t.presiding}</p>
        <p className="mt-1 text-sm text-gray-600">Established: {t.established}</p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Darshan timings</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{t.darshanTimings}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Average wait</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{t.averageWaitTime}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Best season</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{t.bestSeason}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Daily visitors</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{t.estimatedDailyVisitors}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Significance</h2>
        <p className="text-base leading-relaxed text-gray-700">{t.significance}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-saffron-900">Legend</h2>
        <p className="text-sm leading-relaxed text-gray-800">{t.legend}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">How to reach</h2>
        <p className="text-sm leading-relaxed text-gray-800">{t.howToReach}</p>
        <div className="mt-3 grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
          <div><strong>Nearest airport:</strong> {t.nearestAirport}</div>
          <div><strong>Nearest railway:</strong> {t.nearestRailway}</div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Where to stay</h2>
        <p className="text-sm leading-relaxed text-gray-800">{t.whereToStay}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Primary pujas performed here</h2>
        <ul className="list-disc space-y-1.5 pl-6 text-sm text-gray-800">
          {t.primaryPujas.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <p className="mt-3 text-sm text-gray-700"><strong>What to offer:</strong> {t.whatToOffer}</p>
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-amber-700">Dress code</div>
          <div className="mt-1 text-sm text-gray-900">{t.dressCode}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-amber-700">Photo policy</div>
          <div className="mt-1 text-sm text-gray-900">{t.photoPolicy}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Modern access</h2>
        <p className="text-base leading-relaxed text-gray-700">{t.modernRelevance}</p>
        <div className="mt-3 flex gap-2 text-xs">
          {t.onlineBookingAvailable && <span className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">✓ Online booking available</span>}
          {t.vipDarshanAvailable && <span className="rounded bg-indigo-100 px-2 py-1 font-semibold text-indigo-800">✓ VIP darshan available</span>}
        </div>
      </section>

      {t.nearbyTirthas.length > 0 && (
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Nearby tirthas</h2>
          <ul className="grid gap-1 pl-5 list-disc text-sm text-gray-700 sm:grid-cols-2">
            {t.nearbyTirthas.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      )}

      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/tirth/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/tirth/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
