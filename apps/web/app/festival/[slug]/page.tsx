// Per-festival page: date, deity, rituals, fasting rules, available pujas.
// Programmatic-SEO for "{festival} 2026 puja online" + "{festival} rituals"
// long-tail queries. Spikes hard during festival weeks.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  FESTIVAL_ALIASES,
  FESTIVALS,
  getFestival,
  resolveBookablePujas,
  resolveFestivalSlug,
} from '../../../lib/festivals';
import { getCatalogueSlugs } from '../../../lib/puja-catalogue';
import { buttonClass } from '../../../components/ui/button-recipe';
import { EnrichedAbout } from '../../../components/seo/EnrichedAbout';
import { ENRICHMENT } from '../../../lib/enrich';
import { FestivalCountdownBadge } from '../FestivalLive';

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  // CI-03: the retired duplicate slugs stay in the prerender set. `dynamicParams`
  // is false, so a slug that is not listed here 404s outright — and these were
  // live, indexed URLs. They render as permanent redirects instead.
  return [
    ...FESTIVALS.map((f) => ({ slug: f.slug })),
    ...Object.keys(FESTIVAL_ALIASES).map((slug) => ({ slug })),
  ];
}

interface Params {
  params: Promise<{ slug: string }>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * CI-11: the year a festival is actually observed in, read off its own date
 * rather than hardcoded. `date2026` is not always in 2026 — Maha Kumbh Mela's
 * next occurrence is 2027-01-14, and the page used to title it
 * "Maha Kumbh Mela 2026 — 14 January 2027".
 */
function festivalYear(iso: string): string {
  return iso.slice(0, 4);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const f = getFestival(resolveFestivalSlug(slug));
  if (!f) return { title: 'Festival' };
  const year = festivalYear(f.date2026);
  return {
    title: `${f.name} ${year} — ${fmtDate(f.date2026)}, rituals, pujas online`,
    description: `${f.name} ${year} on ${fmtDate(f.date2026)}. ${f.description.slice(0, 120)} Book ${f.deity} pujas with pandits + video proof.`,
    alternates: { canonical: `https://darshya.online/festival/${f.slug}` },
    openGraph: {
      title: `${f.name} ${year} — ${fmtDate(f.date2026)}`,
      description: `${f.deity} · ${f.fastingType} fast · ${f.rituals.length} rituals`,
      url: `https://darshya.online/festival/${f.slug}`,
      type: 'website',
      images: ['/og/default.png'],
    },
  };
}

export default async function FestivalPage({ params }: Params) {
  const { slug } = await params;
  // CI-03: one festival, one page. A retired duplicate slug redirects to the
  // survivor rather than serving a second copy on a different date.
  const canonical = resolveFestivalSlug(slug);
  if (canonical !== slug) permanentRedirect(`/festival/${canonical}`);
  const f = getFestival(canonical);
  if (!f) notFound();

  // DF-02: only slugs the live catalogue confirms become booking links.
  const bookable = resolveBookablePujas(f.pujasAvailable, await getCatalogueSlugs());

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
          <FestivalCountdownBadge iso={f.date2026} />
        </div>
        <h1 className={`${H1.catalogue} mb-2`}>
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

      {/* DF-02 (prod sweep 2026-08-12): this block used to render every entry of
          the hand-written `pujasAvailable` as a booking link. 84 of the 87 slugs
          the calendar names are not in the catalogue, so 81% of the orange
          "Book with pandit" CTAs 404'd. Links are now the intersection
          with the live catalogue; when that intersection is empty the section
          says so and routes to the catalogue instead of pretending. */}
      {bookable.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-surface-900 mb-4">
            Book {f.name} pujas online
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bookable.map((slug) => (
              <Link
                key={slug}
                href={`/pujas/${slug}`}
                className="block rounded-lg border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:shadow-sm transition"
              >
                <p className="text-sm font-semibold text-surface-900 capitalize">
                  {slug.replace(/-/g, ' ')}
                </p>
                <p className="text-xs text-saffron-700 mt-1">Book with pandit →</p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-surface-900 mb-4">
            Book a puja for {f.name}
          </h2>
          <p className="text-sm text-surface-700">
            No {f.deity} puja is bookable on Darshya for this festival yet. Browse the full
            catalogue — every listing there has a pandit and a confirmed price.
          </p>
          <Link
            href="/pujas"
            className={buttonClass('primary', 'md', 'mt-3')}
          >
            Browse all pujas →
          </Link>
        </section>
      )}

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

<EnrichedAbout name={f.name} data={ENRICHMENT.festivals[f.slug]} />
      <footer className="border-t border-surface-200 pt-6 text-sm text-surface-600">
        <p className="mb-2">
          <strong>Note:</strong> Dates are approximate per the {festivalYear(f.date2026)} lunar calendar. Tithis vary slightly by region — confirm with{' '}
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
