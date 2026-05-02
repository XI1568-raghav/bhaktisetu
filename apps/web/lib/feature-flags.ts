'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

// Client-side feature flag hook. Reads from the PostHog browser SDK
// initialised by <Analytics /> (apps/web/components/Analytics.tsx).
//
// When PostHog is not configured (NEXT_PUBLIC_POSTHOG_KEY absent) this
// hook returns the default — the page renders the control variant and
// nothing breaks.

export interface UseFeatureFlagOptions<T extends boolean | string> {
  /** Returned while PostHog is loading flags or when PostHog is absent. */
  defaultValue?: T;
}

/**
 * Subscribe to a PostHog feature flag. Re-renders when the flag value
 * changes (e.g., after PostHog finishes loading).
 *
 * For boolean flags: pass `defaultValue: false`.
 * For multivariate: pass the control variant key as default.
 */
export function useFeatureFlag<T extends boolean | string = boolean>(
  flagKey: string,
  options: UseFeatureFlagOptions<T> = {},
): T | undefined {
  const fallback = options.defaultValue;
  const [value, setValue] = useState<boolean | string | undefined>(fallback);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    // PostHog may not have loaded flags yet on first render — register a
    // callback so we re-render when they arrive.
    const update = () => {
      const v = posthog.getFeatureFlag(flagKey);
      if (v === undefined) return;
      setValue(v);
    };

    update();

    // onFeatureFlags fires once flags are ready and on subsequent reload.
    const unsubscribe = posthog.onFeatureFlags(() => update());

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [flagKey]);

  return value as T | undefined;
}

/**
 * Imperative read for non-React code paths. Returns `defaultValue` when
 * PostHog has not yet loaded or is not configured.
 */
export function getClientFeatureFlag<T extends boolean | string>(
  flagKey: string,
  defaultValue: T,
): T {
  if (typeof window === 'undefined') return defaultValue;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return defaultValue;
  const v = posthog.getFeatureFlag(flagKey);
  if (v === undefined) return defaultValue;
  return v as T;
}
