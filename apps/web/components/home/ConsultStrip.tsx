import Link from 'next/link';
import { MessageCircleQuestion, Sparkles, Phone, CalendarHeart, ArrowRight } from 'lucide-react';

type ConsultCard = {
  href: string;
  label: string;
  body: string;
  cta: string;
  Icon: typeof Sparkles;
  emphasis?: boolean;
};

const CARDS: ConsultCard[] = [
  {
    href: '/ask-pandit',
    label: 'Ask Pandit',
    body: 'Ask anything · AI in your language. Instant scripture-grounded answers.',
    cta: 'Ask now',
    Icon: MessageCircleQuestion,
    emphasis: true,
  },
  {
    href: '/astrology',
    label: 'Talk to an Astrologer',
    body: 'Live consultations with verified Vedic astrologers, from ₹15/min.',
    cta: 'Start a call',
    Icon: Phone,
  },
  {
    href: '/weddings/muhurat',
    label: 'Wedding Muhurat',
    body: 'Auspicious dates and timings tailored to your kundli match.',
    cta: 'Find muhurat',
    Icon: CalendarHeart,
  },
];

export default function ConsultStrip() {
  return (
    <section className="py-10 md:py-12" aria-labelledby="consult-strip-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-primary)' }}
          >
            Consult
          </p>
          <h2
            id="consult-strip-heading"
            className="text-xl sm:text-2xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Talk to an expert.
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {CARDS.map((card) => {
            const isEmphasis = card.emphasis === true;
            return (
              <Link
                key={card.href}
                href={card.href}
                prefetch={false}
                className="group relative flex flex-col rounded-xl p-4 card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  background: isEmphasis
                    ? 'linear-gradient(135deg, var(--color-primary-highlight) 0%, var(--color-art-2) 100%)'
                    : 'var(--color-surface)',
                  border: isEmphasis
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: isEmphasis
                        ? 'var(--color-primary)'
                        : 'var(--color-primary-highlight)',
                    }}
                  >
                    <card.Icon
                      className="w-4.5 h-4.5"
                      style={{
                        color: isEmphasis ? '#ffffff' : 'var(--color-primary)',
                        width: 18,
                        height: 18,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <h3
                    className="text-base font-semibold tracking-tight"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    {card.label}
                  </h3>
                </div>
                <p
                  className="text-xs leading-relaxed mb-4 flex-1"
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
