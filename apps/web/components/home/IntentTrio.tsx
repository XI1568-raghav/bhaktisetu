'use client';

import Link from 'next/link';
import { Video, Flame, Sparkles, ArrowRight } from 'lucide-react';
import { OnboardingGate } from './_useOnboardingSafe';

type IntentCard = {
  emoji: string;
  Icon: typeof Video;
  title: string;
  body: string;
  cta: string;
  href: string;
  gradient: string;
};

const CARDS: IntentCard[] = [
  {
    emoji: '🎥',
    Icon: Video,
    title: 'Live Darshan',
    body: 'Watch live aarti from 200+ temples',
    cta: 'Watch now',
    href: '/darshan',
    gradient:
      'linear-gradient(135deg, #B91C1C 0%, #EA580C 50%, #FB923C 100%)',
  },
  {
    emoji: '🔥',
    Icon: Flame,
    title: 'Book a Puja',
    body: 'Schedule a ritual at a temple',
    cta: 'Book now',
    href: '/pujas',
    gradient:
      'linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)',
  },
  {
    emoji: '🙏',
    Icon: Sparkles,
    title: 'Ask a Pandit',
    body: 'AI guidance on dharma, rituals',
    cta: 'Ask now',
    href: '/ask-pandit',
    gradient:
      'linear-gradient(135deg, #6B21A8 0%, #9333EA 50%, #C084FC 100%)',
  },
];

function TrioCards() {
  return (
    <section
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
              className="group relative flex flex-col rounded-xl overflow-hidden card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div
                className="p-5 flex items-center gap-3 text-white"
                style={{ background: card.gradient }}
              >
                <span className="text-3xl" aria-hidden="true">
                  {card.emoji}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-xs text-white/85 mt-0.5">{card.body}</p>
                </div>
              </div>
              <div
                className="p-3 flex items-center justify-end"
                style={{ background: 'var(--color-surface)' }}
              >
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {card.cta}{' '}
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Anonymous-only: shown when the onboarding hook is unavailable (parallel PR
// not merged) or when no primaryIntent has been recorded yet.
export default function IntentTrio() {
  return (
    <OnboardingGate fallback={<TrioCards />}>
      {(api) => {
        const intent = api.data?.primaryIntent;
        if (intent) return null;
        return <TrioCards />;
      }}
    </OnboardingGate>
  );
}
