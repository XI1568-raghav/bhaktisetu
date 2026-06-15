'use client';

import { useEffect, useRef } from 'react';
import { useFeatureFlag } from './feature-flags';
import { capture } from './posthog';

/**
 * A/B experiment helper — wraps useFeatureFlag and captures a single
 * `experiment_exposure` event the first time the variant resolves for the
 * current page view. KPI on R-Q1-E-009 requires min 100 exposures per
 * variant before declaring a winner; this is the event the PostHog insight
 * counts.
 *
 * Event shape:
 *   experiment_exposure { experiment: <flag>, variant: <value> }
 *
 * The fire-once guard is keyed by experiment name, so a remount on the same
 * page does not double-count. Conversion events stay separate (puja_book,
 * pandit_consult etc) — same exposure event lets PostHog join them.
 */
export function useExperiment<T extends string = string>(
  experiment: string,
  defaultValue: T,
): T {
  const variant = useFeatureFlag<T>(experiment, { defaultValue }) ?? defaultValue;
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (firedRef.current === variant) return;
    firedRef.current = variant;
    capture('experiment_exposure', { experiment, variant });
  }, [experiment, variant]);

  return variant;
}

/**
 * Canonical list of active A/B experiments — keep in sync with PostHog
 * dashboard. Source of truth for the orchestrator KPI query (R-Q1-E-009).
 */
export const ACTIVE_EXPERIMENTS = [
  {
    key: 'hero_copy_v2',
    variants: ['control', 'benefit'] as const,
    description: 'Hero copy A/B — Sanskrit-anchored vs benefit-led.',
  },
  {
    key: 'cta_color_test',
    variants: ['saffron', 'indigo'] as const,
    description: 'Hero primary CTA background — saffron-600 vs indigo-600.',
  },
  {
    key: 'nri_lane_above_fold',
    variants: ['below', 'above'] as const,
    description: 'NRI gift-puja card position — above first scroll vs below.',
  },
] as const;
