/**
 * I-10 (prod sweep 2026-08-12, P3) — 21 bare `toLocaleString()` calls in
 * apps/web silently took whatever locale the runtime happened to have.
 *
 * The finding framed this as cosmetic ("wrong separators"). It is worse than
 * that on a server-rendered page: the SERVER resolves the default locale from
 * the container (Render's Node image is effectively C/en-US, and it is not
 * pinned anywhere), the CLIENT resolves it from the browser. When those differ
 * React hydration finds different text in the same node — for numbers the
 * grouping separator, for dates the entire rendering plus the timezone. So the
 * defect class is a hydration mismatch that only appears for users whose
 * browser locale is not the server's, which is precisely the audience this
 * product is built for.
 *
 * Fixing it means pinning a locale, not passing `undefined` more explicitly.
 *
 * en-IN is chosen deliberately, not as a neutral default: it gives Indian digit
 * grouping (1,00,000 rather than 100,000), which is the correct presentation for
 * this audience, and it matches the IST day boundary the API already uses for
 * metrics. Asia/Kolkata is pinned for the same reason — an admin reading
 * "last run" wants it in the timezone the business operates in, not the
 * container's UTC.
 */

export const APP_LOCALE = 'en-IN';
export const APP_TIME_ZONE = 'Asia/Kolkata';

/** A count or measurement. Stable across server and client. */
export function formatNumber(value: number): string {
  return value.toLocaleString(APP_LOCALE);
}

/**
 * A date and time in the product's timezone. Takes what `new Date()` takes so
 * call sites can pass an ISO string straight through.
 *
 * Invalid input returns an em dash rather than "Invalid Date" — these render in
 * admin tables where a malformed timestamp should read as absent, not as an
 * error string leaking into the UI.
 */
export function formatDateTime(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(APP_LOCALE, { timeZone: APP_TIME_ZONE });
}
