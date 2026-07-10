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

import { useEffect } from 'react';
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
    <div
      style={{
        minHeight: '60vh',
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
      <p style={{ fontSize: '2.5rem', fontWeight: 600, color: '#b87333', margin: '0 0 1rem' }}>
        Something went wrong
      </p>
      <p style={{ fontSize: '0.875rem', color: '#7a756e', maxWidth: '24rem', margin: '0 0 2rem' }}>
        An unexpected error occurred while loading this page. Please try again.
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
          href="/"
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
          Back to Home
        </a>
      </div>
      {error.digest && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#b5b0a8',
            marginTop: '2rem',
            fontFamily: 'monospace',
          }}
        >
          Error: {error.digest}
        </p>
      )}
    </div>
  );
}
