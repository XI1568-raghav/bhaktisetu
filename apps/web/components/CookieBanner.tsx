"use client";

import { useEffect, useState } from "react";

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

export function hasConsent(category: ConsentCategory): boolean {
  const state = loadConsent();
  if (!state) return category === "essential";
  return Boolean(state[category]);
}

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const state = loadConsent();
    if (!state) {
      setOpen(true);
      return;
    }
    setAnalytics(state.analytics);
    setMarketing(state.marketing);
  }, []);

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
      role="dialog"
      aria-modal="false"
      aria-labelledby="darshya-cookie-title"
      className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-5 shadow-xl sm:p-6"
        style={{ borderColor: "var(--color-border, #e5e7eb)" }}
      >
        <h2 id="darshya-cookie-title" className="text-base font-semibold text-surface-900 sm:text-lg">
          We use cookies for darshan, devotion, and DPDP/UK-GDPR compliance
        </h2>
        <p className="mt-2 text-sm text-surface-700">
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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
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
            className="inline-flex h-11 items-center justify-center rounded-lg border border-surface-300 px-4 text-sm font-medium text-surface-800 hover:bg-surface-50"
            aria-expanded={showSettings}
          >
            {showSettings ? "Hide settings" : "Manage preferences"}
          </button>
          {showSettings ? (
            <button
              type="button"
              onClick={() => save({ analytics, marketing })}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-saffron-600 px-4 text-sm font-medium text-white hover:bg-saffron-700"
              style={{ background: "var(--color-primary, #E16318)" }}
            >
              Save preferences
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save({ analytics: true, marketing: true })}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-saffron-600 px-4 text-sm font-medium text-white hover:bg-saffron-700"
              style={{ background: "var(--color-primary, #E16318)" }}
            >
              Accept all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
