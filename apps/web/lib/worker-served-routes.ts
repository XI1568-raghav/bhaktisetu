/**
 * Routes that Cloudflare answers with the Worker rather than from static assets
 * (docs/runbooks/cloudflare-web-deploy.md, "Still Worker-served").
 *
 * Every `next/link` to one of them that sits in the viewport is PREFETCHED, and each
 * prefetch is a Worker invocation. A cold isolate spends ~0.9 s CPU importing the server
 * bundle against the free plan's 10 ms limit (error 1102 / 503), so a persistent link such
 * as the mobile bottom bar or the menu drawer produced a 503 on page loads the visitor
 * never asked for, and spent Worker requests (100k/day) on them. Navigation is
 * unaffected: the click still loads the page, it just is not fetched ahead of time.
 *
 * Pass the result as the `prefetch` prop: `false` for these, `undefined` (the default
 * behaviour) for everything else. Remove a path from this list when it moves to assets.
 */
const EXACT = new Set([
  '/pujas',
  '/store',
  '/today',
  '/panchang',
  '/donations',
  '/pandits',
  '/wellness',
  '/yatra-packages',
  '/astrology',
  '/content',
  '/changelog',
  '/status',
  '/updates',
  '/waitlist',
  '/consultation',
]);
const PREFIXES = ['/panchang/', '/store/', '/pandits/', '/yatra-packages/', '/consultation/', '/wellness/classes/', '/wellness/instructors/'];

export function linkPrefetch(href: string): false | undefined {
  const path = href.split(/[?#]/)[0] ?? '';
  return EXACT.has(path) || PREFIXES.some((p) => path.startsWith(p)) ? false : undefined;
}
