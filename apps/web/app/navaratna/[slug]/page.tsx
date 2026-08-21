import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NAVARATNA, NAVARATNA_SLUGS, getNavaratnaBySlug } from '../../../lib/navaratna';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return NAVARATNA_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const n = getNavaratnaBySlug(slug);
  if (!n) return { title: 'Not found' };
  return {
    title: `${n.englishName} (${n.hindiName}) — ${n.planet} Gem`,
    description: `${n.englishName} / ${n.hindiName} / ${n.sanskritName} — sacred Vedic gem for ${n.planet}. Finger, metal, weight, day to wear, mantra, benefits, who-should-not-wear, side-effects, quality, price range.`,
    alternates: { canonical: `https://darshya.online/navaratna/${n.slug}` },
  };
}

export default async function NavaratnaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = getNavaratnaBySlug(slug);
  if (!n) return notFound();

  const idx = NAVARATNA.findIndex((x) => x.slug === n.slug);
  const prev = idx > 0 ? NAVARATNA[idx - 1] : null;
  const next = idx < NAVARATNA.length - 1 ? NAVARATNA[idx + 1] : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Navaratna', item: 'https://darshya.online/navaratna' },
      { '@type': 'ListItem', position: 3, name: n.englishName, item: `https://darshya.online/navaratna/${n.slug}` },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${n.englishName} (${n.hindiName}) — Vedic Gem for ${n.planet}`,
    description: `${n.englishName} is the Navaratna gem associated with ${n.planet}. ${n.benefits[0]}.`,
    inLanguage: 'en',
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-saffron-50 via-white to-amber-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <section className="mx-auto max-w-4xl px-4 py-10">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> /{' '}
          <Link href="/navaratna" className="hover:text-saffron-600">Navaratna</Link> /{' '}
          <span className="text-gray-900">{n.englishName}</span>
        </nav>

        <div className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-saffron-100 text-saffron-900 border border-saffron-300 mb-3">
          Gem #{n.number} of 9
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">{n.englishName}</h1>
        <div className="text-2xl text-gray-700 mb-1">{n.hindiName} · {n.sanskritName}</div>
        <div className="text-base text-gray-600 mb-1" lang="sa">{n.sanskritDevanagari}</div>
        <div className="text-base text-gray-600 italic mb-6">{n.alternateNames}</div>

        <div className="rounded-2xl bg-white border-2 border-saffron-300 p-6 mb-6">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Ruling Planet</div>
          <Link href={`/nava-graha/${n.planetSlug}`} className="text-2xl font-bold text-saffron-900 hover:text-saffron-700">
            {n.planet} →
          </Link>
        </div>

        <div className="rounded-2xl bg-saffron-50 border-2 border-saffron-300 p-6 mb-8">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Beej Mantra (108 times before wearing)</div>
          <div className="text-2xl font-bold text-gray-900 mb-1" lang="sa">{n.mantraBeforeWear}</div>
          <div className="text-base text-gray-700 italic">{n.mantraBeforeWearEnglish}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-xl bg-white border border-saffron-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Finger</div>
            <div className="text-sm text-gray-900">{n.finger}</div>
          </div>
          <div className="rounded-xl bg-white border border-saffron-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Metal</div>
            <div className="text-sm text-gray-900">{n.metal}</div>
          </div>
          <div className="rounded-xl bg-white border border-saffron-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Weight</div>
            <div className="text-sm text-gray-900">{n.weight}</div>
          </div>
          <div className="rounded-xl bg-white border border-saffron-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Day</div>
            <div className="text-sm text-gray-900">{n.dayToWear}</div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-saffron-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Best time to wear</h2>
          <p className="text-gray-700">{n.timeToWear}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
            <div className="text-xs font-semibold text-emerald-800 uppercase mb-2">Who should wear</div>
            <p className="text-sm text-gray-800">{n.whoShouldWear}</p>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-5">
            <div className="text-xs font-semibold text-rose-800 uppercase mb-2">Who should NOT wear</div>
            <p className="text-sm text-gray-800">{n.whoShouldNotWear}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-saffron-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Benefits</h2>
          <ul className="space-y-1 text-gray-700">
            {n.benefits.map((b) => <li key={b}>• {b}</li>)}
          </ul>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-300 p-5 mb-6">
          <div className="text-xs font-semibold text-amber-900 uppercase mb-2">Side-effects if worn wrong</div>
          <p className="text-sm text-gray-800">{n.sideEffectsIfWrong}</p>
        </div>

        <div className="rounded-xl bg-white border border-saffron-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Color &amp; composition</h2>
          <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Color:</span> {n.color}</p>
          <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Mineral:</span> {n.mineralComposition}</p>
          <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Hardness (Mohs):</span> {n.hardnessMohs}</p>
          <p className="text-sm text-gray-700"><span className="font-medium">Primary origin:</span> {n.primaryOrigin}</p>
        </div>

        <div className="rounded-xl bg-white border border-saffron-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Quality indicators (avoiding fakes)</h2>
          <p className="text-sm text-gray-700">{n.qualityIndicators}</p>
        </div>

        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Price range (approximate, 2025-26 India)</h2>
          <p className="text-sm text-gray-800">{n.averagePriceRange}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-white border border-saffron-200 p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Affordable substitutes</div>
            <p className="text-sm text-gray-800">{n.substitutes}</p>
          </div>
          <div className="rounded-xl bg-white border border-saffron-200 p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Trial duration</div>
            <p className="text-sm text-gray-800">{n.trialDuration}</p>
          </div>
        </div>

        <div className="rounded-xl bg-red-50 border-2 border-red-300 p-5 mb-8">
          <div className="text-xs font-semibold text-red-900 uppercase mb-2">Critical cautions</div>
          <p className="text-sm text-gray-800">{n.cautions}</p>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-saffron-200">
          {prev ? (
            <Link href={`/navaratna/${prev.slug}`} className="text-saffron-700 hover:text-saffron-900 text-sm">
              ← {prev.englishName}
            </Link>
          ) : <span />}
          <Link href="/navaratna" className="text-sm text-gray-600 hover:text-gray-900">All 9 gems</Link>
          {next ? (
            <Link href={`/navaratna/${next.slug}`} className="text-saffron-700 hover:text-saffron-900 text-sm">
              {next.englishName} →
            </Link>
          ) : <span />}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/nava-graha/${n.planetSlug}`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            About {n.planet}
          </Link>
          <Link href="/astrology" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
            Book astrology consult before buying
          </Link>
          <Link href="/rashi" className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">
            12 Rashi
          </Link>
        </div>
      </section>
      {detailCta({
        routePrefix: 'navaratna',
        subject: n.englishName,
      })}
    </main>
  );
}
