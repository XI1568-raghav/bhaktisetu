// Per-festival page: date, deity, rituals, fasting rules, available pujas.
// Programmatic-SEO for "{festival} 2026 puja online" + "{festival} rituals"
// long-tail queries. Spikes hard during festival weeks.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FESTIVALS, getFestival } from '../../../lib/festivals';

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return FESTIVALS.map((f) => ({ slug: f.slug }));
}

interface Params {
  params: Promise<{ slug: string }>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(iso: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const target = new Date(iso);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const f = getFestival(slug);
  if (!f) return { title: 'Festival — Darshya' };
  return {
    title: `${f.name} 2026 — ${fmtDate(f.date2026)}, rituals, pujas online`,
    description: `${f.name} 2026 on ${fmtDate(f.date2026)}. ${f.description.slice(0, 120)} Book ${f.deity} pujas with verified pandits + video proof.`,
    alternates: { canonical: `https://darshya.online/festival/${f.slug}` },
    openGraph: {
      title: `${f.name} 2026 — ${fmtDate(f.date2026)}`,
      description: `${f.deity} · ${f.fastingType} fast · ${f.rituals.length} rituals`,
      url: `https://darshya.online/festival/${f.slug}`,
      type: 'website',
      images: ['/og/default.png'],
    },
  };
}

export default async function FestivalPage({ params }: Params) {
  const { slug } = await params;
  const f = getFestival(slug);
  if (!f) notFound();

  const days = daysUntil(f.date2026);
  const isPast = days < 0;
  const isToday = days === 0;
  const isSoon = days > 0 && days <= 30;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: f.name,
    alternateName: f.sanskrit,
    startDate: f.date2026,
    description: f.description,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: `https://darshya.online/festival/${f.slug}`,
    },
    organizer: { '@type': 'Organization', name: 'Darshya', url: 'https://darshya.online' },
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/festival" className="hover:text-saffron-700">Festivals</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">{f.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
            📅 {fmtDate(f.date2026)}
          </span>
          {isToday ? (
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-white bg-saffron-700 rounded-full">
              Today
            </span>
          ) : isSoon ? (
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
              In {days} days
            </span>
          ) : isPast ? (
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-surface-600 bg-surface-100 rounded-full">
              Returns next year
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2">
          {f.name} <span className="text-2xl font-serif text-surface-500 ml-2">{f.sanskrit}</span>
        </h1>
        <p className="text-sm text-surface-600 mb-4">
          {f.deity} · {f.fastingType === 'full' ? 'Full-day vrat' : f.fastingType === 'partial' ? 'Partial fasting' : 'No fasting required'}
        </p>
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          {f.description}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">
            Rituals (vidhi)
          </h2>
          <ul className="space-y-2">
            {f.rituals.map((r, i) => (
              <li key={i} className="text-sm text-surface-800 leading-relaxed">
                <span className="text-saffron-700 font-semibold mr-2">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-saffron-200 bg-saffron-50 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-3">
            Significance
          </h2>
          <p className="text-sm text-surface-800 leading-relaxed">{f.significance}</p>
          {f.deitySlug ? (
            <Link
              href={`/deity/${f.deitySlug}`}
              className="mt-3 inline-block text-xs font-semibold text-saffron-700 hover:underline"
            >
              Learn more about {f.deity} →
            </Link>
          ) : null}
        </div>
      </section>

      {f.pujasAvailable.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-surface-900 mb-4">
            Book {f.name} pujas online
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {f.pujasAvailable.map((slug) => (
              <Link
                key={slug}
                href={`/pujas/${slug}`}
                className="block rounded-lg border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:shadow-sm transition"
              >
                <p className="text-sm font-semibold text-surface-900 capitalize">
                  {slug.replace(/-/g, ' ')}
                </p>
                <p className="text-xs text-saffron-700 mt-1">Book with verified pandit →</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Other festivals this year</h2>
        <div className="flex flex-wrap gap-2">
          {FESTIVALS.filter((x) => x.slug !== f.slug)
            .slice(0, 8)
            .map((x) => (
              <Link
                key={x.slug}
                href={`/festival/${x.slug}`}
                className="inline-block px-3 py-1.5 rounded-full border border-surface-200 bg-white text-xs text-surface-700 hover:border-saffron-300 hover:text-saffron-700"
              >
                {x.name}
              </Link>
            ))}
        </div>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-sm text-surface-600">
        <p className="mb-2">
          <strong>Note:</strong> Dates are approximate per the 2026 lunar calendar. Tithis vary slightly by region — confirm with{' '}
          <Link href="/panchang" className="text-saffron-700 hover:underline">Darshya Panchang</Link>{' '}
          for your city.
        </p>
        <Link href="/festival" className="text-saffron-700 hover:underline">
          ← All festivals
        </Link>
      </footer>
    </main>
  );
}
