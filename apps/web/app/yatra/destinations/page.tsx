export const runtime = 'edge';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Calendar, MapPin, ArrowRight, Mountain } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { yatraDestinations, formatINRPrice } from '../../../lib/yatra-destinations';

export const metadata: Metadata = {
  title: 'Top 10 Yatra Destinations in India — Booking, Itineraries & Best Time | Darshya',
  description:
    'Explore the 10 most visited pilgrimage destinations in India — Vaishno Devi, Tirupati, Char Dham, Shirdi, Kashi, Amarnath, Kailash Mansarovar, Rameshwaram, Dwarka-Somnath and Ujjain. Book direct via trusted partners.',
  alternates: { canonical: 'https://darshya.online/yatra/destinations' },
  openGraph: {
    title: 'Top 10 Yatra Destinations in India',
    description: 'India\'s most visited pilgrimage destinations with itinerary, best time to visit, and direct booking links.',
    url: 'https://darshya.online/yatra/destinations',
    type: 'website',
  },
};

export default async function YatraDestinationsPage() {
  const t = await getTranslations('yatra');
  const tCommon = await getTranslations('common');
  return (
    <div style={{ background: 'var(--color-bg)' }}>
      {/* Hero */}
      <section className="py-12 md:py-16" style={{ background: 'linear-gradient(135deg, var(--color-art-3) 0%, var(--color-bg) 70%)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-5" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>
            <Mountain className="w-3.5 h-3.5" />
            {t('destinationsBadge')}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight max-w-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            {t('destinationsTitle')}
          </h1>
          <p className="mt-4 text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            {t('destinationsSubtitle')}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-10 md:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {yatraDestinations.map((d) => (
              <Link
                key={d.slug}
                href={`/yatra/destinations/${d.slug}`}
                className="group rounded-xl overflow-hidden card-hover flex flex-col"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img src={d.heroImage} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{d.name}</h3>
                    <p className="text-[11px] text-white/80 mt-0.5">{d.state}</p>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-3 text-[11px] mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {d.durationDays} {t('days')}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.region}</span>
                  </div>
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                    {d.shortDescription}
                  </p>
                  <div className="mt-auto pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-divider)' }}>
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>{t('from')}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {formatINRPrice(d.startingPriceInr)} <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>/ {t('perPerson')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium group-hover:gap-2 transition-all" style={{ color: 'var(--color-primary)' }}>
                      {t('viewDetails')} <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
