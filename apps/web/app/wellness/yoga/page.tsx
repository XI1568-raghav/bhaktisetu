import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sun, Flame, Wind, Zap, Moon, Leaf } from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';
import FeaturedInstructorsSection from '../FeaturedInstructorsSection';
import UpcomingClassesSection from '../UpcomingClassesSection';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

/**
 * The 2026-08-12 wellness sweep (COM-14, AW-07, AW-17) took the invented supply
 * out of /wellness, /wellness/classes and /wellness/instructors and missed this
 * page and /wellness/meditation. Measured on prod 2026-09-09: this page served
 * six instructors with star ratings and review counts — "Aarav Sharma 4.9 /
 * 342 reviews / 12 yrs / Rs599", "Swami Dhyanananda 4.9 / 512 reviews" — an
 * eight-class weekly timetable, seat counters that turned red at "4 spots left",
 * and a six-video library with view counts, while
 * GET /api/v1/wellness/sessions answered `{"data":[]}`. None of it existed.
 *
 * Under every scarcity counter sat a bare `<button>Book</button>`: no onClick,
 * no form, no href, in a server component with no `'use client'`. Ten of them
 * across the two pages, and not one could ever receive a handler. That is why
 * the numbers were never contradicted by anything — the funnel they decorated
 * had no next step to fail in.
 *
 * The supply sections are now the same two live components /wellness itself
 * uses. They read `wellness_sessions`, they say so when the feed is empty or
 * unreachable, and each card is a Link to /wellness/classes/<id> where a
 * devotee can actually enrol and pay. The style guide below stays: it is
 * editorial, it claims no supply, and /aditya links here for it.
 */

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/wellness/yoga' },
  title: 'Yoga — Styles & Live Classes',
  description:
    'Hatha, Vinyasa, Ashtanga, Kundalini and Yin yoga — what each style asks of you, and the live classes instructors have scheduled on Darshya.',
};

const yogaTypes = [
  {
    name: 'Hatha Yoga',
    icon: Sun,
    description:
      'Traditional postures held with steady breath. Builds foundation, alignment, and body awareness. Ideal for beginners and intermediate practitioners.',
    difficulty: 'Beginner-Friendly',
    color: 'var(--color-art-2)',
  },
  {
    name: 'Vinyasa Flow',
    icon: Wind,
    description:
      'Dynamic breath-synchronized movement. Builds cardiovascular fitness and fluid body control. Each class is a unique creative sequence.',
    difficulty: 'Intermediate',
    color: 'var(--color-art-1)',
  },
  {
    name: 'Ashtanga',
    icon: Flame,
    description:
      'Fixed sequence of postures in the Mysore tradition. Builds discipline, strength, and endurance through consistent practice of the Primary Series.',
    difficulty: 'Advanced',
    color: 'var(--color-art-3)',
  },
  {
    name: 'Kundalini',
    icon: Zap,
    description:
      'Combines breathwork, mantra, and movement to activate energy centers. Known for its transformative mental and spiritual effects.',
    difficulty: 'All Levels',
    color: 'var(--color-art-2)',
  },
  {
    name: 'Yin Yoga',
    icon: Moon,
    description:
      'Slow, passive postures held for 3-5 minutes targeting deep connective tissues. Deeply restorative, excellent for stress relief and flexibility.',
    difficulty: 'Beginner-Friendly',
    color: 'var(--color-art-1)',
  },
];

export default function YogaPage() {
  return (
    <ScrollReveal>
      <div style={{ background: 'var(--color-bg)' }}>
        {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <nav
                data-reveal="fade"
                className="mb-6 flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Link
                  href="/wellness"
                  className="hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Wellness
                </Link>
                <span>/</span>
                <span>Yoga</span>
              </nav>

              <h1 data-reveal="up-far" className={H1.catalogue}>
                Five styles of yoga,{' '}
                <span style={{ color: 'var(--color-primary)' }}>taught live</span>
              </h1>

              <p
                data-reveal="up"
                data-delay="1"
                className="prose-body mt-5 max-w-xl leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                From gentle Hatha to demanding Ashtanga — what each style asks of you and what it
                gives back. Instructors publish their own classes; whatever is scheduled right now
                is listed further down, at the price the instructor set.
              </p>

              <div
                data-reveal="up"
                data-delay="2"
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link
                  href="/wellness/classes"
                  className={buttonClass('primary', 'md', 'btn-press')}
                >
                  Browse live classes <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#styles"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
                  style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                >
                  Compare the styles
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ STYLES ═════════════════════════════════════════════════════ */}
        <section
          id="styles"
          className="py-14 md:py-20"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p
              data-reveal="fade"
              className="mb-3 text-xs font-medium tracking-widest uppercase"
              style={{ color: 'var(--color-primary)' }}
            >
              The Styles
            </p>
            <h2
              data-reveal="up"
              className="mb-10 text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Five paths, one destination
            </h2>

            <div className="space-y-4">
              {yogaTypes.map((type, i) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.name}
                    data-reveal="left"
                    data-delay={String(Math.min(i + 1, 5))}
                    className="flex items-start gap-4 rounded-xl p-5"
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: type.color }}
                    >
                      <Icon className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          {type.name}
                        </h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: 'var(--color-primary-highlight)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {type.difficulty}
                        </span>
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {type.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/*
          Instructors and classes come from `wellness_sessions` through the two
          components /wellness already uses, rather than a filtered copy of them
          here: a second reader of the same feed is a second place for a fixture
          fallback to be added later. Both list every live wellness class, not
          only the yoga ones — the API has no style filter — which is honest
          breadth rather than an invented narrowing.
        */}
        <div id="instructors">
          <FeaturedInstructorsSection />
        </div>

        <div id="classes">
          <UpcomingClassesSection />
        </div>

        {/* ═══ CTA ════════════════════════════════════════════════════════ */}
        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2
              data-reveal="up"
              className="mb-4 text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Ready to step on the mat?
            </h2>
            <p
              data-reveal="up"
              data-delay="1"
              className="prose-body mx-auto mb-8 max-w-md"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Enrol and the class moves to &ldquo;Classes I have enrolled in&rdquo;, carrying the
              live room link as soon as your instructor publishes it. If nothing here fits yet, the
              catalog is where new sessions land first.
            </p>
            <div
              data-reveal="blur"
              data-delay="2"
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <Link href="/wellness/classes" className={buttonClass('primary', 'md', 'btn-press')}>
                Browse live classes <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/become-wellness"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium"
                style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
              >
                <Leaf className="h-4 w-4" /> Teach yoga on Darshya
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ScrollReveal>
  );
}
