import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SHAKTI_PEETHS, getShaktiPeethBySlug, type ShaktiPeethCountry } from '../../../lib/shakti-peeths';

export const runtime = 'edge';
export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

const COUNTRY_CODE: Record<ShaktiPeethCountry, string> = {
  India: 'IN',
  Nepal: 'NP',
  Bangladesh: 'BD',
  'Sri Lanka': 'LK',
  Pakistan: 'PK',
  Tibet: 'CN',
};

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getShaktiPeethBySlug(slug);
  if (!s) return { title: 'Not found' };
  return {
    title: `${s.name} Shakti Peeth (${s.number} of 51) — Devi ${s.devi}, Darshan & Navratri | Darshya`,
    description: `${s.name} (${s.sanskrit}) — ${s.number}th Shakti Peeth at ${s.location}, ${s.state}. Body part: ${s.bodyPart}. Devi-Bhairava: ${s.devi} · ${s.bhairava}. Darshan ${s.darshanTimings}. ${s.significance.slice(0, 80)}…`,
    alternates: { canonical: `${BASE_URL}/shakti-peeth/${s.slug}` },
    openGraph: {
      title: `${s.name} Shakti Peeth — ${s.number} of 51`,
      description: s.significance,
      url: `${BASE_URL}/shakti-peeth/${s.slug}`,
      type: 'article',
    },
  };
}

export default async function ShaktiPeethPage({ params }: Props) {
  const { slug } = await params;
  const s = getShaktiPeethBySlug(slug);
  if (!s) notFound();

  const idx = SHAKTI_PEETHS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? SHAKTI_PEETHS[idx - 1] : undefined;
  const next = idx < SHAKTI_PEETHS.length - 1 ? SHAKTI_PEETHS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: '51 Shakti Peeth', item: `${BASE_URL}/shakti-peeth` },
      { '@type': 'ListItem', position: 3, name: s.name, item: `${BASE_URL}/shakti-peeth/${s.slug}` },
    ],
  };
  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${s.name} Shakti Peeth`,
    description: s.significance,
    address: {
      '@type': 'PostalAddress',
      addressLocality: s.location,
      addressRegion: s.state,
      addressCountry: COUNTRY_CODE[s.country],
    },
    isAccessibleForFree: true,
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${s.name} Shakti Peeth — ${s.number} of 51`,
    description: s.significance,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `${BASE_URL}/shakti-peeth/${s.slug}`,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, place, article]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/shakti-peeth" className="hover:underline">51 Shakti Peeth</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{s.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-rose-700">
          Shakti Peeth {s.number} of 51 · {s.country} · {s.state}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">{s.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{s.sanskrit}</p>
        <p className="mt-3 text-base text-gray-700"><strong>Location:</strong> {s.location}</p>
      </header>

      <section className="mb-8 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-rose-900">Devi · Bhairava · Body part</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-rose-700">Devi (Goddess)</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{s.devi}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-rose-700">Bhairava (Shiva)</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{s.bhairava}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-rose-700">Body part fallen</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{s.bodyPart}</div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Darshan timings</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{s.darshanTimings}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Best season</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{s.bestSeason}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Daily visitors</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{s.estimatedDailyVisitors}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Modern access</div>
          <div className="mt-1 text-sm text-gray-900">{s.modernAccess}</div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-rose-900">Signature ritual</h2>
        <p className="text-sm leading-relaxed text-gray-800">{s.signatureRitual}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Significance</h2>
        <p className="text-base leading-relaxed text-gray-700">{s.significance}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-saffron-900">Legend</h2>
        <p className="text-sm leading-relaxed text-gray-800">{s.legend}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">How to reach</h2>
        <p className="text-sm leading-relaxed text-gray-800">{s.howToReach}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-amber-900">Navratri special</h2>
        <p className="text-sm leading-relaxed text-gray-800">{s.navratriSpecial}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Primary pujas performed here</h2>
        <ul className="list-disc space-y-1.5 pl-6 text-sm text-gray-800">
          {s.primaryPujas.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Plan online from anywhere</h2>
        <p className="text-sm text-gray-700">
          Cannot travel? Book a <Link href="/pujas" className="text-rose-700 underline">remote Devi puja with video proof</Link>.
          See also <Link href="/jyotirlinga" className="text-rose-700 underline">12 Jyotirlinga</Link> and{' '}
          <Link href="/tirth" className="text-rose-700 underline">12 Sacred Tirthas</Link>.
        </p>
      </section>

      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/shakti-peeth/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.number}. {prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/shakti-peeth/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.number}. {next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
