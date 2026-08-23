"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buttonClass } from '../components/ui/button-recipe';

type ConsentCategory = "essential" | "analytics" | "marketing";

type ConsentState = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt: string;
  version: number;
};

const STORAGE_KEY = "darshya_cookie_consent_v1";
const CONSENT_VERSION = 1;
const REPROMPT_DAYS = 365;

function loadConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    const acceptedAt = new Date(parsed.acceptedAt).getTime();
    const ageDays = (Date.now() - acceptedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > REPROMPT_DAYS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent("darshya:consent-changed", { detail: state })
    );
  } catch {
    // ignore quota / privacy mode failures
  }
}

export function getStoredConsent(): ConsentState | null {
  return loadConsent();
}

/**
 * LEG-15 (prod sweep 2026-08-12) — there was no way to change a cookie choice
 * once made. The banner unmounts after Accept/Reject and nothing re-opened it;
 * a scan of every <a> and <button> for /cookie|consent|preferen/i after
 * "Reject all" returned []. The cookie policy's own remedy was, verbatim,
 * "clearing the darshya_cookie_consent_v1 entry in your browser storage" —
 * self-documenting non-compliance, because UK GDPR and the DPDP Act both
 * require withdrawal to be as easy as consent.
 *
 * The banner now listens for this event, so any surface can re-open the
 * preference panel with the stored choices pre-filled.
 */
export const OPEN_CONSENT_EVENT = 'darshya:open-consent';

/** Re-open the consent panel from anywhere (footer link, cookie policy page). */
export function openCookieSettings() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT));
}

export function hasConsent(category: ConsentCategory): boolean {
  const state = loadConsent();
  if (!state) return category === "essential";
  return Boolean(state[category]);
}

/**
 * RESP-01 — the banner is position:fixed, so it used to sit ON TOP of whatever
 * was at the bottom of the page. At 390x844 it covered 41% of the viewport and
 * buried the entire /auth/login form: a hit test on the Sign In button's own
 * centre returned "Reject all". Scrolling did not help.
 *
 * While the banner is open it now publishes its measured height as --consent-h.
 * globals.css reserves that much space at the end of the document, and the
 * mobile tab bar lifts above it, so nothing is ever occluded. Measured rather
 * than hardcoded because the height changes when "Manage preferences" expands
 * and when the title wraps at different widths.
 */
const CONSENT_HEIGHT_VAR = "--consent-h";

function publishConsentHeight(px: number | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (px === null) root.style.removeProperty(CONSENT_HEIGHT_VAR);
  else root.style.setProperty(CONSENT_HEIGHT_VAR, `${Math.ceil(px)}px`);
}

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const state = loadConsent();
    if (!state) {
      setOpen(true);
      return;
    }
    setAnalytics(state.analytics);
    setMarketing(state.marketing);
  }, []);

  // LEG-15: re-open on request, with the stored choices pre-filled and the
  // per-category panel already expanded — withdrawing has to be at least as
  // easy as the one click that granted consent.
  useEffect(() => {
    const reopen = () => {
      const state = loadConsent();
      setAnalytics(state?.analytics ?? false);
      setMarketing(state?.marketing ?? false);
      setShowSettings(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  useLayoutEffect(() => {
    const node = shellRef.current;
    if (!open || !node) {
      publishConsentHeight(null);
      return;
    }
    publishConsentHeight(node.getBoundingClientRect().height);

    // The height changes when preferences expand or the viewport rotates.
    // Read the border box, not contentRect — the shell carries px-4 pb-4, and
    // contentRect would under-reserve by exactly that padding.
    const ro = new ResizeObserver(() => {
      publishConsentHeight(node.getBoundingClientRect().height);
    });
    ro.observe(node);
    return () => {
      ro.disconnect();
      publishConsentHeight(null);
    };
  }, [open]);

  const save = (next: { analytics: boolean; marketing: boolean }) => {
    const state: ConsentState = {
      essential: true,
      analytics: next.analytics,
      marketing: next.marketing,
      acceptedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    persistConsent(state);
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setOpen(false);
    setShowSettings(false);
  };

  if (!open) return null;

  return (
    <div
      ref={shellRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="darshya-cookie-title"
      className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      {/* RESP-01: at 390x844 this card was 347px — 41% of the viewport — which
          left 497px for a 632px sign-in form. Tighter type and padding on
          mobile bring it to ~240px. Every word of the notice is still shown at
          every breakpoint: nothing is clamped, collapsed or removed, because
          shrinking a DPDP/UK-GDPR disclosure is a compliance decision, not a
          layout one. */}
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-4 shadow-xl sm:p-6"
        style={{ borderColor: "var(--color-border, #e6e2db)" }}
      >
        <h2 id="darshya-cookie-title" className="text-sm font-semibold leading-snug text-surface-900 sm:text-lg">
          We use cookies for darshan, devotion, and DPDP/UK-GDPR compliance
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-surface-700 sm:mt-2 sm:text-sm">
          Essential cookies keep your account and bookings working. Analytics and marketing
          cookies are optional and only run with your consent. You can change these any time
          in our <a href="/legal/cookies" className="underline">Cookie Policy</a>.
        </p>

        {showSettings && (
          <div className="mt-4 space-y-3 rounded-lg border border-surface-200 p-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked disabled aria-readonly className="mt-1" />
              <span>
                <span className="font-medium text-surface-900">Essential</span>
                <span className="block text-surface-600">
                  Authentication, cart, booking flow, fraud protection. Required.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-surface-900">Analytics</span>
                <span className="block text-surface-600">
                  PostHog product analytics &amp; Cloudflare Web Analytics. Helps us improve.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-surface-900">Marketing</span>
                <span className="block text-surface-600">
                  Google Ads conversion pixel, Meta retargeting. Optional.
                </span>
              </span>
            </label>
          </div>
        )}

        {/* RESP-01: three stacked full-width buttons cost ~148px of a 844px
            viewport. A 2-up grid on mobile drops that to ~96px. The disclosure
            copy above is untouched — shortening a DPDP/UK-GDPR notice is not a
            layout decision. */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={() => save({ analytics: false, marketing: false })}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-surface-300 px-4 text-sm font-medium text-surface-800 hover:bg-surface-50"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            // order-last keeps the two actual choices side by side on row 1 and
            // drops this full-width onto row 2. Without it, DOM order puts the
            // col-span-2 element second, which wraps and costs a third row.
            className="order-last col-span-2 inline-flex h-11 items-center justify-center rounded-lg border border-surface-300 px-4 text-sm font-medium text-surface-800 hover:bg-surface-50 sm:order-none sm:col-span-1"
            aria-expanded={showSettings}
          >
            {showSettings ? "Hide settings" : "Manage preferences"}
          </button>
          {showSettings ? (
            <button
              type="button"
              onClick={() => save({ analytics, marketing })}
              className={buttonClass('primary', 'md')}
            >
              Save preferences
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save({ analytics: true, marketing: true })}
              className={buttonClass('primary', 'md')}
            >
              Accept all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
