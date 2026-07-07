import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VEDIC_MONTHS, getVedicMonthBySlug } from '../../../lib/vedic-months';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = getVedicMonthBySlug(slug);
  if (!m) return { title: 'Month not found' };
  return {
    title: `${m.name} (${m.sanskrit}) — ${m.gregorianRange} | Vedic Months | Darshya`,
    description: `${m.name} masa: ${m.significance.slice(0, 130)}…`,
    alternates: { canonical: `https://darshya.online/masa/${m.slug}` },
  };
}

export default async function MasaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const month = getVedicMonthBySlug(slug);
  if (!month) notFound();

  const idx = VEDIC_MONTHS.findIndex((x) => x.slug === slug);
  // notFound() above guarantees idx >= 0, so the modular index always resolves;
  // `?? month` only satisfies TS under noUncheckedIndexedAccess.
  const prev = (idx > 0 ? VEDIC_MONTHS[idx - 1] : VEDIC_MONTHS[VEDIC_MONTHS.length - 1]) ?? month;
  const next = (idx < VEDIC_MONTHS.length - 1 ? VEDIC_MONTHS[idx + 1] : VEDIC_MONTHS[0]) ?? month;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Vedic Months', item: 'https://darshya.online/masa' },
      { '@type': 'ListItem', position: 3, name: month.name, item: `https://darshya.online/masa/${month.slug}` },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${month.name} (${month.sanskrit}) — Vedic Month`,
    description: month.significance,
    inLanguage: 'en-IN',
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `https://darshya.online/masa/${month.slug}`,
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-saffron-50 via-white to-amber-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <section className="mx-auto max-w-4xl px-4 py-10">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> /{' '}
          <Link href="/masa" className="hover:text-saffron-600">Vedic Months</Link> /{' '}
          <span className="text-gray-900">{month.name}</span>
        </nav>

        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-sm font-semibold text-saffron-600">Month {month.number}</span>
          <span className="text-xs text-gray-500">{month.gregorianRange}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-1">{month.name}</h1>
        <p className="text-2xl text-gray-700 mb-4">{month.sanskrit}</p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="rounded-xl bg-white border-2 border-saffron-300 p-6">
          <div className="text-xs uppercase tracking-wider text-saffron-600 mb-2">Presiding Mantra</div>
          <div className="text-3xl text-saffron-900 mb-2" style={{ fontFamily: 'serif' }}>
            {month.mantra}
          </div>
          <div className="text-base text-gray-700 italic">{month.mantraEnglish}</div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="text-xs uppercase text-amber-700">Ritu (Season)</div>
            <div className="text-sm text-amber-900 font-medium">{month.ritu}</div>
            <div className="text-xs text-gray-600">{month.rituSanskrit}</div>
          </div>
          <div className="rounded-lg bg-saffron-50 border border-saffron-200 p-3">
            <div className="text-xs uppercase text-saffron-700">Presiding Aditya</div>
            <div className="text-sm text-saffron-900 font-medium">{month.presidingAditya}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <div className="text-xs uppercase text-emerald-700">Deity</div>
            <div className="text-sm text-emerald-900 font-medium">{month.presidingDeity}</div>
          </div>
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
            <div className="text-xs uppercase text-indigo-700">Gregorian</div>
            <div className="text-sm text-indigo-900 font-medium">{month.gregorianRange}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="rounded-xl bg-white border border-gray-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Significance</h3>
          <p className="text-sm text-gray-700">{month.significance}</p>
        </div>
        <div className="rounded-xl bg-saffron-50 border border-saffron-200 p-5 mb-4">
          <h3 className="font-semibold text-saffron-900 mb-2">Major Festivals</h3>
          <p className="text-sm text-gray-800">{month.majorFestivals}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-4">
          <h3 className="font-semibold text-emerald-900 mb-2">Major Vrata</h3>
          <p className="text-sm text-gray-800">{month.majorVrata}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-5">
          <h3 className="font-semibold text-indigo-900 mb-2">Ritual Character</h3>
          <p className="text-sm text-gray-800">{month.ritualCharacter}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-10">
        <div className="flex flex-wrap gap-3">
          <Link href="/tithi" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            30 Tithis
          </Link>
          <Link href="/aditya" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
            12 Adityas
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
            Festival calendar
          </Link>
          <Link href="/vrat" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Vrata traditions
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Link href={`/masa/${prev.slug}`} className="text-sm text-saffron-600 hover:underline">
            &lt; {prev.name}
          </Link>
          <Link href="/masa" className="text-sm text-gray-600 hover:text-gray-900">
            All months
          </Link>
          <Link href={`/masa/${next.slug}`} className="text-sm text-saffron-600 hover:underline">
            {next.name} &gt;
          </Link>
        </div>
      </section>
    </main>
  );
}
