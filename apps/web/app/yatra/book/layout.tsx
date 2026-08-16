import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — /yatra/book served the root layout's
 * title and description verbatim, so it shipped as one more SERP entry
 * reading "Darshya — India's Devotional Super App".
 *
 * page.tsx here is a 'use client' component and a client component cannot
 * export `metadata`, so the segment layout carries it — the arrangement
 * app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx already use.
 * The brand is deliberately absent from the title: the root layout's
 * template (lib/seo/title-template.ts) appends it exactly once, and
 * repeating it here is the doubling SEO-03 removed from 171 files.
 *
 * A step inside a flow rather than a destination: noindex, follow. The page
 * it is reached from is the entry that should rank.
 */
export const metadata: Metadata = {
  title: 'Request a Yatra Booking',
  description:
    'Send a booking request for a pilgrimage package — dates, travellers, package tier and add-ons. Our yatra desk confirms availability before any charge.',
  robots: { index: false, follow: true },
};

export default function YatraBookLayout({ children }: { children: ReactNode }) {
  return children;
}
