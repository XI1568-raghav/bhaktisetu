/**
 * The web help centre, reachable from inside the app — audit I18N-09.
 *
 * The mobile app had a Support screen that could file a TICKET and nothing that
 * could answer a question. Meanwhile apps/web grew a real help centre: seven
 * English guides, an honest per-language coverage line, and unreviewed
 * translations badged and kept out of the index. `grep -rn "/help" apps/mobile`
 * matched zero lines, so none of it existed for a devotee holding a phone.
 *
 * WHY A LINK AND NOT A SCREEN. The articles are content, versioned and served
 * by the web app; mirroring them into the bundle would mean shipping a build to
 * correct a typo, and a stale copy of a refund policy is worse than a browser
 * hop. `lib/booking-flow.ts` already sends the payment step to the web app for
 * the same reason. If this becomes an in-app reader later, this module is the
 * one place the destination is decided.
 */

const WEB_ORIGIN = 'https://darshya.online';

/** Where "Help Center" goes. Matches apps/web/app/help/page.tsx. */
export const HELP_CENTRE_URL = `${WEB_ORIGIN}/help`;

/**
 * The row's label. Kept here beside the URL so a screen cannot advertise one
 * destination and open another.
 */
export const HELP_CENTRE_LABEL = 'Help Center';

/**
 * One article. Shape matches apps/web/app/help/articles/[lang]/[slug]/page.tsx.
 * The slug is escaped rather than interpolated raw — a slug is data, and the
 * article catalogue is edited by hand.
 */
export function helpArticleUrl(lang: string, slug: string): string {
  return `${WEB_ORIGIN}/help/articles/${encodeURIComponent(lang)}/${encodeURIComponent(slug)}`;
}

/** Whatever actually opens a URL. `Linking.openURL` in the app. */
export type UrlOpener = (url: string) => Promise<unknown>;

/**
 * Open the help centre in the system browser.
 *
 * The opener is INJECTED rather than imported. apps/mobile/vitest.config.ts
 * runs in a plain node environment with no react-native transform, so a module
 * that imports `react-native` at the top level cannot be unit-tested at all —
 * which is how the app ended up with untested navigation in the first place.
 * The screen passes `Linking.openURL`; the test passes a stub.
 *
 * Resolves to `false` rather than throwing when nothing can handle the URL:
 * failing to open a help link must never crash the support screen, which is the
 * one screen a devotee reaches when something has already gone wrong.
 */
export async function openHelpCentre(
  open: UrlOpener,
  url: string = HELP_CENTRE_URL,
): Promise<boolean> {
  try {
    await open(url);
    return true;
  } catch {
    return false;
  }
}
