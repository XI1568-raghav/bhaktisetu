'use client';

import { useEffect } from 'react';
import { initSentryBrowser } from '../lib/sentry';
import { afterLoad } from '../lib/after-load';

export function SentryProvider() {
  useEffect(() => {
    // Perf: the Sentry CDN bundle loads after window load + idle, not at hydration.
    return afterLoad(initSentryBrowser);
  }, []);
  return null;
}
