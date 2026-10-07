/**
 * Google Analytics 4 — env-or-noop loader + tracker.
 *
 * Active only when NEXT_PUBLIC_GA_ID is set (e.g. "G-XXXXXXXXXX"). When the
 * env var is absent the script tags do not render and `trackEvent` is a no-op,
 * so this module is safe to import unconditionally.
 *
 * Get the ID: GA4 Admin -> Property -> Data Streams -> Web -> Measurement ID.
 */
import Script from 'next/script';
import { createElement, Fragment, type ReactElement } from 'react';

export function GA4Script(): ReactElement | null {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;

  return createElement(
    Fragment,
    null,
    createElement(Script, {
      id: 'ga4-loader',
      strategy: 'lazyOnload',
      src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`,
    }),
    createElement(Script, {
      id: 'ga4-init',
      strategy: 'lazyOnload',
      dangerouslySetInnerHTML: {
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(id)}, { send_page_view: true });
        `,
      },
    }),
  );
}

/**
 * Push a GA4 custom event. Falls back to a noop if gtag has not loaded yet
 * (env unset, ad-blocker, or pre-hydration call). Safe to call from any
 * client-side handler.
 */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  // Prefer gtag when present; otherwise raw dataLayer push so events queue
  // until gtag.js finishes loading.
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params ?? {});
    return;
  }
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: name, ...(params ?? {}) });
  }
}
