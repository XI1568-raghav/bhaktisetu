'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

/**
 * Boots PostHog on first client render and tracks pageviews on every
 * route change. Renders nothing.
 *
 * Activates only when NEXT_PUBLIC_POSTHOG_KEY is set; otherwise this is
 * a no-op so demo / local environments don't pollute analytics.
 *
 * Wrapped in Suspense because useSearchParams() forces dynamic rendering
 * on every page that includes this in the tree without a boundary.
 */
export function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || initialized.current) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false, // we'll do it manually on route change
      capture_pageleave: true,
      autocapture: true,
      session_recording: { maskAllInputs: true },
      persistence: 'localStorage+cookie',
    });
    initialized.current = true;
  }, []);

  // Track pageviews on route change (Next.js App Router)
  useEffect(() => {
    if (!initialized.current) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
