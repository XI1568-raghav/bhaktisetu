import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MUHURATS, muhuratSlugs, getMuhurat } from '../../../lib/muhurats';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return muhuratSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = getMuhurat(slug);
  if (!m) return { title: 'Muhurat not found' };

  return {
    title: `${m.name} (${m.sanskritName}) — Timing, Calculation, Significance`,
    description: `${m.name}: ${m.shortDesc} Duration: ${m.duration}. Ruled by ${m.ruledBy}. Full guide — when, how to calculate, what to do, what to avoid.`,
    alternates: { canonical: `${BASE_URL}/muhurat/${m.slug}` },
    openGraph: {
      title: `${m.name} — Vedic Muhurat Guide`,
      description: m.shortDesc,
      url: `${BASE_URL}/muhurat/${m.slug}`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

function jsonLd(m: NonNullable<ReturnType<typeof getMuhurat>>) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Muhurat', item: `${BASE_URL}/muhurat` },
        { '@type': 'ListItem', position: 3, name: m.name, item: `${BASE_URL}/muhurat/${m.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${m.name} — Vedic Muhurat Guide`,
      description: m.shortDesc,
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-05-27',
      mainEntityOfPage: `${BASE_URL}/muhurat/${m.slug}`,
    },
  ];
}

const catBadge: Record<string, string> = {
  daily: 'bg-emerald-100 text-emerald-800',
  inauspicious: 'bg-rose-100 text-rose-800',
  planning: 'bg-saffron-100 text-saffron-800',
};

const catLabel: Record<string, string> = {
  daily: 'Daily auspicious',
  inauspicious: 'Avoid window',
  planning: 'Life-event muhurat',
};

export default async function MuhuratDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = getMuhurat(slug);
  if (!m) notFound();

  const related = MUHURATS.filter((x) => x.slug !== m.slug && x.category === m.category).slice(0, 3);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(m)) }}
      />

      <nav className="text-xs text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/muhurat" className="hover:text-saffron-700">Muhurat</Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900">{m.name}</span>
      </nav>

      <header className="mb-8">
        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mb-3 ${catBadge[m.category]}`}>
          {catLabel[m.category]}
        </span>
        <h1 className={`${H1.marketing} mb-2`}>
          {m.name}
          <span className="text-surface-500 text-xl sm:text-2xl font-normal ml-3">
            {m.sanskritName}
          </span>
        </h1>
        <p className="text-surface-700 text-base sm:text-lg italic">{m.shortDesc}</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Timing</div>
          <div className="font-semibold text-surface-900 text-sm">{m.timing}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Duration</div>
          <div className="font-semibold text-surface-900 text-sm">{m.duration}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Ruled by</div>
          <div className="font-semibold text-surface-900 text-sm">{m.ruledBy}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Best for</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-surface-700">
          {m.bestFor.map((b) => (
            <li key={b} className="flex items-start gap-1.5">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-rose-200 bg-rose-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Avoid</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-surface-700">
          {m.avoid.map((a) => (
            <li key={a} className="flex items-start gap-1.5">
              <span className="text-rose-600 mt-0.5">✗</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Spiritual Significance</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{m.spiritualSignificance}</p>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">How to Calculate</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{m.howToCalculate}</p>
      </section>

      <section className="mb-10 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Modern Application</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{m.modernApplication}</p>
      </section>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          {m.category === 'planning'
            ? `Get personalized ${m.name.toLowerCase()} dates`
            : `Today's ${m.name} in your local time`}
        </h2>
        <p className="text-surface-700 text-sm mb-4">
          {m.category === 'planning'
            ? 'Our pandits match dates to your birth chart for highest auspiciousness.'
            : 'Live panchang shows today\'s exact timing for your city.'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href={m.category === 'planning' ? '/ask-pandit' : '/today'}
            className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            {m.category === 'planning' ? 'Ask a pandit →' : "Today's panchang →"}
          </Link>
          <Link
            href="/muhurat"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            All muhurats
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="pt-6 border-t border-surface-200">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Related muhurats</h3>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/muhurat/${r.slug}`}
                className="px-3 py-1.5 text-sm bg-white border border-surface-200 text-saffron-700 rounded-md hover:border-saffron-400"
              >
                {r.name} →
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
