'use client';

// P0-9: Route-segment error boundary for /store/[handle], which is the real
// server-rendered product page since COM-10 (it used to be a 307 shim to
// /store/view?handle=…). This boundary keeps the store shell visible and offers
// a retry + back-to-store link instead of a raw 500. It does NOT catch
// notFound() — an unknown handle renders the 404 page, as it should.
// See app/temples/[slug]/error.tsx for rationale.
//
// DU-13: shares components/ui/ErrorState with the other five boundaries, so
// the recovery screen uses the product's own type, radius and palette.

import { useEffect } from 'react';
import ErrorState from '../../../components/ui/ErrorState';
import { captureBrowserException } from '../../../lib/sentry';

export default function StoreProductError({
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
      title="Couldn't load this product"
      description="Something went wrong while loading the product. Please try again."
      digest={error.digest}
      onRetry={() => reset()}
      backHref="/store"
      backLabel="Back to store"
    />
  );
}
