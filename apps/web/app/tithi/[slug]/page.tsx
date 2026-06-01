import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TITHIS, getTithiBySlug } from '../../../lib/tithis';

export const runtime = 'edge';
export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTithiBySlug(slug);
  if (!t) return { title: 'Tithi not found' };
  return {
    title: `${t.name} (${t.sanskrit}) — Lunar Day, Deity, Vrata, Mantra | Darshya`,
    description: `${t.name} tithi: presiding deity ${t.presidingDeity}. ${t.shuklaSignificance.slice(0, 110)}…`,
    alternates: { canonical: `https://darshya.online/tithi/${t.slug}` },
  };
}

const CATEGORY_COLOR: Record<string, string> = {
  nanda: 'bg-rose-100 text-rose-900 border-rose-300',
  bhadra: 'bg-amber-100 text-amber-900 border-amber-300',
  jaya: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  rikta: 'bg-slate-100 text-slate-700 border-slate-300',
  purna: 'bg-indigo-100 text-indigo-900 border-indigo-300',
};

export default async function TithiDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tithi = getTithiBySlug(slug);
  if (!tithi) notFound();

  const idx = TITHIS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? TITHIS[idx - 1] : null;
  const next = idx < TITHIS.length - 1 ? TITHIS[idx + 1] : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Tithis', item: 'https://darshya.online/tithi' },
      { '@type': 'ListItem', position: 3, name: tithi.name, item: `https://darshya.online/tithi/${tithi.slug}` },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${tithi.name} (${tithi.sanskrit}) — Lunar Day Significance`,
    description: tithi.shuklaSignificance,
    inLanguage: 'en-IN',
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `https://darshya.online/tithi/${tithi.slug}`,
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <section className="mx-auto max-w-4xl px-4 py-10">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> /{' '}
          <Link href="/tithi" className="hover:text-saffron-600">Tithis</Link> /{' '}
          <span className="text-gray-900">{tithi.name}</span>
        </nav>

        <div className="flex items-baseline gap-4 mb-1">
          <span className="text-sm font-semibold text-indigo-600">Tithi {tithi.number}</span>
          <span className={`text-xs px-2 py-1 rounded border ${CATEGORY_COLOR[tithi.category]}`}>{tithi.category}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-1">{tithi.name}</h1>
        <p className="text-2xl text-gray-700 mb-4">{tithi.sanskrit}</p>
        <p className="text-lg text-gray-700">
          <span className="font-semibold">Presiding deity:</span> {tithi.presidingDeity}
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="rounded-xl bg-white border-2 border-indigo-300 p-6">
          <div className="text-xs uppercase tracking-wider text-indigo-600 mb-2">Tithi Mantra</div>
          <div className="text-3xl text-indigo-900 mb-2" style={{ fontFamily: 'serif' }}>
            {tithi.mantra}
          </div>
          <div className="text-base text-gray-700 italic">{tithi.mantraEnglish}</div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
            <div className="text-xs uppercase tracking-wider text-amber-700 mb-2 font-semibold">Shukla Paksha (waxing)</div>
            <p className="text-sm text-gray-800">{tithi.shuklaSignificance}</p>
          </div>
          <div className="rounded-xl bg-slate-100 border border-slate-300 p-5">
            <div className="text-xs uppercase tracking-wider text-slate-700 mb-2 font-semibold">Krishna Paksha (waning)</div>
            <p className="text-sm text-gray-800">{tithi.krishnaSignificance}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
            <h3 className="text-sm font-semibold text-emerald-800 mb-2 uppercase tracking-wider">Best for</h3>
            <ul className="space-y-1 text-sm text-gray-800">
              {tithi.bestFor.map((b) => (
                <li key={b}>+ {b}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-5">
            <h3 className="text-sm font-semibold text-rose-800 mb-2 uppercase tracking-wider">Avoid for</h3>
            <ul className="space-y-1 text-sm text-gray-800">
              {tithi.avoidFor.map((a) => (
                <li key={a}>- {a}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="rounded-xl bg-white border border-gray-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Fasting tradition</h3>
          <p className="text-sm text-gray-700">{tithi.fastingTradition}</p>
        </div>
        <div className="rounded-xl bg-saffron-50 border border-saffron-200 p-5">
          <h3 className="font-semibold text-saffron-900 mb-2">Major festivals on this tithi</h3>
          <p className="text-sm text-gray-800">{tithi.majorFestivals}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-10">
        <div className="flex flex-wrap gap-3">
          <Link href="/vrat" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
            Vrata traditions
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
            Festival calendar
          </Link>
          <Link href="/today" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Today&apos;s panchang
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          {prev ? (
            <Link href={`/tithi/${prev.slug}`} className="text-sm text-indigo-600 hover:underline">
              &lt; {prev.name}
            </Link>
          ) : (
            <span />
          )}
          <Link href="/tithi" className="text-sm text-gray-600 hover:text-gray-900">
            All tithis
          </Link>
          {next ? (
            <Link href={`/tithi/${next.slug}`} className="text-sm text-indigo-600 hover:underline">
              {next.name} &gt;
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>
    </main>
  );
}
