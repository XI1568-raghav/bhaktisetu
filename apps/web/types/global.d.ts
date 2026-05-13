// Ambient global types for third-party analytics globals attached to window.
// Each integration is env-or-noop; types are declared so guarded calls
// (`if (window.fbq) window.fbq(...)`) type-check without `any`.

export {};

declare global {
  interface Window {
    // Google Analytics 4 — populated by gtag.js loader.
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;

    // Meta (Facebook) Pixel — populated by fbevents.js loader.
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: Window['fbq'];
  }
}
