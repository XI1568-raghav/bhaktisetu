import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RASHI_PROFILES, rashiProfileSlugs, getRashiProfile } from '../../../lib/rashi-profiles';
import { getRashi, pujasForRashi } from '../../../lib/rashis';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return rashiProfileSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = getRashiProfile(slug);
  if (!r) return { title: 'Rashi not found' };
  const cap = slug.charAt(0).toUpperCase() + slug.slice(1);

  const title = `${r.sanskritEnglish} Rashi (${cap}) — Traits, Compatibility, Lucky Stone | Darshya`;
  const description = `${r.sanskritEnglish} (${cap}) rashi profile: ${r.qualities.slice(0, 3).join(', ')}. Gemstone ${r.gemstone}, lucky day ${r.luckyDay}. Career, marriage compatibility, spiritual practice.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/rashi/${r.slug}` },
    openGraph: {
      title: `${r.sanskritEnglish} (${cap}) Rashi — Vedic Astrology`,
      description,
      url: `${BASE_URL}/rashi/${r.slug}`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

function jsonLd(r: NonNullable<ReturnType<typeof getRashiProfile>>, cap: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Rashis', item: `${BASE_URL}/rashi` },
        { '@type': 'ListItem', position: 3, name: `${r.sanskritEnglish} (${cap})`, item: `${BASE_URL}/rashi/${r.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${r.sanskritEnglish} (${cap}) Rashi — Vedic Astrology Profile`,
      description: r.qualities.join(', '),
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-05-27',
      mainEntityOfPage: `${BASE_URL}/rashi/${r.slug}`,
    },
  ];
}

const elementColor: Record<string, string> = {
  Fire: 'bg-rose-100 text-rose-800 border-rose-300',
  Earth: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Air: 'bg-sky-100 text-sky-800 border-sky-300',
  Water: 'bg-blue-100 text-blue-800 border-blue-300',
};

export default async function RashiDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = getRashiProfile(slug);
  if (!r) notFound();
  const horo = getRashi(slug);
  const cap = slug.charAt(0).toUpperCase() + slug.slice(1);
  const element = horo?.element.split(' ')[0] || 'Fire';
  const suggestedPujas = horo ? pujasForRashi(horo) : [];

  const idx = RASHI_PROFILES.findIndex((x) => x.slug === r.slug);
  const prev = idx > 0 ? RASHI_PROFILES[idx - 1] : null;
  const next = idx < RASHI_PROFILES.length - 1 ? RASHI_PROFILES[idx + 1] : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(r, cap)) }}
      />

      <nav className="text-xs text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/rashi" className="hover:text-saffron-700">Rashis</Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900">{r.sanskritEnglish}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2 text-xs text-surface-600 font-mono">
          <span>Rashi #{idx + 1} of 12</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-2 leading-tight">
          {r.sanskritEnglish}
          <span className="text-surface-500 text-xl sm:text-2xl font-normal ml-3">
            {r.sanskritName} · {cap}
          </span>
        </h1>
        <p className="text-surface-700 text-base sm:text-lg italic">
          Symbol: {r.symbol} · Quality: {r.quality}
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Ruling Planet</div>
          <div className="font-bold text-surface-900">{horo?.rulingPlanet || '—'}</div>
        </div>
        <div className={`rounded-lg border p-3 ${elementColor[element]}`}>
          <div className="text-xs mb-0.5 opacity-80">Element</div>
          <div className="font-bold">{element}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Lucky Day</div>
          <div className="font-bold text-surface-900">{r.luckyDay}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Gemstone</div>
          <div className="font-bold text-surface-900 text-sm">{r.gemstone}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Vedic Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-surface-600 mb-0.5">Sidereal Range</div>
            <div className="text-surface-900 font-mono text-xs">{r.range}</div>
          </div>
          <div>
            <div className="text-xs text-surface-600 mb-0.5">Body (Ayurveda)</div>
            <div className="text-surface-900">{r.bodyPart}</div>
          </div>
          <div>
            <div className="text-xs text-surface-600 mb-0.5">Metal</div>
            <div className="text-surface-900">{r.metal}</div>
          </div>
          {horo && (
            <div>
              <div className="text-xs text-surface-600 mb-0.5">Lucky Numbers</div>
              <div className="text-surface-900">{horo.luckyNumber}, {horo.luckyNumber + 9}, {horo.luckyNumber + 18}</div>
            </div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Personality & Qualities</h2>
        <div className="flex flex-wrap gap-2">
          {r.qualities.map((q) => (
            <span
              key={q}
              className="px-3 py-1 text-sm bg-saffron-50 border border-saffron-200 text-saffron-800 rounded-full"
            >
              {q}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Career & Profession</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{r.career}</p>
      </section>

      <section className="mb-8 rounded-xl border border-pink-200 bg-pink-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Marriage Compatibility</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{r.compatibility}</p>
      </section>

      <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Health Tendencies</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{r.healthTendencies}</p>
      </section>

      <section className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Spiritual Practice (Sadhana)</h2>
        <p className="text-surface-700 text-sm leading-relaxed mb-3">{r.spiritualPractice}</p>
        <div className="bg-white border border-emerald-300 rounded-md p-3 mb-3">
          <div className="text-xs text-emerald-700 font-semibold mb-1">Beej Mantra</div>
          <div className="font-mono text-sm text-surface-900">{r.beejMantra}</div>
        </div>
        {suggestedPujas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedPujas.map((p) => (
              <Link
                key={p}
                href={`/pujas/${p}`}
                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Book {p.replace(/-/g, ' ')} →
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Get today&apos;s {r.sanskritEnglish} rashifal
        </h2>
        <p className="text-surface-700 text-sm mb-4">
          Daily horoscope prediction with career, love, health guidance.
        </p>
        <Link
          href={`/astrology/horoscope/${slug}`}
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          Today&apos;s {cap} horoscope →
        </Link>
      </section>

      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-surface-200">
        {prev ? (
          <Link
            href={`/rashi/${prev.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            ← {prev.sanskritEnglish}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/rashi" className="text-sm text-surface-600 hover:text-saffron-700">
          All 12 rashis
        </Link>
        {next ? (
          <Link
            href={`/rashi/${next.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            {next.sanskritEnglish} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
