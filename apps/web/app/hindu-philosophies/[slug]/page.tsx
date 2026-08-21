import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHinduPhilosophy, HINDU_PHILOSOPHIES } from '../../../lib/hindu-philosophies';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

const CATEGORY_LABEL: Record<string, string> = {
  'orthodox-darshana': 'Orthodox Darshana (Astika)',
  'vedanta-sub-school': 'Vedanta Sub-School',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getHinduPhilosophy(slug);
  if (!p) {
    return { title: 'Not Found' };
  }
  const title = `${p.name} — ${CATEGORY_LABEL[p.category]}`;
  const description = p.centralThesis.length > 160
    ? `${p.centralThesis.slice(0, 157)}…`
    : p.centralThesis;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/hindu-philosophies/${p.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${p.name} (${p.sanskrit})`,
      description,
      url: `${BASE_URL}/hindu-philosophies/${p.slug}`,
      type: 'article',
    },
  };
}

export default async function HinduPhilosophyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getHinduPhilosophy(slug);
  if (!p) {
    notFound();
  }

  const idx = HINDU_PHILOSOPHIES.findIndex((x) => x.slug === p.slug);
  const prev = idx > 0 ? HINDU_PHILOSOPHIES[idx - 1] : undefined;
  const next = idx < HINDU_PHILOSOPHIES.length - 1 ? HINDU_PHILOSOPHIES[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Hindu Philosophies', item: `${BASE_URL}/hindu-philosophies` },
      { '@type': 'ListItem', position: 3, name: p.name, item: `${BASE_URL}/hindu-philosophies/${p.slug}` },
    ],
  };

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${p.name} — ${CATEGORY_LABEL[p.category]}`,
    description: p.centralThesis,
    inLanguage: 'en',
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya', url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/hindu-philosophies/${p.slug}`,
    about: { '@type': 'Thing', name: p.name, alternateName: p.sanskrit },
    keywords: [p.name, p.sanskrit, p.founder, ...p.keyConcepts].join(', '),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, article]) }}
      />

      <nav className="mb-6 text-sm">
        <Link href="/hindu-philosophies" className="text-saffron-700 hover:underline">
          ← All Hindu philosophies
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">{CATEGORY_LABEL[p.category]}</p>
        <p className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">{p.sanskrit}</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{p.name}</h1>
      </header>

      <section className="mb-8 grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Founder</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{p.founder}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Era</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{p.foundingEra}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Category</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{CATEGORY_LABEL[p.category]}</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Central thesis</h2>
        <p className="mt-2 text-base leading-relaxed text-gray-800">{p.centralThesis}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Key texts</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800">
          {p.keyTexts.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Pramana (accepted means of valid knowledge)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800">
          {p.pramana.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-semibold text-indigo-900">View of liberation (moksha)</h2>
        <p className="mt-2 text-sm leading-relaxed text-indigo-900">{p.liberationView}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Modern exponents</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {p.modernExponents.map((m) => (
            <li key={m} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-800">
              {m}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900">Key concepts</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {p.keyConcepts.map((c) => (
            <li
              key={c}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      <nav className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/hindu-philosophies/${prev.slug}`} className="text-saffron-700 hover:underline">
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/hindu-philosophies/${next.slug}`} className="text-saffron-700 hover:underline">
            {next.name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
      {detailCta({
        routePrefix: 'hindu-philosophies',
        subject: p.name,
      })}
    </main>
  );
}
