'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    posthog?: {
      init: (key: string, opts: Record<string, unknown>) => void;
      capture: (event: string, props?: Record<string, unknown>) => void;
      getFeatureFlag: (key: string) => boolean | string | undefined;
      onFeatureFlags: (cb: () => void) => () => void;
    };
  }
}

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

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || window.posthog) return;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
    const s = document.createElement('script');
    s.async = true;
    s.src = `${host}/static/array.js`;
    s.onload = () => {
      window.posthog?.init(key, {
        api_host: host,
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        persistence: 'localStorage+cookie',
      });
    };
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!window.posthog) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    window.posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
