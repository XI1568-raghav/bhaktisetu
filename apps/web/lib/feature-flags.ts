'use client';

import { useEffect, useState } from 'react';

export interface UseFeatureFlagOptions<T extends boolean | string> {
  defaultValue?: T;
}

export function useFeatureFlag<T extends boolean | string = boolean>(
  flagKey: string,
  options: UseFeatureFlagOptions<T> = {},
): T | undefined {
  const fallback = options.defaultValue;
  const [value, setValue] = useState<boolean | string | undefined>(fallback);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (!window.posthog) return;

    const update = () => {
      const v = window.posthog?.getFeatureFlag(flagKey);
      if (v === undefined) return;
      setValue(v);
    };

    update();
    const unsubscribe = window.posthog.onFeatureFlags(() => update());

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [flagKey]);

  return value as T | undefined;
}

export function getClientFeatureFlag<T extends boolean | string>(
  flagKey: string,
  defaultValue: T,
): T {
  if (typeof window === 'undefined') return defaultValue;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return defaultValue;
  if (!window.posthog) return defaultValue;
  const v = window.posthog.getFeatureFlag(flagKey);
  if (v === undefined) return defaultValue;
  return v as T;
}
