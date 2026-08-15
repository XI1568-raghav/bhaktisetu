'use client';

import { useEffect, useState } from 'react';
import { getStoredConsent } from './CookieBanner';

/**
 * TD-07 (prod sweep 2026-08-12): three floating overlays occupied the bottom
 * ~95px of the first 720px screen at once on /festival, /panchang, /calendar,
 * /kundli and /live — the consent bar ("Reject all" / "Manage preferences" /
 * "Accept all" at y627), the support chat launcher (y644) and the aarti
 * countdown with its dismiss control (y666). Three competing interruptions
 * before the devotee has read a single festival date, and on a phone
 * proportionally worse.
 *
 * The consent choice is the one that must not be crowded: a consent UI
 * competing with two other overlays is a consent-quality problem, not just
 * clutter. So the discretionary overlays wait for it. Nothing here changes the
 * banner itself — it publishes `darshya:consent-changed` when a choice is
 * persisted, and exposes the stored state, which is all this needs.
 *
 * Renders nothing at all until the choice is resolved, so a first-time visitor
 * sees exactly one floating element and a returning visitor (who has a stored
 * choice, and therefore no banner) sees the overlays immediately.
 */
export function useConsentResolved(): boolean {
  // Server render and first client paint agree on false: the answer lives in
  // localStorage, and reading it during render would hydrate-mismatch.
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const read = () => setResolved(getStoredConsent() !== null);
    read();
    window.addEventListener('darshya:consent-changed', read);
    return () => window.removeEventListener('darshya:consent-changed', read);
  }, []);

  return resolved;
}

export default function ConsentGate({ children }: { children: React.ReactNode }) {
  return useConsentResolved() ? <>{children}</> : null;
}
