
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, Check, X, MapPin, Clock, ArrowRight } from 'lucide-react';

interface YatraPackage {
  id: string;
  slug: string;
  name: string;
  destination_slug: string;
  duration_days: number;
  price_inr: string;
  price_usd: string | null;
  max_group_size: number;
  current_group_size: number;
  hero_image: string | null;
  short_description: string | null;
  includes_text: string[];
  excludes_text: string[];
  itinerary: Record<string, string>;
  departure_dates: string[];
}

async function fetchPackage(slug: string): Promise<YatraPackage | null> {
  try {
    const apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
    const url = apiBase.endsWith('/api/v1') ? `${apiBase}/yatra-packages/${slug}` : `${apiBase.replace(/\/$/, '')}/api/v1/yatra-packages/${slug}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await fetchPackage(slug);
  if (!pkg) return {};
  const url = `https://darshya.online/yatra-packages/${pkg.slug}`;
  return {
    title: `${pkg.name} — ${pkg.duration_days} day Yatra`,
    description: pkg.short_description ?? `${pkg.duration_days}-day curated pilgrimage from Darshya.`,
    alternates: { canonical: url },
    openGraph: {
      title: pkg.name,
      description: pkg.short_description ?? '',
      url,
      type: 'website',
      images: pkg.hero_image ? [{ url: pkg.hero_image, width: 1200, height: 630 }] : undefined,
      siteName: 'Darshya',
    },
  };
}

export default async function YatraPackageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pkg = await fetchPackage(slug);
  if (!pkg) notFound();

  const seatsLeft = pkg.max_group_size - pkg.current_group_size;
  const itineraryEntries = Object.entries(pkg.itinerary || {}).sort(([a], [b]) => a.localeCompare(b));

  const ldJson = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: pkg.name,
    description: pkg.short_description,
    image: pkg.hero_image,
    offers: { '@type': 'Offer', price: pkg.price_inr, priceCurrency: 'INR' },
    duration: `P${pkg.duration_days}D`,
  };

  return (
    <div style={{ background: 'var(--color-bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />

      <section className="relative">
        <div className="aspect-[16/7] relative overflow-hidden">
          <img width={1600} height={700} src={pkg.hero_image ?? ''} alt={pkg.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              {pkg.name}
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/85 max-w-2xl">{pkg.short_description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs md:text-sm text-white/80">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {pkg.duration_days} days</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {seatsLeft} of {pkg.max_group_size} seats left</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> from ₹{Number(pkg.price_inr).toLocaleString('en-IN')}/person</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {itineraryEntries.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>Day-by-day itinerary</h2>
                <ol className="space-y-2.5">
                  {itineraryEntries.map(([day, desc]) => (
                    <li key={day} className="flex gap-3">
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider shrink-0" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>
                        {day.replace('day', 'Day ')}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{desc}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Includes</h3>
                <ul className="space-y-1.5">
                  {(pkg.includes_text || []).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Excludes</h3>
                <ul className="space-y-1.5">
                  {(pkg.excludes_text || []).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <X className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#dc2626' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-primary)' }}>Book this yatra</p>
              <p className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                ₹{Number(pkg.price_inr).toLocaleString('en-IN')}
                <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--color-text-muted)' }}>/ person</span>
              </p>
              {pkg.price_usd && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>NRI: ${pkg.price_usd}</p>
              )}

              {pkg.departure_dates && pkg.departure_dates.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text)' }}>Departure dates</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.departure_dates.slice(0, 6).map((d) => (
                      <span key={d} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                        {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href={`/yatra-packages/${pkg.slug}/book`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                Reserve seat <ArrowRight className="w-4 h-4" />
              </Link>
              {seatsLeft <= 5 && seatsLeft > 0 && (
                <p className="mt-2 text-xs text-center" style={{ color: '#dc2626' }}>Only {seatsLeft} seats left!</p>
              )}
              {seatsLeft === 0 && (
                <p className="mt-2 text-xs text-center" style={{ color: '#dc2626' }}>Group full — try another date</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
