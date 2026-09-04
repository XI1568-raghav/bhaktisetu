import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — /refer served the root layout's title and
 * description verbatim, so it shipped as one more SERP entry reading
 * "Darshya — India's Devotional Super App".
 *
 * page.tsx here is a 'use client' component and a client component cannot
 * export `metadata`, so the segment layout carries it — the arrangement
 * app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx already use.
 * The brand is deliberately absent from the title: the root layout's
 * template (lib/seo/title-template.ts) appends it exactly once, and
 * repeating it here is the doubling SEO-03 removed from 171 files.
 */
export const metadata: Metadata = {
  title: 'Refer & Earn Darshya Credits',
  description:
    'Share your referral link and earn Darshya credits when a friend completes their first puja booking, live darshan or astrology consultation.',
  alternates: { canonical: 'https://darshya.online/refer' },
};

export default function ReferLayout({ children }: { children: ReactNode }) {
  return children;
}
