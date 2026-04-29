'use client';

import { useEffect } from 'react';
import { initSentryBrowser } from '../lib/sentry-client';

export function SentryProvider() {
  useEffect(() => {
    initSentryBrowser();
  }, []);
  return null;
}
