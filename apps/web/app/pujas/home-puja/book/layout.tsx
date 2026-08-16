import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — the at-home puja wizard had no metadata, so
 * it emitted the root layout's title and description: one more SERP entry
 * reading "Darshya — India's Devotional Super App" on the route PF-01 had just
 * pointed all 32 ceremony CTAs at.
 *
 * WHY THE LAYOUT AND NOT page.tsx, WHICH IS A SERVER COMPONENT AND COULD HOLD
 * IT. `__tests__/pf10-home-puja-book-route.test.tsx` asserts that page module's
 * export list is exactly ['default'] — a deliberate guard from PF-10, when a
 * stray named export on a route segment was the failure mode. `metadata` is a
 * recognised segment export and would not actually break a build, but the
 * guard is coarse by design and there is no reason to spend it here: a layout
 * carries the metadata just as well and leaves that contract intact.
 *
 * A static export rather than generateMetadata: the ceremony comes from
 * `?slug=`, and search params are not available to metadata resolution. The
 * per-ceremony titles live on the /pujas/home-puja/[slug] detail pages, which
 * is where they belong — this is the step after the choice, not the page that
 * should rank for it.
 *
 * noindex, follow, matching app/pujas/book/layout.tsx: a parameterised wizard
 * step is a thin duplicate of the detail page it came from. noindex also
 * exempts the route from the per-route canonical rule, which it could not
 * satisfy honestly with one URL serving eight ceremonies.
 */
export const metadata: Metadata = {
  title: 'Book a Pandit for a Puja at Your Home',
  description:
    'Choose the ceremony, date and package for an at-home puja, add the samagri kit, and see the full price including the platform fee before you pay.',
  robots: { index: false, follow: true },
};

export default function BookHomePujaLayout({ children }: { children: ReactNode }) {
  return children;
}
