'use client';

import { openCookieSettings } from './CookieBanner';

/**
 * LEG-15 (prod sweep 2026-08-12) — the only published way to change a cookie
 * choice was "clear the darshya_cookie_consent_v1 entry in your browser
 * storage". This is the control that sentence should always have been.
 *
 * It re-opens the existing consent panel (with the stored choices pre-filled)
 * rather than duplicating the preference UI, so there is exactly one place
 * where consent is written and one shape it is written in.
 */
export default function CookieSettingsButton({
  label = 'Cookie settings',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      data-testid="cookie-settings-button"
      className={
        className ??
        'inline-flex h-11 items-center justify-center rounded-lg border border-surface-300 px-4 text-sm font-medium text-surface-800 hover:bg-surface-50'
      }
    >
      {label}
    </button>
  );
}
