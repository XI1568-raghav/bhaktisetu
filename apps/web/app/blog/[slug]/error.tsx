'use client';

// P0-9: Route-segment error boundary for /blog/[slug].
// Catches render errors on a blog article page. See
// app/temples/[slug]/error.tsx for rationale.

import { useEffect } from 'react';
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
    <div
      style={{
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#2a2520',
      }}
    >
      <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#b87333', margin: '0 0 0.75rem' }}>
        Couldn&apos;t load this article
      </p>
      <p style={{ fontSize: '0.875rem', color: '#7a756e', maxWidth: '24rem', margin: '0 0 1.5rem' }}>
        Something went wrong while loading the article. Please try again.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: '#b87333',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <a
          href="/blog"
          style={{
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: '#ede9e3',
            color: '#2a2520',
            textDecoration: 'none',
            borderRadius: '0.5rem',
          }}
        >
          All articles
        </a>
      </div>
      {error.digest && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#b5b0a8',
            marginTop: '1.5rem',
            fontFamily: 'monospace',
          }}
        >
          Error: {error.digest}
        </p>
      )}
    </div>
  );
}
