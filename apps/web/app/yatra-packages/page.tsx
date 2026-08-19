import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Users, MapPin, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Yatra Packages — Curated Pilgrimage Tours',
  description: 'Book curated multi-day pilgrimage tours operated by Darshya. Vaishno Devi, Tirupati, Char Dham, Shirdi, Kashi, Dwarka-Somnath. All-inclusive with hotel + transport + pandit.',
  alternates: { canonical: 'https://darshya.online/yatra-packages' },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Yatra Packages — Darshya',
    description: 'All-inclusive curated pilgrimage tours.',
    url: 'https://darshya.online/yatra-packages',
    type: 'website',
  },
};

interface YatraPackage {
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
  departure_dates: string[];
}

async function fetchPackages(): Promise<YatraPackage[]> {
  try {
    const apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
    const url = apiBase.endsWith('/api/v1') ? `${apiBase}/yatra-packages` : `${apiBase.replace(/\/$/, '')}/api/v1/yatra-packages`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.packages) ? data.packages : [];
  } catch {
    return [];
  }
}

export default async function YatraPackagesPage() {
  const packages = await fetchPackages();

  return (
    <div style={{ background: 'var(--color-bg)' }}>
      <section className="py-12 md:py-16" style={{ background: 'linear-gradient(135deg, var(--color-art-3) 0%, var(--color-bg) 70%)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Curated Yatra Packages
          </h1>
          <p className="mt-4 text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            Multi-day all-inclusive pilgrimage tours operated by Darshya. Hotel, transport, pandit + meals included. Limited group sizes for personal experience.
          </p>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {packages.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No yatra packages currently available. Run the seed script to populate.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((pkg) => {
                const seatsLeft = pkg.max_group_size - pkg.current_group_size;
                return (
                  <Link
                    key={pkg.slug}
                    href={`/yatra-packages/${pkg.slug}`}
                    className="group rounded-xl overflow-hidden flex flex-col card-hover"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="aspect-[16/10] relative overflow-hidden">
                      <img width={640} height={400}                         src={pkg.hero_image || 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Kashi_Vishwanath.jpg/960px-Kashi_Vishwanath.jpg'}
                        alt={pkg.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-base font-semibold text-white tracking-tight">{pkg.name}</h3>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-3 text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {pkg.duration_days} days</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {seatsLeft} seats</span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-text-muted)' }}>
                        {pkg.short_description}
                      </p>
                      <div className="mt-auto pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-divider)' }}>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>From</p>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                            ₹{Number(pkg.price_inr).toLocaleString('en-IN')}
                            <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>/ person</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all" style={{ color: 'var(--color-primary)' }}>
                          View <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
