import Link from 'next/link';
import { Video, Flame, Heart, Gift, ArrowRight } from 'lucide-react';

type WorshipCard = {
  href: string;
  label: string;
  body: string;
  cta: string;
  Icon: typeof Video;
  accent: string;
  badge?: string;
};

const CARDS: WorshipCard[] = [
  {
    href: '/darshan',
    label: 'Live Darshan',
    body: 'Watch live aarti from 200+ temples',
    cta: 'Watch live',
    Icon: Video,
    accent: 'var(--color-primary-highlight)',
    badge: 'LIVE',
  },
  {
    href: '/pujas',
    label: 'Popular Puja',
    body: 'Rudrabhishek at Kashi · ₹1,100',
    cta: 'Book a puja',
    Icon: Flame,
    accent: 'var(--color-art-2)',
  },
  {
    href: '/gaushala',
    label: 'Gaushala Seva',
    body: 'Adopt a cow from ₹500/mo',
    cta: 'Sponsor seva',
    Icon: Heart,
    accent: 'var(--color-art-3)',
  },
  {
    href: '/donations',
    label: 'Donate (80G)',
    body: 'Tax-deductible giving',
    cta: 'Donate now',
    Icon: Gift,
    accent: 'var(--color-art-4)',
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
              className="group flex flex-col rounded-xl overflow-hidden card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="relative h-24 sm:h-28 flex items-end justify-between p-3"
                style={{ background: card.accent }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.7)' }}
                >
                  <card.Icon
                    className="w-5 h-5"
                    style={{ color: 'var(--color-primary)' }}
                    aria-hidden="true"
                  />
                </div>
                {card.badge && (
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {card.badge === 'LIVE' && (
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: '#C53030' }}
                      />
                    )}
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="flex-1 p-3 flex flex-col">
                <h3
                  className="text-base font-semibold tracking-tight mb-1"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  {card.label}
                </h3>
                <p
                  className="text-xs leading-relaxed mb-3 flex-1"
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
