import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VRATS, vratSlugs, getVrat } from '../../../lib/vrats';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return vratSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = getVrat(slug);
  if (!v) return { title: 'Vrat not found' };

  return {
    title: `${v.name} (${v.sanskritName}) — Vidhi, Fasting Rules, Katha, Mantra | Darshya`,
    description: `${v.name}: ${v.significance.slice(0, 140)}. Fasting rules, rituals, prasad, mantra, story. Observed by ${v.whoObserves.slice(0, 80)}.`,
    alternates: { canonical: `${BASE_URL}/vrat/${v.slug}` },
    openGraph: {
      title: `${v.name} — Hindu Fasting Tradition`,
      description: v.significance.slice(0, 200),
      url: `${BASE_URL}/vrat/${v.slug}`,
      type: 'article',
      images: ['/og/default'],
    },
  };
}

function jsonLd(v: NonNullable<ReturnType<typeof getVrat>>) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Vrats', item: `${BASE_URL}/vrat` },
        { '@type': 'ListItem', position: 3, name: v.name, item: `${BASE_URL}/vrat/${v.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${v.name} — Hindu Fasting Tradition Guide`,
      description: v.significance,
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-05-27',
      mainEntityOfPage: `${BASE_URL}/vrat/${v.slug}`,
    },
  ];
}

const catBadge: Record<string, string> = {
  lunar: 'bg-indigo-100 text-indigo-800',
  seasonal: 'bg-emerald-100 text-emerald-800',
  family: 'bg-pink-100 text-pink-800',
  weekly: 'bg-saffron-100 text-saffron-800',
};

const catLabel: Record<string, string> = {
  lunar: 'Lunar vrat (tithi-based)',
  seasonal: 'Festival / seasonal vrat',
  family: 'Family / saubhagya vrat',
  weekly: 'Weekly vrat (vaar-based)',
};

export default async function VratDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = getVrat(slug);
  if (!v) notFound();

  const idx = VRATS.findIndex((x) => x.slug === v.slug);
  const prev = idx > 0 ? VRATS[idx - 1] : null;
  const next = idx < VRATS.length - 1 ? VRATS[idx + 1] : null;
  const related = VRATS.filter((x) => x.slug !== v.slug && x.category === v.category).slice(0, 3);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(v)) }}
      />

      <nav className="text-xs text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/vrat" className="hover:text-saffron-700">Vrats</Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900">{v.name}</span>
      </nav>

      <header className="mb-8">
        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mb-3 ${catBadge[v.category]}`}>
          {catLabel[v.category]}
        </span>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-2 leading-tight">
          {v.name}
          <span className="text-surface-500 text-xl sm:text-2xl font-normal ml-3">
            {v.sanskritName}
          </span>
        </h1>
        <p className="text-surface-700 text-base sm:text-lg italic">
          Devoted to {v.deity} · {v.frequency}
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Deity</div>
          <div className="font-semibold text-surface-900 text-sm">{v.deity}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Duration</div>
          <div className="font-semibold text-surface-900 text-sm">{v.duration}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Best time</div>
          <div className="font-semibold text-surface-900 text-sm">{v.bestTime}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Prasad</div>
          <div className="font-semibold text-surface-900 text-sm">{v.prasad.split(',')[0]}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Significance</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{v.significance}</p>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Who Observes</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{v.whoObserves}</p>
      </section>

      <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Fasting Rules (Upvas Niyam)</h2>
        <ul className="space-y-1.5 text-sm text-surface-700">
          {v.fastingRules.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Rituals (Puja Vidhi)</h2>
        <ol className="space-y-1.5 text-sm text-surface-700 list-decimal list-inside marker:text-emerald-600 marker:font-bold">
          {v.rituals.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Prasad</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{v.prasad}</p>
      </section>

      <section className="mb-8 rounded-xl border border-saffron-200 bg-saffron-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Benefits (Phal)</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{v.benefits}</p>
      </section>

      <section className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Primary Mantra</h2>
        <div className="bg-white border border-indigo-300 rounded-md p-3">
          <div className="font-mono text-sm text-surface-900 leading-relaxed">{v.mantra}</div>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-surface-200 bg-surface-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Vrat Katha (Story Origin)</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{v.storyOrigin}</p>
      </section>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Book a pandit for {v.name} udyapan or katha
        </h2>
        <p className="text-surface-700 text-sm mb-4">
          Concluding ceremony, havan, or full katha recitation at your home or remotely with video proof.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/ask-pandit"
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            Ask a pandit →
          </Link>
          <Link
            href="/today"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Today&apos;s panchang
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mb-6 pt-6 border-t border-surface-200">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Related vrats</h3>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/vrat/${r.slug}`}
                className="px-3 py-1.5 text-sm bg-white border border-surface-200 text-saffron-700 rounded-md hover:border-saffron-400"
              >
                {r.name} →
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-surface-200">
        {prev ? (
          <Link
            href={`/vrat/${prev.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/vrat" className="text-sm text-surface-600 hover:text-saffron-700">
          All vrats
        </Link>
        {next ? (
          <Link
            href={`/vrat/${next.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            {next.name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
