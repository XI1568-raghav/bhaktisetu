/**
 * The `/` language redirect, in the browser.
 *
 * middleware.ts used to answer `/` with a 307 to `/hi` (etc.) for a visitor whose
 * `poojly_language` cookie holds a language they CHOSE. `/` is now a static asset
 * that Cloudflare serves without running the Worker or the middleware, so that
 * decision moves here: an inline script, before first paint, with the same rules as
 * `rootLocaleRedirect` in middleware.ts:
 *   - only the bare root (a path other than `/` never redirects);
 *   - only a supported non-English locale from the cookie (no cookie, or English:
 *     stay, so the anonymous English page is what everybody else sees);
 *   - a query string is carried over (`?utm_...`).
 * `location.replace` keeps the redirect out of the history stack, as a 307 did.
 * A visitor with scripts disabled simply sees the English homepage, which is also
 * what a crawler (which sends no cookie) always saw.
 */
export const HOME_LOCALE_REDIRECT_SCRIPT =
  "(function(){try{if(location.pathname!=='/')return;var m=document.cookie.match(/(?:^|; )poojly_language=([^;]*)/);" +
  "var l=m&&decodeURIComponent(m[1]);" +
  "if(l&&['hi','ta','te','bn','mr'].indexOf(l)>-1){location.replace('/'+l+location.search)}}catch(e){}})();";

export default function HomeLocaleRedirect() {
  return <script dangerouslySetInnerHTML={{ __html: HOME_LOCALE_REDIRECT_SCRIPT }} />;
}
