import 'server-only';

import { cookies } from 'next/headers';

import { LOCALE_COOKIE, normalizeLocale, type Locale } from './locales';
import { getTranslations } from '../t';

/**
 * Read the visitor's stored locale inside a server component.
 *
 * ⚠️ COST — read this before adding a call site. `cookies()` is a dynamic API:
 * any route that reaches this function opts OUT of static prerendering for that
 * whole route. The app currently prerenders 61 routes via generateStaticParams
 * and serves them from the Cloudflare edge, so this must stay opt-in per
 * surface. It is deliberately NOT called from app/layout.tsx: doing so would
 * make all ~370 routes render per-request on a free-tier Render box in exchange
 * for translating chrome that is 5% translated today.
 *
 * The locale landings (app/{hi,ta,te,bn,mr}/page.tsx) do not need this at all —
 * they know their own locale statically.
 */
export async function resolveLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/**
 * Drop-in replacement for `getTranslations(ns)` that resolves the active locale
 * from the request instead of assuming English.
 *
 *   -import { getTranslations } from '../../lib/t';
 *   +import { getServerTranslations as getTranslations } from '../../lib/i18n/server';
 *
 * One line per page, no call-site changes — but see the cost note above.
 */
export async function getServerTranslations<N extends Parameters<typeof getTranslations>[0]>(
  ns: N,
) {
  return getTranslations(ns, await resolveLocale());
}
