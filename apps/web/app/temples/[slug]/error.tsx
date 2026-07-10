'use client';

// P0-9: Route-segment error boundary for /temples/[slug].
// Catches runtime errors thrown while rendering a temple detail page (bad
// upstream data, render crash) and shows a branded recovery UI instead of a
// raw 500. The root app/error.tsx would catch this too, but a closer
// boundary keeps the rest of the page shell intact and lets the user retry
// just this segment. Mirrors app/error.tsx + global-error.tsx style.

import { useEffect } from 'react';
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
        Couldn&apos;t load this temple
      </p>
      <p style={{ fontSize: '0.875rem', color: '#7a756e', maxWidth: '24rem', margin: '0 0 1.5rem' }}>
        Something went wrong while loading the temple details. Please try again.
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
          href="/temples"
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
          All temples
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
