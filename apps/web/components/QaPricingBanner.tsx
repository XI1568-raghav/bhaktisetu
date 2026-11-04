'use client';

import { QA_PRICING_BANNER_TEXT, useQaPricing } from '../lib/qa-pricing';

/**
 * Shown on every page, only to a signed-in tester on the server's
 * QA_PAYER_EMAILS allowlist, so nobody mistakes the waived-fee prices for the
 * real ones. Renders nothing for everyone else.
 */
export function QaPricingBanner() {
  const qa = useQaPricing();
  if (!qa) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-4 md:justify-start">
      <div
        role="status"
        data-testid="qa-pricing-banner"
        className="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900 shadow-lg"
      >
        {QA_PRICING_BANNER_TEXT}
      </div>
    </div>
  );
}
