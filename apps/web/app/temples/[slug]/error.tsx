'use client';

// P0-9: Route-segment error boundary for /temples/[slug].
// Catches runtime errors thrown while rendering a temple detail page (bad
// upstream data, render crash) and shows a branded recovery UI instead of a
// raw 500. The root app/error.tsx would catch this too, but a closer
// boundary keeps the rest of the page shell intact and lets the user retry
// just this segment. Mirrors app/error.tsx + global-error.tsx style.
//
// DU-13: all six route-segment boundaries were the same inline style object
// with the OS system face and literal hexes. They share
// components/ui/ErrorState now, so the recovery screen is the brand.

import { useEffect } from 'react';
import ErrorState from '../../../components/ui/ErrorState';
import { captureBrowserException } from '../../../lib/sentry';

export default function TempleDetailError({
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
      title="Couldn't load this temple"
      description="Something went wrong while loading the temple details. Please try again."
      digest={error.digest}
      onRetry={() => reset()}
      backHref="/temples"
      backLabel="All temples"
    />
  );
}
