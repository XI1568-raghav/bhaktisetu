/**
 * The app's current language, as the API wants to hear it.
 *
 * The API answers in English unless a request carries Accept-Language
 * (apps/api/src/lib/i18n.ts), and a request that carries it also lets the
 * signed-in user's stored `preferredLanguage` outrank the header. So every
 * request must send one.
 *
 * The app has no language switcher or device-locale module (see settings.tsx),
 * so the only signal is the signed-in profile's `preferredLanguage`;
 * auth-context pushes it here on sign-in / hydrate / sign-out. Until then, and
 * for anything unusable, the answer is 'en'.
 */
const LANGUAGE_TAG_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/;

/**
 * A header-safe Accept-Language value, or null when there is nothing to send.
 * Validation matters: React Native's fetch does not reject CR/LF in a header
 * value, and the preference is a profile field.
 */
export function acceptLanguageFor(preferredLanguage: string | null | undefined): string | null {
  if (typeof preferredLanguage !== 'string') return null;
  const tag = preferredLanguage.trim();
  if (tag.length === 0 || tag.length > 35) return null;
  return LANGUAGE_TAG_RE.test(tag) ? tag : null;
}

export const DEFAULT_ACCEPT_LANGUAGE = 'en';

let current: string = DEFAULT_ACCEPT_LANGUAGE;

/** Set the app's current language. Null/unusable values reset to 'en'. */
export function setCurrentLanguage(language: string | null | undefined): void {
  current = acceptLanguageFor(language) ?? DEFAULT_ACCEPT_LANGUAGE;
}

/** The Accept-Language value every request carries. Never empty. */
export function currentAcceptLanguage(): string {
  return current;
}
