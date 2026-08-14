import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHinduSymbol, HINDU_SYMBOLS, type HinduSymbolCategory } from '../../../lib/hindu-symbols';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

interface Props { params: Promise<{ slug: string }> }

const CATEGORY_LABEL: Record<HinduSymbolCategory, string> = {
  mantra: 'Sound symbol (mantra)',
  yantra: 'Geometric diagram (yantra)',
  'ritual-object': 'Ritual object',
  natural: 'Natural symbol',
  mark: 'Auspicious mark',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getHinduSymbol(slug);
  if (!s) return { title: 'Not found' };
  return {
    title: `${s.name} — Meaning, Deity ${s.associatedDeity}, Ritual Use`,
    description: `${s.name} (${s.sanskrit}) — ${s.meaning.slice(0, 150)}…`,
    alternates: { canonical: `${BASE_URL}/hindu-symbols/${s.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${s.name} — ${s.associatedDeity}`,
      description: s.meaning.slice(0, 200),
      url: `${BASE_URL}/hindu-symbols/${s.slug}`,
      type: 'article',
    },
  };
}

export default async function HinduSymbolDetailPage({ params }: Props) {
  const { slug } = await params;
  const s = getHinduSymbol(slug);
  if (!s) notFound();

  const idx = HINDU_SYMBOLS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? HINDU_SYMBOLS[idx - 1] : undefined;
  const next = idx < HINDU_SYMBOLS.length - 1 ? HINDU_SYMBOLS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Hindu Sacred Symbols', item: `${BASE_URL}/hindu-symbols` },
      { '@type': 'ListItem', position: 3, name: s.name, item: `${BASE_URL}/hindu-symbols/${s.slug}` },
    ],
  };

  const definedTerm = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: s.name,
    alternateName: s.sanskrit,
    description: s.meaning,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Hindu Sacred Symbols (Pratika of Sanatana Dharma)',
      url: `${BASE_URL}/hindu-symbols`,
    },
    url: `${BASE_URL}/hindu-symbols/${s.slug}`,
    termCode: s.slug,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, definedTerm]) }}
      />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/hindu-symbols" className="hover:underline">Hindu Sacred Symbols</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{s.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-amber-700">{CATEGORY_LABEL[s.category]}</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">{s.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{s.sanskrit}</p>
      </header>

      <section className="mb-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-700">Associated deity</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {s.deitySlug ? (
                <Link href={`/deity/${s.deitySlug}`} className="text-amber-800 underline">
                  {s.associatedDeity}
                </Link>
              ) : (
                s.associatedDeity
              )}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-700">Category</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{CATEGORY_LABEL[s.category]}</div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Meaning</h2>
        <p className="text-base leading-relaxed text-gray-700">{s.meaning}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Use in rituals</h2>
        <ul className="list-disc space-y-1.5 pl-6 text-sm text-gray-800">
          {s.useInRituals.map((u) => <li key={u}>{u}</li>)}
        </ul>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-indigo-700">Placement guidance</div>
          <div className="mt-1 text-sm text-gray-900">{s.placementGuidance}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-700">Common materials</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-900">
            {s.commonMaterials.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Iconography</h2>
        <p className="text-sm leading-relaxed text-gray-800">{s.iconographyDescription}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-amber-900">Modern relevance</h2>
        <p className="text-sm leading-relaxed text-gray-800">{s.modernRelevance}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Explore further</h2>
        <p className="text-sm text-gray-700">
          See the{' '}
          <Link href="/hindu-symbols" className="text-amber-700 underline">full symbol library</Link>,{' '}
          {s.deitySlug && (
            <>
              the{' '}
              <Link href={`/deity/${s.deitySlug}`} className="text-amber-700 underline">
                {s.associatedDeity.split('(')[0]?.trim() ?? ''} guide
              </Link>
              ,{' '}
            </>
          )}
          related{' '}
          <Link href="/chants" className="text-amber-700 underline">Sanskrit mantras</Link>, and the{' '}
          <Link href="/discover" className="text-amber-700 underline">complete wisdom library</Link>.
        </p>
      </section>

      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/hindu-symbols/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/hindu-symbols/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
