/**
 * Meta (Facebook) Pixel — env-or-noop loader + tracker.
 *
 * Active only when NEXT_PUBLIC_FB_PIXEL_ID is set. When absent, the script
 * tags do not render and `trackPixel` is a no-op, so this module is safe to
 * import unconditionally.
 *
 * Get the ID: Meta Business -> Events Manager -> Data sources -> Pixel ID.
 */
import Script from 'next/script';
import { createElement, Fragment, type ReactElement } from 'react';

export function MetaPixelScript(): ReactElement | null {
  const id = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  if (!id) return null;

  // Standard fbevents.js bootstrap; identical to Meta's official snippet
  // except wrapped in next/script for hydration-safe deferred load.
  const init = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', ${JSON.stringify(id)});
    fbq('track', 'PageView');
  `;

  return createElement(
    Fragment,
    null,
    createElement(Script, {
      id: 'meta-pixel-init',
      strategy: 'afterInteractive',
      dangerouslySetInnerHTML: { __html: init },
    }),
    // Meta requires a <noscript> <img> fallback so non-JS visitors still ping.
    createElement(
      'noscript',
      null,
      createElement('img', {
        height: 1,
        width: 1,
        style: { display: 'none' },
        alt: '',
        src: `https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`,
      }),
    ),
  );
}

/**
 * Fire a Meta Pixel event. No-op when fbq is not loaded (env unset,
 * ad-blocker, or pre-hydration). Use standard event names where possible
 * (`Purchase`, `Lead`, `CompleteRegistration`); custom names also work.
 */
export function trackPixel(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  if (params) {
    window.fbq('track', event, params);
  } else {
    window.fbq('track', event);
  }
}
