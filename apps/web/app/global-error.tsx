'use client';

import { useEffect } from 'react';
import { initSentryBrowser, captureBrowserException } from '../lib/sentry-client';

export default function GlobalError({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
   initSentryBrowser();
   captureBrowserException(error, { digest: error.digest });
 }, [error]);

 return (
 <html>
 <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f3ef', color: '#2a2520' }}>
 <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
 <p style={{ fontSize: '3rem', fontWeight: 600, color: '#b87333', margin: '0 0 1rem' }}>500</p>
 <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Something went wrong</h1>
 <p style={{ fontSize: '0.875rem', color: '#7a756e', maxWidth: '24rem', margin: '0 0 2rem' }}>
 An unexpected error occurred. Try refreshing the page.
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
 <p style={{ fontSize: '0.75rem', color: '#b5b0a8', marginTop: '2rem', fontFamily: 'monospace' }}>
 Error: {error.digest}
 </p>
 )}
 </div>
 </body>
 </html>
 );
}
