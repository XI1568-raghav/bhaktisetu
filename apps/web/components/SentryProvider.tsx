'use client';

import { useEffect } from 'react';
import { initSentryBrowser } from '../lib/sentry';

export function SentryProvider() {
  useEffect(() => {
    initSentryBrowser();
  }, []);
  return null;
}
