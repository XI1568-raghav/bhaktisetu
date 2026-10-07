/**
 * PostHog — env-or-noop loader + tracker (web).
 *
 * Active only when NEXT_PUBLIC_POSTHOG_KEY is set. Optional host overrides
 * via NEXT_PUBLIC_POSTHOG_HOST (default https://eu.i.posthog.com — EU region
 * for India/EU GDPR-friendly storage). When the key is absent the loader
 * renders nothing and `capture` / `identify` are no-ops, so the module is
 * safe to import unconditionally from the root layout.
 *
 * Get the key: PostHog -> Project -> Settings -> Project API Keys -> Project
 * API Key (phc_...). Free tier covers 1M events/month + 5K session replays.
 */
import Script from 'next/script';
import { createElement, type ReactElement } from 'react';

declare global {
  interface Window {
    posthog?: {
      init: (key: string, opts: Record<string, unknown>) => void;
      capture: (name: string, props?: Record<string, unknown>) => void;
      identify: (id: string, props?: Record<string, unknown>) => void;
      reset: () => void;
      register: (props: Record<string, unknown>) => void;
      getFeatureFlag: (key: string) => boolean | string | undefined;
      onFeatureFlags: (cb: () => void) => () => void;
      people?: { set: (props: Record<string, unknown>) => void };
    };
  }
}

export function PostHogScript(): ReactElement | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

  // Standard PostHog js-lite snippet. autocapture + pageviews on; session
  // recording opt-in via dashboard. Defer init until lazyOnload (after window load) so it
  // never blocks LCP.
  return createElement(Script, {
    id: 'posthog-init',
    strategy: 'lazyOnload',
    dangerouslySetInnerHTML: {
      __html: `
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        posthog.init(${JSON.stringify(key)}, { api_host: ${JSON.stringify(host)}, person_profiles: 'identified_only', capture_pageview: true, capture_pageleave: true });
      `,
    },
  });
}

export function capture(name: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.posthog) return;
  window.posthog.capture(name, props);
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.posthog) return;
  window.posthog.identify(userId, props);
}

export function reset(): void {
  if (typeof window === 'undefined' || !window.posthog) return;
  window.posthog.reset();
}
