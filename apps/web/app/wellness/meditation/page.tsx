import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Wind, Sparkles, Heart, Volume2, Target, Leaf } from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';
import FeaturedInstructorsSection from '../FeaturedInstructorsSection';
import UpcomingClassesSection from '../UpcomingClassesSection';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

/**
 * Same defect and same fix as /wellness/yoga — the 2026-08-12 wellness sweep
 * (COM-14, AW-07, AW-17) cleaned every other surface in this section and missed
 * the two category landing pages. Measured on prod 2026-09-09, while
 * GET /api/v1/wellness/sessions answered `{"data":[]}`, this page served:
 *
 *   - four teachers with invented ratings and review counts (Swami Dhyanananda
 *     4.9 / 512 reviews / Rs799, Anita Desai 4.7 / 189, +2), each linking to a
 *     fixture profile;
 *   - four dated "upcoming sessions" that exist in no table, counting down to
 *     "3 spots left" in red, each with a dead <button>Book</button>;
 *   - a player for a daily guided session ("Today's session: Morning Stillness"),
 *     frozen at 35% with a fake 5:14 / 15:00 timecode and inert transport
 *     controls — there is no audio, no library and no daily session;
 *   - a "21-Day Meditation Challenge" offering weekly check-ins and a
 *     certificate, joinable through a `<button>` that had no handler because
 *     this file is a server component. Nothing implements the programme.
 *
 * Supply now comes from `wellness_sessions` via the two components /wellness
 * uses, which state an empty or unreachable feed rather than substituting for
 * it. The style guide below stays: it teaches, and it sells nothing.
 */

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/wellness/meditation' },
  title: 'Meditation — Styles & Live Sessions',
  description:
    'Guided, Transcendental, Mindfulness, Chakra and Sound bath meditation — how each practice works, and the live sessions teachers have scheduled on Darshya.',
};

const meditationTypes = [
  {
    name: 'Guided Meditation',
    description:
      'A teacher leads you through visualization and breath awareness. Perfect for beginners who need a gentle entry point into meditation practice.',
    icon: Volume2,
    color: 'var(--color-art-1)',
  },
  {
    name: 'Transcendental Meditation',
    description:
      'Uses a personal mantra repeated silently. Practiced 20 minutes twice daily, it settles the mind into a state of restful alertness.',
    icon: Sparkles,
    color: 'var(--color-art-2)',
  },
  {
    name: 'Mindfulness (MBSR)',
    description:
      'Non-judgmental awareness of the present moment. Clinically proven to reduce stress, anxiety, and chronic pain through systematic attention training.',
    icon: Target,
    color: 'var(--color-art-3)',
  },
  {
    name: 'Chakra Meditation',
    description:
      'Focuses on the seven energy centers of the body. Uses visualization, color, and sound to balance and align each chakra for holistic well-being.',
    icon: Heart,
    color: 'var(--color-art-1)',
  },
  {
    name: 'Sound Bath',
    description:
      'Immersive experience using singing bowls, gongs, and tuning forks. Sound vibrations induce deep relaxation and theta brainwave states.',
    icon: Wind,
    color: 'var(--color-art-2)',
  },
];

export default function MeditationPage() {
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
                <span>Meditation</span>
              </nav>

              <h1 data-reveal="up-far" className={H1.catalogue}>
                Find stillness with{' '}
                <span style={{ color: 'var(--color-primary)' }}>guided meditation</span>
              </h1>

              <p
                data-reveal="up"
                data-delay="1"
                className="prose-body mt-5 max-w-xl leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                From breath awareness for beginners to Transcendental practice — how each style
                works and who it suits. Teachers schedule their own live sessions; whatever is on
                the calendar right now is listed further down.
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
                  Browse live sessions <ArrowRight className="h-4 w-4" />
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
              Meditation Styles
            </p>
            <h2
              data-reveal="up"
              className="mb-10 text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Five doorways to inner silence
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meditationTypes.map((type, i) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.name}
                    data-reveal="up"
                    data-delay={String((i % 3) + 1)}
                    className="rounded-xl p-5"
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: type.color }}
                    >
                      <Icon className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h3
                      className="mb-1.5 text-sm font-medium"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {type.name}
                    </h3>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {type.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/*
          Both sections read `wellness_sessions` through the components
          /wellness already mounts, rather than a meditation-only copy of them:
          a second reader of the same feed is a second place for a fixture
          fallback to be added later. They list every live wellness class — the
          API has no style filter — which is honest breadth, not an invented
          narrowing.
        */}
        <div id="teachers">
          <FeaturedInstructorsSection />
        </div>

        <div id="sessions">
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
              The journey inward begins with a single breath
            </h2>
            <p
              data-reveal="up"
              data-delay="1"
              className="prose-body mx-auto mb-8 max-w-md"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Enrol and the session moves to &ldquo;Classes I have enrolled in&rdquo;, carrying the
              live room link as soon as your teacher publishes it. Nothing scheduled today? The
              catalog is where new sessions land first.
            </p>
            <div
              data-reveal="blur"
              data-delay="2"
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <Link href="/wellness/classes" className={buttonClass('primary', 'md', 'btn-press')}>
                Browse live sessions <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/wellness/vipassana"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium"
                style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
              >
                Vipassana retreats
              </Link>
              <Link
                href="/become-wellness"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium"
                style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
              >
                <Leaf className="h-4 w-4" /> Teach on Darshya
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ScrollReveal>
  );
}
