'use client';

// P0-9: Root app-router error boundary.
//
// Next.js route-segment error.tsx catches runtime errors thrown by ANY route
// under app/ that does not have its own closer error.tsx. Unlike
// global-error.tsx (which replaces <html><body> for root-layout errors), this
// boundary renders INSIDE the root layout shell — so the site chrome (nav,
// footer, fonts) stays visible while the error body is replaced by this
// branded recovery UI. Behaviour mirrors global-error.tsx: capture the error
// to Sentry once, offer reset() (re-render the segment) + a home link.
//
// DU-13: the shared recipe lives in components/ui/ErrorState, so a recovery
// screen can no longer drift onto its own typeface, radius and hardcoded
// palette the way this file had.

import { useEffect } from 'react';
import ErrorState from '../components/ui/ErrorState';
import { captureBrowserException } from '../lib/sentry';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureBrowserException(error, { digest: error.digest });
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      description="An unexpected error occurred while loading this page. Please try again."
      digest={error.digest}
      onRetry={() => reset()}
      backHref="/"
      backLabel="Back to Home"
      minHeightClass="min-h-[60vh]"
    />
  );
}
