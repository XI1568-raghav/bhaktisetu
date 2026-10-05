import Link from 'next/link';
import { Video, Flame, Heart, Gift, ArrowRight } from 'lucide-react';
import { getTempleHero, getDeityImage, remoteSrcSet, IMG_W } from '../../lib/images';
import TextReveal from '../motion/TextReveal';
import { liveDarshanClaim } from '../../lib/platform-stats';
import { GAUSHALA_ENTRY_CLAIM } from '../../lib/gaushala-plans';

type WorshipCard = {
  href: string;
  label: string;
  body: string;
  cta: string;
  Icon: typeof Video;
  image: string;
  badge?: string;
};

/**
 * CM-11 / DF-05 (darshan count) and DF-06 (gaushala entry price), prod sweep
 * 2026-08-12. This strip used to hardcode "Watch live aarti from 200+ temples"
 * against 20 seeded temples, and "Adopt a cow from Rs 500 a month" against a
 * /gaushala page whose cheapest monthly plan is Rs 3,000 — no Rs 500 tier has
 * ever existed. Both numbers are now derived: the temple count from a server
 * count (null -> digit-free copy) and the cow price from the same plan table
 * /gaushala renders.
 */
const cards = (liveDarshanTemples: number | null): WorshipCard[] => [
  {
    href: '/darshan',
    label: 'Live Darshan',
    body: liveDarshanClaim(liveDarshanTemples),
    cta: 'Watch live',
    Icon: Video,
    image: getTempleHero('jagannath-puri', IMG_W.CARD),
    badge: 'LIVE',
  },
  {
    href: '/pujas',
    label: 'Popular Puja',
    body: 'Rudrabhishek at Kashi, ₹1,100',
    cta: 'Book a puja',
    Icon: Flame,
    image: getTempleHero('kashi-vishwanath', IMG_W.CARD),
  },
  {
    href: '/gaushala',
    label: 'Gaushala Seva',
    body: `Gau seva ${GAUSHALA_ENTRY_CLAIM}`,
    cta: 'Sponsor seva',
    Icon: Heart,
    image: getDeityImage('krishna', 'portrait', IMG_W.CARD),
  },
  {
    href: '/donations',
    label: 'Gau Seva',
    body: 'Feed a cow from Rs 51 a day',
    cta: 'Donate now',
    Icon: Gift,
    image: getTempleHero('somnath', IMG_W.CARD),
    badge: 'Seva',
  },
];

interface Props {
  /** Server-counted distinct temples with a live darshan stream; `null` when
   *  the count is unavailable (CM-11). */
  liveDarshanTemples?: number | null;
}

export default function WorshipStrip({ liveDarshanTemples = null }: Props) {
  const CARDS = cards(liveDarshanTemples);
  return (
    <section className="py-6 md:py-8" aria-labelledby="worship-strip-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-primary)' }}
          >
            Worship
          </p>
          <TextReveal
            as="h2"
            className="text-xl sm:text-2xl font-semibold tracking-tight font-[family-name:var(--font-display)] text-surface-800"
          >
            Watch the divine, schedule a ritual, give to a cause.
          </TextReveal>
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
              <div className="relative h-32 sm:h-36 overflow-hidden">
                {/*
                 * HOME-01 (2026-08-20): this carried `sizes` and no `srcSet`. A
                 * browser ignores `sizes` when there is nothing to choose
                 * between, so the declared slot was decoration and every device
                 * downloaded the 500px `src`. The old declaration was wrong as
                 * well as inert — below 640px this grid is ONE column, not the
                 * 50vw it claimed.
                 *
                 * Real slots: 1 col below sm (100vw - 2rem), 2 cols to lg,
                 * 4 cols above, which at the 72rem cap is (1152 - 64 - 48)/4 =
                 * 260 CSS px. Measured candidates per file — jagannath
                 * 27,304/60,931, kashi 27,426/52,125, somnath 27,364/57,283
                 * (330px/500px). A 1x desktop now takes the 330px row: 88,245 B
                 * saved across the three unique files (krishna resolves to the
                 * kashi fallback and is paid for once). Every 2x screen and
                 * every phone still resolves to 500px — unchanged, not softer.
                 */}
                <img
                  src={card.image}
                  srcSet={remoteSrcSet(card.image, [250, 330, IMG_W.CARD])}
                  sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc((100vw - 4rem) / 2), 260px"
                  width={500}
                  height={288}
                  alt={card.label}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.85)' }}>
                  <card.Icon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                </div>
                {card.badge && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-white shadow-sm" style={{ color: 'var(--color-text)' }}>
                    {card.badge === 'LIVE' && (
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#C53030' }} />
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
