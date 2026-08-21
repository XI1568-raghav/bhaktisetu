import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Compass, ExternalLink } from 'lucide-react';
import {
  getDestinationBySlug,
  destinationSlugs,
  formatINRPrice,
  type AffiliatePartner,
} from '../../../../lib/yatra-destinations';
import { remoteImage, remoteSrcSet, IMG_W } from '../../../../lib/images';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../../lib/detail-route-cta';

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return destinationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) return {};
  const url = `https://darshya.online/yatra/destinations/${dest.slug}`;
  const title = `${dest.name} Yatra — Itinerary, Best Time, Booking`;
  const description = dest.shortDescription;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: dest.name,
      description,
      url,
      type: 'website',
      images: [{ url: dest.heroImage, width: 1200, height: 630 }],
      siteName: 'Darshya',
    },
    twitter: { card: 'summary_large_image', title: dest.name, description, images: [dest.heroImage] },
  };
}

const PARTNER_LABELS: Record<AffiliatePartner, { name: string; tag: string }> = {
  makemytrip: { name: 'MakeMyTrip', tag: 'Curated packages' },
  goibibo: { name: 'Goibibo', tag: 'Best price guarantee' },
  irctc: { name: 'IRCTC Tourism', tag: 'Govt-operated' },
};

export default async function YatraDestinationDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) notFound();

  const ldJson = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: dest.name,
    description: dest.shortDescription,
    image: dest.heroImage,
    address: { '@type': 'PostalAddress', addressLocality: dest.state, addressCountry: 'IN' },
    touristType: 'Religious pilgrim',
    isAccessibleForFree: false,
    url: `https://darshya.online/yatra/destinations/${dest.slug}`,
  };

  return (
    <div style={{ background: 'var(--color-bg)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />

      {/* Hero */}
      <section className="relative">
        <div className="aspect-[16/7] relative overflow-hidden">
          <img src={remoteImage(dest.heroImage, IMG_W.WIDE)} srcSet={remoteSrcSet(dest.heroImage, [IMG_W.CARD, IMG_W.WIDE])} sizes="100vw" width={960} height={420} loading="eager" fetchPriority="high" decoding="async" alt={dest.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium text-white mb-3">
              <Compass className="w-3 h-3" /> {dest.region}
            </div>
            <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              {dest.name}
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/85 max-w-2xl">{dest.shortDescription}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs md:text-sm text-white/80">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {dest.durationDays} days</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {dest.state}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> from {formatINRPrice(dest.startingPriceInr)}/person</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
          {/* Body */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>About this yatra</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>{dest.longDescription}</p>
              {!dest.hasFullContent && (
                <p className="mt-3 text-xs italic" style={{ color: 'var(--color-text-faint)' }}>
                  Detailed itinerary and reviews coming soon.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Best time to visit</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{dest.bestTimeToVisit}</p>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>How to reach</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{dest.howToReach}</p>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>What to expect</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{dest.whatToExpect}</p>
            </div>
          </div>

          {/* Partner cards (the revenue) */}
          <aside className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-primary)' }}>Book your yatra</p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Compare on trusted partners. Darshya earns a small commission at no extra cost to you.
              </p>
              <div className="space-y-2.5">
                {dest.partners.map((p) => {
                  const label = PARTNER_LABELS[p.partner];
                  const trackedHref = `/api/v1/affiliate/click?dest=${dest.slug}&partner=${p.partner}`;
                  return (
                    <a
                      key={p.partner}
                      href={trackedHref}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 group"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label.tag}</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--color-primary)' }} />
                    </a>
                  );
                })}
              </div>
            </div>

            <Link href="/yatra/destinations" className="text-xs font-medium block text-center hover:underline" style={{ color: 'var(--color-primary)' }}>
              ← All destinations
            </Link>
          </aside>
        </div>
      </section>
      {detailCta({
        routePrefix: 'yatra/destinations',
        subject: dest.name,
      })}
    </div>
  );
}
