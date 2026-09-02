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
      // RESP-01 (second pass): the outer gutter is the cheapest height in the
      // whole banner — px-3/pb-3 below sm gives the card 16px more width (fewer
      // wrapped lines) AND 4px less height, with no change to a single word of
      // the notice. Measured at 390x844 against the compiled bundle: 278px →
      // 262px, i.e. the banner's top edge moves from y=566 to y=582.
      //
      // RESP-01 (fourth pass, 2026-09-01). The banner was still 262px and still
      // buried Sign In at 360x800 (15 of 44px on screen, hit test on the
      // button's centre returned the BANNER) and clipped it at 375x812. Five
      // changes below sm — pb-3→pb-2 here, p-3→px-3 py-2 on the card,
      // leading-snug on the notice, leading-tight on the title, mt-2.5→mt-2 and
      // gap-y-1.5→gap-y-1 on the button grid — take it 262px → 227px. Not one
      // word of the notice changed, nothing is clamped or collapsed, and every
      // button is still h-11. Measured, headless Chromium, fresh Tailwind build,
      // markup dumped from render() (see app/auth/layout.tsx for the rig and the
      // per-viewport table). The horizontal gutter stays px-3: px-2 was tried
      // and measured byte-identical, because the extra 8px does not unwrap a
      // line at any of the six sizes.
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-2 sm:px-6 sm:pb-6"
    >
      {/* RESP-01: at 390x844 this card was 347px — 41% of the viewport — which
          left 497px for a 632px sign-in form. Tighter type and padding on
          mobile bring it to ~240px. Every word of the notice is still shown at
          every breakpoint: nothing is clamped, collapsed or removed, because
          shrinking a DPDP/UK-GDPR disclosure is a compliance decision, not a
          layout one. */}
      {/* RESP-01 (fourth pass): px-3 py-2 below sm instead of p-3 — 8px of
          vertical card padding rather than 12px. The horizontal padding is
          deliberately left at 12px so the notice's wrap points do not move. */}
      {/* RESP-01 (fifth pass, 2026-09-01) — the HEIGHT CAP. Every pass before
          this one shaved fixed pixels off a banner whose height was still
          unbounded, so the guarantee was only ever "227px, at today's copy, at
          the six sizes someone remembered to measure". Two things that bound
          was blind to, both measured on the LIVE site (darshya.online,
          390x844, first visit, consent cleared):

            unexpanded                     banner 277px (32.8% of the viewport)
            "Manage preferences" expanded  banner 521px (61.7%), top edge y=323

          Expanding the per-category panel — one tap, on the banner's own
          middle button — takes the notice to 61.7% of a 390x844 phone and
          leaves 227px of the 649px sign-in card visible. No amount of padding
          arithmetic on the collapsed state reaches that, because the settings
          panel is ~244px of content that simply was not in the budget.

          `max-h-[45dvh]` makes the footprint a bounded FRACTION of the
          viewport instead of a measured constant, so it holds for the expanded
          panel, for longer disclosure copy, for a user's larger font size and
          for viewport sizes nobody has enumerated. The notice scrolls inside
          the cap; the action row is a sibling of the scroller, not inside it,
          so Reject/Accept/Manage never scroll out of reach — that is the part
          a naive `overflow-y:auto` on the card gets wrong (measured: it pushed
          all three buttons to y 840-936, off the bottom of an 844px screen).

          Measured with this structure injected into the live page at 390x844,
          preferences expanded: banner 521px -> 396px (46.9% incl. the outer
          px-3 pb-2 gutter), sign-in card visible 227px -> 352px, and all three
          banner buttons on screen and hit-testable.

          THAT MEASUREMENT IS TRUE AND DOES NOT CLOSE THE FINDING, which is the
          trap worth recording: it measures how much of the CARD is visible, and
          the finding is about the BUTTON. 352px of a 649px card is the top 352px
          — the heading, the Google button and the email field. Sign In is 444px
          down. The sixth pass below re-measured the button itself and found
          0 of 44px on screen at 390x844 with the panel expanded, at this cap. */}
      {/* RESP-01 (sixth pass, 2026-09-02) — the flat `max-h-[45dvh]` this
          replaces was measured NOT to close the finding: at 390x844 with
          "Manage preferences" expanded the banner was 388px, Sign In was
          508-552 with 0 of 44px visible, and elementFromPoint at the button's
          centre still returned the notice. A 1280x800 laptop failed even
          COLLAPSED (banner 213px @587 against Sign In 617-661). The cap is a
          policy, not a constant, and it lives in app/globals.css next to the
          --consent-h reservation it belongs with — see the derivation there.
          The 45dvh fallback is the previous behaviour, so a browser without
          :has() loses nothing. */}
      <div className="mx-auto flex max-h-[var(--consent-max-h,45dvh)] max-w-3xl flex-col rounded-xl border bg-white px-3 py-2 shadow-xl sm:p-6"
        style={{ borderColor: "var(--color-border, #e6e2db)" }}
      >
        {/* The scroll region. `min-h-0` is load-bearing: a flex child's default
            `min-height:auto` refuses to shrink below its content, which would
            defeat the cap and push the buttons off-screen exactly as measured
            above. `overscroll-contain` stops a flick inside the notice from
            chaining into the page behind it. */}
        {/* `flex-auto` (flex:1 1 auto), NOT `flex-1` (flex:1 1 0%). With a
            0% flex-basis the scroller's hypothetical main size is 0, and since
            `min-h-0` has already removed the automatic minimum there is nothing
            left to stop an auto-height container from collapsing to just the
            button row — i.e. `flex-1` here would delete the notice. */}
        <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain">
        <h2 id="darshya-cookie-title" className="text-sm font-semibold leading-tight text-surface-900 sm:text-lg sm:leading-snug">
          We use cookies for darshan, devotion, and DPDP/UK-GDPR compliance
        </h2>
        {/* RESP-01 (fourth pass): leading-relaxed -> leading-snug below sm, i.e.
            a 16.5px line box on 12px type instead of 19.5px. The notice runs to
            four lines on every phone width, so it is worth 12px — the single
            largest saving available without touching a word of the disclosure,
            which stays verbatim at every breakpoint. sm: keeps the roomier
            measure, where there is no competition for the viewport. */}
        <p className="mt-1 text-xs leading-snug text-surface-700 sm:mt-2 sm:text-sm sm:leading-relaxed">
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
        </div>
        {/* /scroll region — the action row below is deliberately OUTSIDE it. */}

        {/* RESP-01: three stacked full-width buttons cost ~148px of a 844px
            viewport. A 2-up grid on mobile drops that to ~96px. The disclosure
            copy above is untouched — shortening a DPDP/UK-GDPR notice is not a
            layout decision. */}
        {/* RESP-01 (fourth pass): mt-2.5 -> mt-2 and the ROW gap 6px -> 4px.
            The COLUMN gap stays 6px on purpose — that is the gap between
            "Reject all" and "Accept all", and the two consent choices should
            not get easier to mis-tap into each other. Every button is still
            h-11, so no target drops under 44px. */}
        <div className="mt-2 grid grid-cols-2 gap-x-1.5 gap-y-1 sm:mt-4 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
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
