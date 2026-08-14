import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NAKSHATRAS, nakshatraSlugs, getNakshatra } from '../../../lib/nakshatras';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return nakshatraSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const n = getNakshatra(slug);
  if (!n) return { title: 'Nakshatra not found' };

  const title = `${n.name} Nakshatra (${n.sanskritName}) — Lord ${n.lord}, Deity ${n.deity}`;
  const description = `${n.name} nakshatra: ${n.meaning}. Ruled by ${n.lord}, deity ${n.deity}. ${n.gana} gana. Full guide — qualities, career, marriage compatibility, spiritual practice.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/nakshatra/${n.slug}` },
    openGraph: {
      title: `${n.name} Nakshatra — Vedic Astrology`,
      description: n.meaning,
      url: `${BASE_URL}/nakshatra/${n.slug}`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

function jsonLd(n: NonNullable<ReturnType<typeof getNakshatra>>) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Nakshatras', item: `${BASE_URL}/nakshatra` },
        { '@type': 'ListItem', position: 3, name: n.name, item: `${BASE_URL}/nakshatra/${n.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${n.name} Nakshatra — Vedic Astrology Guide`,
      description: n.meaning,
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-05-27',
      mainEntityOfPage: `${BASE_URL}/nakshatra/${n.slug}`,
    },
  ];
}

const ganaColor: Record<string, string> = {
  Deva: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Manushya: 'bg-blue-100 text-blue-800 border-blue-300',
  Rakshasa: 'bg-rose-100 text-rose-800 border-rose-300',
};

export default async function NakshatraDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const n = getNakshatra(slug);
  if (!n) notFound();

  const idx = NAKSHATRAS.findIndex((x) => x.slug === n.slug);
  const prev = idx > 0 ? NAKSHATRAS[idx - 1] : null;
  const next = idx < NAKSHATRAS.length - 1 ? NAKSHATRAS[idx + 1] : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(n)) }}
      />

      <nav className="text-xs text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/nakshatra" className="hover:text-saffron-700">Nakshatras</Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900">{n.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2 text-xs text-surface-600 font-mono">
          <span>Nakshatra #{idx + 1} of 27</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-2 leading-tight">
          {n.name}
          <span className="text-surface-500 text-xl sm:text-2xl font-normal ml-3">
            {n.sanskritName}
          </span>
        </h1>
        <p className="text-surface-700 text-base sm:text-lg italic">{n.meaning}</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Lord (Ruling Planet)</div>
          <div className="font-bold text-surface-900">{n.lord}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Deity</div>
          <div className="font-bold text-surface-900">{n.deity}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Rashi (Zodiac)</div>
          <div className="font-bold text-surface-900">{n.rashi}</div>
        </div>
        <div className={`rounded-lg border p-3 ${ganaColor[n.gana]}`}>
          <div className="text-xs mb-0.5 opacity-80">Gana</div>
          <div className="font-bold">{n.gana}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Symbol & Range</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-surface-600 mb-0.5">Symbol</div>
            <div className="text-surface-900 font-medium">{n.symbol}</div>
          </div>
          <div>
            <div className="text-xs text-surface-600 mb-0.5">Zodiac Range</div>
            <div className="text-surface-900 font-mono">{n.range}</div>
          </div>
          <div>
            <div className="text-xs text-surface-600 mb-0.5">Padas (Quarters)</div>
            <div className="text-surface-900">{n.padas}</div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Personality & Qualities</h2>
        <div className="flex flex-wrap gap-2">
          {n.qualities.map((q) => (
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
        <p className="text-surface-700 text-sm leading-relaxed">{n.career}</p>
      </section>

      <section className="mb-8 rounded-xl border border-pink-200 bg-pink-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Marriage Compatibility</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{n.compatibility}</p>
      </section>

      <section className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Spiritual Practice (Sadhana)</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{n.spiritualPractice}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/pujas"
            className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            Book a puja →
          </Link>
          <Link
            href="/ask-pandit"
            className="text-xs px-3 py-1.5 border border-emerald-600 text-emerald-700 rounded-md hover:bg-emerald-100"
          >
            Ask a pandit
          </Link>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Get your full Vedic chart</h2>
        <p className="text-surface-700 text-sm mb-4">
          Free birth chart with janma nakshatra, rashi, lagna, and Vimshottari dasha periods.
        </p>
        <Link
          href="/astrology"
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          Free Kundli →
        </Link>
      </section>

      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-surface-200">
        {prev ? (
          <Link
            href={`/nakshatra/${prev.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/nakshatra" className="text-sm text-surface-600 hover:text-saffron-700">
          All 27 nakshatras
        </Link>
        {next ? (
          <Link
            href={`/nakshatra/${next.slug}`}
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
