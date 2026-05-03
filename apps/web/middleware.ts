import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Locale-aware middleware. With localePrefix='as-needed' English keeps its
// existing unprefixed routes (`/`, `/temples`, `/pujas`) untouched while
// `/hi`, `/ta`, `/te`, `/kn` resolve to the translated `[locale]` segment.
export default createMiddleware(routing);

export const config = {
  // Limit middleware to the surface that has translations today. Adding new
  // localised routes? Extend this matcher rather than letting it run on the
  // whole app — keeps Cloudflare worker invocations cheap.
  // Only run middleware on explicitly-prefixed locale routes. English
  // unprefixed routes (`/`, `/temples`, `/pujas`) bypass next-intl entirely
  // since pages don't yet use useTranslations() — having middleware run
  // there caused infinite "Loading…" spinner on darshya.online.
  // Re-add `/` + page paths here once each page wraps in NextIntlClientProvider.
  matcher: [
    '/(hi|ta|te|kn)/:path*',
  ],
};
