// Root-layout social-card defaults, extracted from app/layout.tsx so they can
// be resolved through Next.js' own metadata resolver in a test instead of being
// eyeballed in a 600-line layout component.
//
// WHY THIS FILE EXISTS (prod sweep 2026-08-12, SEO-04)
// ----------------------------------------------------
// Next.js merges metadata one KEY at a time (see mergeMetadata in
// next/dist/lib/metadata/resolve-metadata.js: `for (const key_ in source)`).
// A route that never writes `twitter` keeps the ROOT's resolved twitter object
// verbatim — Next does NOT derive it from that route's own openGraph. So a root
// `twitter` block carrying a title/description/image made 1,652 production
// pages advertise the homepage's card: sharing the Vishnu Aarti page to a family
// group produced "Darshya — India's Devotional Super App" over a Golden Temple
// photo, with no hint of what was actually shared.
//
// The inverse is what makes the fix work. postProcessMetadata() runs last, on
// the fully-merged object, and back-fills twitter from openGraph — but ONLY for
// the keys twitter left empty (`if (!hasTwTitle) … if (!hasTwDescription) …`).
// Leaving them empty here is therefore not a hole; it is the hook that makes
// every page's Twitter card mirror that page's own Open Graph card.
//
// Same reasoning for openGraph. `title`/`description` are omitted so
// inheritFromMetadata() fills them from the page's own `title`/`description`,
// and `url` is the relative `'./'`, which resolveRelativeUrl() resolves against
// the CURRENT pathname. A literal homepage URL here made /temples and /aarti
// emit `og:url=https://darshya.online` — every share of those pages resolved to
// the homepage.

import type { Metadata } from 'next';

export const SITE_URL = 'https://darshya.online';

/** Site-wide OG fallback image. Sized/checked by __tests__/images-perf.test.ts. */
export const SITE_OG_IMAGE = '/images/golden-temple-og.jpg';

/**
 * Root `openGraph`. Deliberately carries NO `title` and NO `description`:
 * Next.js fills both from the declaring page's own metadata. `url: './'`
 * resolves to the current route.
 */
export const SITE_OPEN_GRAPH: Metadata['openGraph'] = {
  type: 'website',
  locale: 'en_IN',
  // Relative on purpose. Next's resolveRelativeUrl() turns a leading './' into
  // the CURRENT pathname before resolving against metadataBase, so this one
  // literal yields the right og:url on all ~1,600 routes.
  url: './',
  siteName: 'Darshya',
  images: [SITE_OG_IMAGE],
};

/**
 * Root `twitter`. Card TYPE only — no content. Every page's card is mirrored
 * from that page's own openGraph by Next's postProcessMetadata().
 */
export const SITE_TWITTER: Metadata['twitter'] = {
  card: 'summary_large_image',
};
