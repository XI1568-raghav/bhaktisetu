import Link from 'next/link';
import { Video, Flame, Heart, Gift, ArrowRight } from 'lucide-react';

type WorshipCard = {
  href: string;
  label: string;
  body: string;
  cta: string;
  Icon: typeof Video;
  gradient: string;
  badge?: string;
};

const CARDS: WorshipCard[] = [
  {
    href: '/darshan',
    label: 'Live Darshan',
    body: 'Watch live aarti from 200+ temples',
    cta: 'Watch live',
    Icon: Video,
    gradient: 'linear-gradient(135deg, #C2410C 0%, #EA580C 60%, #FB923C 100%)',
    badge: 'LIVE',
  },
  {
    href: '/pujas',
    label: 'Popular Puja',
    body: 'Rudrabhishek at Kashi · ₹1,100',
    cta: 'Book a puja',
    Icon: Flame,
    gradient: 'linear-gradient(135deg, #B45309 0%, #D97706 60%, #F59E0B 100%)',
  },
  {
    href: '/gaushala',
    label: 'Gaushala Seva',
    body: 'Adopt a cow from ₹500/mo',
    cta: 'Sponsor seva',
    Icon: Heart,
    gradient: 'linear-gradient(135deg, #166534 0%, #15803D 60%, #65A30D 100%)',
  },
  {
    href: '/donations',
    label: 'Donate (80G)',
    body: 'Tax-deductible giving',
    cta: 'Donate now',
    Icon: Gift,
    gradient: 'linear-gradient(135deg, #7C2D12 0%, #B45309 60%, #D4A76A 100%)',
    badge: '80G',
  },
];

export default function WorshipStrip() {
  return (
    <section className="py-10 md:py-12" aria-labelledby="worship-strip-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-primary)' }}
          >
            Worship
          </p>
          <h2
            id="worship-strip-heading"
            className="text-xl sm:text-2xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Watch the divine, schedule a ritual, give to a cause.
          </h2>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              prefetch={false}
              className="group relative flex flex-col rounded-xl overflow-hidden card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div
                className="relative h-28 sm:h-32 flex items-end p-3"
                style={{ background: card.gradient }}
                aria-hidden="true"
              >
                <card.Icon className="absolute top-3 right-3 w-5 h-5 text-white/80" />
                {card.badge && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#0a0a0a' }}>
                    {card.badge === 'LIVE' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    )}
                    {card.badge}
                  </span>
                )}
                <h3 className="text-white text-base font-semibold tracking-tight">
                  {card.label}
                </h3>
              </div>
              <div
                className="flex-1 p-3 flex flex-col justify-between"
                style={{ background: 'var(--color-surface)' }}
              >
                <p
                  className="text-xs leading-relaxed mb-3"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {card.body}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium link-underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {card.cta} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
