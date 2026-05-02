'use client';

import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';

type EventProps = Record<string, string | number | boolean | undefined | null>;

/**
 * Fires a single PostHog event on mount. Renders nothing.
 *
 * Designed for Server Components that need a client-side analytics
 * ping (e.g. /temples/[slug]) without restructuring the whole page.
 * Wrapped in try/catch + posthog.__loaded check so missing
 * NEXT_PUBLIC_POSTHOG_KEY (demo / preview envs) is a silent no-op.
 *
 * Re-fires only when `event` or `dedupeKey` changes — render-driven
 * prop churn won't double-count.
 */
export default function AnalyticsEvent({
  event,
  properties,
  dedupeKey,
}: {
  event: string;
  properties?: EventProps;
  dedupeKey?: string;
}) {
  const fired = useRef<string | null>(null);

  useEffect(() => {
    const key = dedupeKey ?? event;
    if (fired.current === key) return;
    fired.current = key;

    try {
      const ph = posthog as unknown as { __loaded?: boolean };
      if (!ph.__loaded) return;
      const cleaned: EventProps = {};
      if (properties) {
        for (const [k, v] of Object.entries(properties)) {
          if (v !== undefined && v !== null) cleaned[k] = v;
        }
      }
      posthog.capture(event, cleaned);
    } catch {
      // analytics must never break the page
    }
  }, [event, dedupeKey, properties]);

  return null;
}
