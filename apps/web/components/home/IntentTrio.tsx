'use client';

import Link from 'next/link';
import { Video, Flame, MessageCircleQuestion, ArrowRight } from 'lucide-react';
import { OnboardingGate } from './_useOnboardingSafe';

type IntentCard = {
  Icon: typeof Video;
  title: string;
  body: string;
  cta: string;
  href: string;
};

const CARDS: IntentCard[] = [
  {
    Icon: Video,
    title: 'Live Darshan',
    body: 'Watch live aarti from 200+ temples',
    cta: 'Watch now',
    href: '/darshan',
  },
  {
    Icon: Flame,
    title: 'Book a Puja',
    body: 'Schedule a ritual at a temple',
    cta: 'Book now',
    href: '/pujas',
  },
  {
    Icon: MessageCircleQuestion,
    title: 'Ask a Pandit',
    body: 'AI guidance on dharma, rituals',
    cta: 'Ask now',
    href: '/ask-pandit',
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
              className="group relative flex flex-col rounded-xl p-5 card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-primary-highlight)' }}
                >
                  <card.Icon
                    className="w-5 h-5"
                    style={{ color: 'var(--color-primary)' }}
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
                style={{ color: 'var(--color-primary)' }}
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
