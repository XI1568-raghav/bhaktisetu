import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRudraksha, RUDRAKSHAS } from '../../../lib/rudrakshas';
import { EnrichedAbout } from '../../../components/seo/EnrichedAbout';
import { ENRICHMENT } from '../../../lib/enrich';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getRudraksha(slug);
  if (!r) return { title: 'Not found' };
  return {
    title: `${r.name} — Benefits, Mantra, Wearing Rules, Deity ${r.deity}`,
    description: `${r.name} (${r.sanskrit}) — sacred bead of ${r.deity}, planet ${r.planet}. Beej mantra: ${r.mantraTranslit}. ${r.significance.slice(0, 100)}…`,
    alternates: { canonical: `${BASE_URL}/rudraksha/${r.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${r.name} — ${r.deity}`,
      description: r.significance,
      url: `${BASE_URL}/rudraksha/${r.slug}`,
      type: 'article',
    },
  };
}

export default async function RudrakshaDetailPage({ params }: Props) {
  const { slug } = await params;
  const r = getRudraksha(slug);
  if (!r) notFound();

  const idx = RUDRAKSHAS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? RUDRAKSHAS[idx - 1] : undefined;
  const next = idx < RUDRAKSHAS.length - 1 ? RUDRAKSHAS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Rudraksha Guide', item: `${BASE_URL}/rudraksha` },
      { '@type': 'ListItem', position: 3, name: r.name, item: `${BASE_URL}/rudraksha/${r.slug}` },
    ],
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${r.name} — Benefits, Mantra and Wearing Rules`,
    description: r.significance,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `${BASE_URL}/rudraksha/${r.slug}`,
    about: r.deity,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, article]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/rudraksha" className="hover:underline">Rudraksha Guide</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{r.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-amber-700">
          {typeof r.mukhi === 'number' ? `${r.mukhi}-Mukhi Rudraksha` : 'Special Rudraksha'} · {r.category}
        </p>
        <h1 className={`${H1.catalogue} mt-1`}>{r.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{r.sanskrit}</p>
      </header>

      <section className="mb-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-amber-900">Deity · Planet · Beej Mantra</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-700">Presiding deity</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{r.deity}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-700">Ruling planet</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{r.planet}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-700">Origin</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{r.origin}</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-amber-700">Beej Mantra</div>
          <div className="mt-1 font-serif text-2xl text-gray-900">{r.mantra}</div>
          <div className="mt-1 text-sm italic text-gray-600">{r.mantraTranslit}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Significance</h2>
        <p className="text-base leading-relaxed text-gray-700">{r.significance}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Benefits</h2>
        <ul className="list-disc space-y-1.5 pl-6 text-sm text-gray-800">
          {r.benefits.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-700">Recommended for</div>
          <div className="mt-1 text-sm text-gray-900">{r.whoShouldWear}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-rose-700">Not recommended for</div>
          <div className="mt-1 text-sm text-gray-900">{r.notRecommendedFor}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Wearing day</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{r.wearingDay}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Wearing hand / form</div>
          <div className="mt-1 text-sm text-gray-900">{r.wearingHand}</div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Energising ritual (prana pratishtha)</h2>
        <p className="text-sm leading-relaxed text-gray-800">{r.energising}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-amber-900">Story of origin</h2>
        <p className="text-sm leading-relaxed text-gray-800">{r.storyOrigin}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Plan a related sadhana</h2>
        <p className="text-sm text-gray-700">
          Book a{' '}
          <Link href="/pujas" className="text-amber-700 underline">rudraksha-related puja</Link> at a verified temple,
          or consult an{' '}
          <Link href="/astrologers" className="text-amber-700 underline">astrologer</Link> for personalised mukhi
          recommendation based on your chart. See also{' '}
          <Link href="/jyotirlinga" className="text-amber-700 underline">12 Jyotirlinga</Link> and{' '}
          <Link href="/chants" className="text-amber-700 underline">Sanskrit mantras</Link>.
        </p>
      </section>

<EnrichedAbout name={r.name} data={ENRICHMENT.rudrakshas[r.slug]} />
      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/rudraksha/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/rudraksha/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
