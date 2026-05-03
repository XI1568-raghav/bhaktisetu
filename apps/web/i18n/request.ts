import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale } from './config';

// Server-side message loader for next-intl. Falls back to the default locale
// when the segment is missing (e.g. unprefixed English routes).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
