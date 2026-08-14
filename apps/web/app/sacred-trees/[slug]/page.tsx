import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSacredTree, SACRED_TREES } from '../../../lib/sacred-trees';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getSacredTree(slug);
  if (!t) return { title: 'Sacred tree not found' };

  const title = `${t.name} (${t.sanskrit}) — Sacred Tree of ${t.associatedDeity.split(' ').slice(0, 3).join(' ')}`;
  const description = `${t.name} (${t.botanicalName}) — spiritual significance, planting muhurta on ${t.plantingMuhurta.split(' / ')[0]}, traditional uses in puja and daily practice. Associated deity: ${t.associatedDeity}.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/sacred-trees/${t.slug}` },
    openGraph: {
      title: `${t.name} (${t.sanskrit}) — Sacred Tree`,
      description,
      url: `${BASE_URL}/sacred-trees/${t.slug}`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

function jsonLd(t: NonNullable<ReturnType<typeof getSacredTree>>) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Sacred Trees', item: `${BASE_URL}/sacred-trees` },
        { '@type': 'ListItem', position: 3, name: `${t.name} (${t.sanskrit})`, item: `${BASE_URL}/sacred-trees/${t.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${t.name} (${t.sanskrit}) — Sacred Tree of Sanatana Dharma`,
      description: t.spiritualSignificance,
      about: {
        '@type': 'Thing',
        name: t.name,
        alternateName: [t.sanskrit, t.botanicalName],
      },
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-06-04',
      mainEntityOfPage: `${BASE_URL}/sacred-trees/${t.slug}`,
    },
  ];
}

export default async function SacredTreeDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = getSacredTree(slug);
  if (!t) notFound();

  const idx = SACRED_TREES.findIndex((x) => x.slug === slug);
  // notFound() above guarantees idx >= 0, so the modular index always resolves;
  // `?? t` only satisfies TS under noUncheckedIndexedAccess.
  const prev = SACRED_TREES[(idx - 1 + SACRED_TREES.length) % SACRED_TREES.length] ?? t;
  const next = SACRED_TREES[(idx + 1) % SACRED_TREES.length] ?? t;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(t)) }}
      />

      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-emerald-700">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/sacred-trees" className="hover:text-emerald-700">Sacred Trees</Link>
        <span className="mx-1">/</span>
        <span className="text-surface-900">{t.name}</span>
      </nav>

      <header className="mb-8">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full">
          Sacred Tree · {t.sanskrit}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2 leading-tight">
          {t.name}
        </h1>
        <div className="text-surface-600 italic mb-1">{t.botanicalName}</div>
        <div className="text-surface-700">
          Associated with{' '}
          {t.deitySlug ? (
            <Link href={`/deity/${t.deitySlug}`} className="text-emerald-700 hover:underline font-medium">
              {t.associatedDeity}
            </Link>
          ) : (
            <span className="font-medium">{t.associatedDeity}</span>
          )}
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-surface-900 mb-3">Spiritual significance</h2>
        <p className="text-surface-800 leading-relaxed">{t.spiritualSignificance}</p>
      </section>

      <section className="mb-8 p-5 rounded-xl bg-saffron-50 border border-saffron-200">
        <h2 className="text-lg font-semibold text-saffron-900 mb-2">Planting muhurta</h2>
        <p className="text-saffron-900">{t.plantingMuhurta}</p>
        <p className="text-xs text-saffron-800 mt-2">
          Saplings planted at these moments are believed to carry the blessings of the associated deity
          and the fertile cosmic energies of the chosen tithi or nakshatra.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-surface-900 mb-3">Traditional uses</h2>
        <ul className="space-y-2">
          {t.uses.map((u, i) => (
            <li key={i} className="flex gap-2 text-surface-800">
              <span className="text-emerald-600 font-bold">•</span>
              <span>{u}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-surface-500 italic mt-3">
          Health-related uses reflect traditional Ayurvedic practice. Not medical advice — consult a qualified physician.
        </p>
      </section>

      {t.mantraIfAny ? (
        <section className="mb-8 p-5 rounded-xl bg-indigo-50 border border-indigo-200">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2">Mantra</h2>
          <p className="text-indigo-900 font-serif text-lg leading-relaxed">{t.mantraIfAny}</p>
        </section>
      ) : null}

      <section className="mb-8 p-5 rounded-xl bg-rose-50 border border-rose-200">
        <h2 className="text-lg font-semibold text-rose-900 mb-2">Puranic legend</h2>
        <p className="text-rose-900 leading-relaxed">{t.legend}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-base font-semibold text-surface-900 mb-2">Found in</h3>
        <div className="flex flex-wrap gap-2">
          {t.foundIn.map((region, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full bg-surface-100 text-surface-700 border border-surface-300">
              {region}
            </span>
          ))}
        </div>
      </section>

      <nav className="mt-10 pt-6 border-t border-surface-200 flex justify-between gap-4">
        <Link
          href={`/sacred-trees/${prev.slug}`}
          className="text-sm text-emerald-700 hover:underline"
        >
          ← {prev.name}
        </Link>
        <Link href="/sacred-trees" className="text-sm text-surface-600 hover:text-emerald-700">
          All sacred trees
        </Link>
        <Link
          href={`/sacred-trees/${next.slug}`}
          className="text-sm text-emerald-700 hover:underline"
        >
          {next.name} →
        </Link>
      </nav>
    </main>
  );
}
