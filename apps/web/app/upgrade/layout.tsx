import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — /upgrade served the root layout's title
 * and description verbatim, so it shipped as one more SERP entry reading
 * "Darshya — India's Devotional Super App".
 *
 * page.tsx here is a 'use client' component and a client component cannot
 * export `metadata`, so the segment layout carries it — the arrangement
 * app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx already use.
 * The brand is deliberately absent from the title: the root layout's
 * template (lib/seo/title-template.ts) appends it exactly once, and
 * repeating it here is the doubling SEO-03 removed from 171 files.
 *
 * Behind AuthGuard; /pricing is the public surface for the same plans.
 *
 * A step inside a flow rather than a destination: noindex, follow. The page
 * it is reached from is the entry that should rank.
 */
export const metadata: Metadata = {
  title: 'Upgrade to Bhakti Pass',
  // TC-03/LEG-09: "and dollars" outlived the USD rail. Stripe was removed
  // 2026-08-11 and every plan is charged in INR through Razorpay, so no plan
  // on this page has a dollar price to compare.
  description:
    'Compare the Darshya membership plans — what each includes, what it costs in rupees, and switch plan in a single step.',
  robots: { index: false, follow: true },
};

export default function UpgradeLayout({ children }: { children: ReactNode }) {
  return children;
}
