'use client';

import Link from 'next/link';
import { Video, Flame, MessageCircleQuestion, ArrowRight } from 'lucide-react';
import { OnboardingGate } from './_useOnboardingSafe';
import { capture } from '../../lib/posthog';
import { liveDarshanClaim } from '../../lib/platform-stats';

type IntentCard = {
  Icon: typeof Video;
  title: string;
  body: string;
  cta: string;
  href: string;
  iconBg: string;
  iconColor: string;
  ctaColor: string;
};

/**
 * CM-11 / DF-05 (prod sweep 2026-08-12): the darshan card used to hardcode
 * "Watch live aarti from 200+ temples". /darshan links 17 distinct temples and
 * the temples table holds 20. The body copy is now derived from a server count
 * passed down from the homepage; with no count it loses its digits entirely.
 */
const cards = (liveDarshanTemples: number | null): IntentCard[] => [
  {
    Icon: Video,
    title: 'Live Darshan',
    body: liveDarshanClaim(liveDarshanTemples),
    cta: 'Watch now',
    href: '/darshan',
    iconBg: '#FFF8F0',
    iconColor: '#9e6229',
    ctaColor: '#7d4e1f',
  },
  {
    Icon: Flame,
    title: 'Book a Puja',
    body: 'Schedule a ritual at a temple',
    cta: 'Book now',
    href: '/pujas',
    iconBg: '#FFF8F0',
    iconColor: '#9e6229',
    ctaColor: '#7d4e1f',
  },
  {
    Icon: MessageCircleQuestion,
    title: 'Ask a Pandit',
    body: 'AI guidance on dharma, rituals',
    cta: 'Ask now',
    href: '/ask-pandit',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    ctaColor: '#3730A3',
  },
];

function TrioCards({ liveDarshanTemples }: { liveDarshanTemples: number | null }) {
  const CARDS = cards(liveDarshanTemples);
  return (
    <section
      id="begin"
      className="py-8 md:py-10"
      aria-labelledby="intent-trio-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="intent-trio-heading" className="sr-only">
          Choose where to begin
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              prefetch={false}
              onClick={() => capture('intent_card_click', { lane: card.title, href: card.href })}
              className="group relative flex flex-col rounded-xl p-5 card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: card.iconBg }}
                >
                  <card.Icon
                    className="w-5 h-5"
                    style={{ color: card.iconColor }}
                    aria-hidden="true"
                  />
                </div>
                <h3
                  className="text-base sm:text-lg font-semibold tracking-tight"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  {card.title}
                </h3>
              </div>
              <p
                className="text-xs sm:text-sm leading-relaxed mb-4 flex-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {card.body}
              </p>
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: card.ctaColor }}
              >
                {card.cta}{' '}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Props {
  /** Server-counted distinct temples with a live darshan stream; `null` when
   *  the count is unavailable (CM-11). */
  liveDarshanTemples?: number | null;
}

export default function IntentTrio({ liveDarshanTemples = null }: Props) {
  return (
    <OnboardingGate fallback={<TrioCards liveDarshanTemples={liveDarshanTemples} />}>
      {(api) => {
        const intent = api.data?.primaryIntent;
        if (intent) return null;
        return <TrioCards liveDarshanTemples={liveDarshanTemples} />;
      }}
    </OnboardingGate>
  );
}
