import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PANCHA_BHOOTA, getPanchaBhootaBySlug } from '../../../lib/pancha-bhoota';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getPanchaBhootaBySlug(slug);
  if (!t) return { title: 'Not found' };
  return {
    title: `${t.templeName} — ${t.element} Pancha Bhoota`,
    description: `${t.templeName} in ${t.city}, ${t.state} — the ${t.element} Pancha Bhoota Stalam. ${t.lingaForm.split('—')[0]?.trim() ?? ''}. Mantra, ritual, festival, travel guide.`,
    alternates: { canonical: `https://darshya.online/pancha-bhoota/${t.slug}` },
  };
}

const ELEMENT_THEME: Record<string, { bg: string; border: string; text: string }> = {
  'Earth (Prithvi)': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900' },
  'Water (Apas / Jala)': { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-900' },
  'Fire (Agni / Tejas)': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900' },
  'Air (Vayu)': { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-900' },
  'Ether / Space (Akasha)': { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-900' },
};

const FALLBACK_THEME = ELEMENT_THEME['Earth (Prithvi)'] ?? {
  bg: 'bg-amber-50',
  border: 'border-amber-300',
  text: 'text-amber-900',
};

export default async function PanchaBhootaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getPanchaBhootaBySlug(slug);
  if (!t) return notFound();

  const idx = PANCHA_BHOOTA.findIndex((p) => p.slug === t.slug);
  const prev = idx > 0 ? PANCHA_BHOOTA[idx - 1] : null;
  const next = idx < PANCHA_BHOOTA.length - 1 ? PANCHA_BHOOTA[idx + 1] : null;
  const theme = ELEMENT_THEME[t.element] ?? FALLBACK_THEME;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Pancha Bhoota', item: 'https://darshya.online/pancha-bhoota' },
      { '@type': 'ListItem', position: 3, name: t.templeName, item: `https://darshya.online/pancha-bhoota/${t.slug}` },
    ],
  };

  const placeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: t.templeName,
    description: `${t.element} Pancha Bhoota Stalam — ${t.lingaForm.split('—')[0]?.trim() ?? ''}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: t.city,
      addressRegion: t.state,
      addressCountry: 'IN',
    },
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${t.templeName} — ${t.element} Pancha Bhoota Stalam`,
    description: t.significance,
    inLanguage: 'en',
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-saffron-50 via-white to-amber-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <section className="mx-auto max-w-4xl px-4 py-10">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> /{' '}
          <Link href="/pancha-bhoota" className="hover:text-saffron-600">Pancha Bhoota</Link> /{' '}
          <span className="text-gray-900">{t.templeName}</span>
        </nav>

        <div className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${theme.border} ${theme.bg} ${theme.text} mb-3`}>
          {t.element} <span className="font-normal opacity-80">({t.elementSanskrit})</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">{t.templeName}</h1>
        <div className="text-2xl text-gray-700 mb-2">{t.templeSanskrit}</div>
        <div className="text-base text-gray-600 mb-6">{t.city}, {t.state}</div>

        <div className={`rounded-2xl border-2 ${theme.border} ${theme.bg} p-6 mb-8`}>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Mantra</div>
          <div className="text-2xl font-bold text-gray-900 mb-1" lang="sa">{t.mantra}</div>
          <div className="text-base text-gray-700 italic">{t.mantraEnglish}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl bg-white border border-saffron-200 p-5">
            <div className="text-xs font-semibold text-saffron-700 uppercase mb-1">Presiding Deity</div>
            <div className="text-base text-gray-900">{t.presidingDeity}</div>
          </div>
          <div className="rounded-xl bg-white border border-saffron-200 p-5">
            <div className="text-xs font-semibold text-saffron-700 uppercase mb-1">Consort</div>
            <div className="text-base text-gray-900">{t.consort}</div>
          </div>
        </div>

        <div className={`rounded-2xl border-2 ${theme.border} ${theme.bg} p-6 mb-8`}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Why this is the {t.element} sthalam</h2>
          <p className="text-gray-800 leading-relaxed">{t.whyThisElement}</p>
        </div>

        <div className="rounded-xl bg-white border border-saffron-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">The Lingam</h2>
          <p className="text-gray-700">{t.lingaForm}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
            <div className="text-xs font-semibold text-emerald-800 uppercase mb-1">Sthala Vriksha (sacred tree)</div>
            <div className="text-sm text-gray-800">{t.sthalaVriksha}</div>
          </div>
          <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-5">
            <div className="text-xs font-semibold text-cyan-800 uppercase mb-1">Theertham (sacred water)</div>
            <div className="text-sm text-gray-800">{t.theertham}</div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-saffron-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Signature ritual</h2>
          <p className="text-gray-700">{t.signatureRitual}</p>
        </div>

        <div className="rounded-xl bg-white border border-saffron-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Major festival</h2>
          <p className="text-gray-700">{t.majorFestival}</p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Significance</h2>
          <p className="text-gray-800">{t.significance}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-white border border-saffron-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Best Season</div>
            <div className="text-sm text-gray-900">{t.bestSeason}</div>
          </div>
          <div className="rounded-xl bg-white border border-saffron-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Nearest Airport</div>
            <div className="text-sm text-gray-900">{t.nearestAirport}</div>
          </div>
          <div className="rounded-xl bg-white border border-saffron-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Associated Saint</div>
            <div className="text-sm text-gray-900">{t.associatedSaint}</div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-saffron-200">
          {prev ? (
            <Link href={`/pancha-bhoota/${prev.slug}`} className="text-saffron-700 hover:text-saffron-900 text-sm">
              ← {prev.templeName.split(' Temple')[0]}
            </Link>
          ) : <span />}
          <Link href="/pancha-bhoota" className="text-sm text-gray-600 hover:text-gray-900">All five</Link>
          {next ? (
            <Link href={`/pancha-bhoota/${next.slug}`} className="text-saffron-700 hover:text-saffron-900 text-sm">
              {next.templeName.split(' Temple')[0]} →
            </Link>
          ) : <span />}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/jyotirlinga" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
            12 Jyotirlingas
          </Link>
          <Link href="/tirth" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
            Tirth destinations
          </Link>
          <Link href="/pilgrimage" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Pilgrimage circuits
          </Link>
        </div>
      </section>
    </main>
  );
}
