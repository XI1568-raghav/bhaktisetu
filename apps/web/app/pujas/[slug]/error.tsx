'use client';

// P0-9: Route-segment error boundary for /pujas/[slug].
// See app/temples/[slug]/error.tsx for rationale. Catches render errors on a
// puja detail page and shows a branded recovery UI with a retry + back link.
//
// DU-13: the branding used to be a claim, not a fact — an inline style object
// with the OS system face, four literal hexes and an 8px corner that matched
// nothing else in the product. components/ui/ErrorState owns the recipe now.

import { useEffect } from 'react';
import ErrorState from '../../../components/ui/ErrorState';
import { captureBrowserException } from '../../../lib/sentry';

export default function PujaDetailError({
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
      title="Couldn't load this puja"
      description="Something went wrong while loading the puja details. Please try again."
      digest={error.digest}
      onRetry={() => reset()}
      backHref="/pujas"
      backLabel="All pujas"
    />
  );
}
