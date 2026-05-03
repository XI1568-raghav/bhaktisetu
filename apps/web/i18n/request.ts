import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale, type Locale } from './config';

// Server-side message loader. Locale resolution priority:
//   1. URL prefix (next-intl middleware sets `requestLocale` for `/hi`, `/ta`, …)
//   2. `darshya_lang` cookie (set by HindiToggle, two-letter code)
//   3. defaultLocale (`en`)
// Falling through to the cookie is what makes the globe toggle on unprefixed
// English routes actually flip page strings to Hindi without rewriting URLs.
export default getRequestConfig(async ({ requestLocale }) => {
  const fromUrl = await requestLocale;
  let locale: Locale = defaultLocale;

  if (fromUrl && isLocale(fromUrl)) {
    locale = fromUrl;
  } else {
    try {
      const store = await cookies();
      const cookieLocale = store.get('darshya_lang')?.value;
      if (cookieLocale && isLocale(cookieLocale)) {
        locale = cookieLocale;
      }
    } catch {
      // cookies() can throw outside a request scope (e.g. during static prerender);
      // fall through to defaultLocale.
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
