'use client';

import ErrorState from '../../../components/ui/ErrorState';
import { captureBrowserException } from '../../../lib/sentry';
import { useEffect } from 'react';

// Segment boundary for /account/subscriptions. A billing page that falls back to
// the site-wide "Something went wrong" tells a devotee nothing about their plan;
// this one says what could not be shown, and where else to look.
export default function AccountSubscriptionsError({
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
      title="We could not show your subscriptions"
      description="Nothing about your plan has changed and you have not been charged anything new. Try again, or go back to your profile."
      digest={error.digest}
      onRetry={() => reset()}
      backHref="/profile"
      backLabel="Back to profile"
      minHeightClass="min-h-[50vh]"
    />
  );
}
