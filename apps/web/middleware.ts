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
  matcher: [
    '/',
    '/(hi|ta|te|kn)/:path*',
    '/temples',
    '/pujas',
  ],
};
