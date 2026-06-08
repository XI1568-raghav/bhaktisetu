import Link from 'next/link';
import { Calendar, BookOpen, Music, Moon, ArrowRight } from 'lucide-react';
import TextReveal from '../motion/TextReveal';

type WisdomCard = {
  href: string;
  label: string;
  body: string;
  cta: string;
  Icon: typeof Calendar;
  iconBg: string;
  iconColor: string;
  ctaColor: string;
};

const CARDS: WisdomCard[] = [
  {
    href: '/panchang',
    label: "Today's Panchang",
    body: 'Tithi, vara, nakshatra for today. Auspicious timings at a glance.',
    cta: 'Open panchang',
    Icon: Calendar,
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    ctaColor: '#92400E',
  },
  {
    href: '/content/books',
    label: 'Sacred Texts',
    body: 'Bhagavad Gita · Ramayana · Upanishads. Read with translations.',
    cta: 'Browse texts',
    Icon: BookOpen,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    ctaColor: '#3730A3',
  },
  {
    href: '/content',
    label: 'Aarti & Mantras',
    body: 'Listen to evening aarti, daily chalisa, and curated bhajans.',
    cta: 'Listen now',
    Icon: Music,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    ctaColor: '#3730A3',
  },
];

export default function WisdomStrip() {
  return (
    <section
      className="py-10 md:py-12"
      style={{ background: 'var(--color-surface)' }}
      aria-labelledby="wisdom-strip-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: '#4F46E5' }}
            >
              Wisdom
            </p>
            <FadeScaleReveal
              as="h2"
              className="text-xl sm:text-2xl font-semibold tracking-tight font-[family-name:var(--font-display)] text-surface-800"
            >
              Daily panchang, scriptures, audio, horoscope.
            </FadeScaleReveal>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              prefetch={false}
              className="group flex flex-col rounded-xl p-4 card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ background: card.iconBg }}
              >
                <card.Icon
                  className="w-5 h-5"
                  style={{ color: card.iconColor }}
                  aria-hidden="true"
                />
              </div>
              <h3
                className="text-base font-semibold tracking-tight mb-1.5"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                {card.label}
              </h3>
              <p
                className="text-xs leading-relaxed mb-4 flex-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {card.body}
              </p>
              <span
                className="inline-flex items-center gap-1 text-xs font-medium link-underline"
                style={{ color: card.ctaColor }}
              >
                {card.cta}{' '}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Link
            href="/astrology/horoscope"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:shadow-sm"
            style={{
              background: '#EEF2FF',
              color: '#3730A3',
              border: '1px solid #C7D2FE',
            }}
          >
            <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            Daily Horoscope
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
