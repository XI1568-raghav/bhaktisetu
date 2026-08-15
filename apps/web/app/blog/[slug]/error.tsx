'use client';

// P0-9: Route-segment error boundary for /blog/[slug].
// Catches render errors on a blog article page. See
// app/temples/[slug]/error.tsx for rationale.
//
// DU-13: shares components/ui/ErrorState with the other five boundaries, so
// the recovery screen uses the product's own type, radius and palette.

import { useEffect } from 'react';
import ErrorState from '../../../components/ui/ErrorState';
import { captureBrowserException } from '../../../lib/sentry';

export default function BlogArticleError({
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
      title="Couldn't load this article"
      description="Something went wrong while loading the article. Please try again."
      digest={error.digest}
      onRetry={() => reset()}
      backHref="/blog"
      backLabel="All articles"
    />
  );
}
