'use client';

import { useExperiment } from '../../lib/experiments';
import { H1 } from '../ui/heading-recipe';

/**
 * A/B experiment: hero_copy_v2
 *
 * Variants:
 *   control → Sanskrit-anchored hero (current default, passed in as children)
 *   benefit → Benefit-led copy targeting NRI/first-time devotee
 *
 * Captures one `experiment_exposure` event per page view via useExperiment.
 * Server passes the control title + subtitle as props; the benefit-led copy
 * is hard-coded here so PostHog never needs to know about untranslated keys.
 *
 * KPI: 100+ exposures per variant before winner-call (R-Q1-E-009).
 */

interface Props {
  /** Server-rendered control title (Sanskrit-anchored). */
  controlTitle1: string;
  /** Highlighted accent word of the control title. */
  controlTitle2: string;
  /** Server-rendered control subtitle. */
  controlSubtitle: string;
  /** Optional render override — receives resolved copy + variant tag. */
  children?: (args: {
    title1: string;
    title2: string;
    subtitle: string;
    variant: string;
  }) => React.ReactNode;
}

const BENEFIT = {
  title1: 'Bring your home temple online,',
  title2: 'pandit-verified, video-proofed',
  subtitle:
    'Skip the hour-long temple commute. Book a pandit, and receive a recording of your ceremony with your name and gotra spoken in it — for your family in India and abroad.',
};

export default function HeroCopyVariant({
  controlTitle1,
  controlTitle2,
  controlSubtitle,
  children,
}: Props) {
  const variant = useExperiment<'control' | 'benefit'>('hero_copy_v2', 'control');

  const copy =
    variant === 'benefit'
      ? BENEFIT
      : { title1: controlTitle1, title2: controlTitle2, subtitle: controlSubtitle };

  if (children) {
    return <>{children({ ...copy, variant })}</>;
  }

  return (
    <div data-experiment="hero_copy_v2" data-variant={variant}>
      <h1
        data-reveal="cinematic"
        className={H1.marketing}
      >
        {copy.title1}{' '}
        <span className="text-highlight" style={{ color: 'var(--color-primary)' }}>
          {copy.title2}
        </span>
      </h1>
      <p
        data-reveal="up"
        data-delay="2"
        className="mt-4 text-sm leading-relaxed"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {copy.subtitle}
      </p>
    </div>
  );
}
