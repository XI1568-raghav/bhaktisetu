import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * DF-13 (prod sweep 2026-08-12, P3) — the booking wizard shipped with no page
 * metadata at all.
 *
 * `/pujas/book` is a `'use client'` route, and a client component cannot export
 * `metadata`, so the whole page fell back to the root default
 * "Darshya — India's Devotional Super App" while every sibling in the funnel
 * carries a written title. A segment layout is the one place a client route can
 * still declare its own; it runs on the server and applies to the whole
 * segment.
 *
 * The title deliberately does NOT repeat the brand: the root layout's
 * `title.template` (lib/seo/title-template.ts) appends it exactly once. Adding
 * it here is what produced the "| Darshya | Darshya" suffix SEO-03 removed from
 * 171 route files.
 *
 * `noindex` is intentional. This is a parameterised step inside a funnel — its
 * content depends on ?slug= and is rendered client-side, so there is nothing
 * for a crawler to index and a thin duplicate of the detail page is worse than
 * no entry. The detail pages it is reached from are the indexable surface.
 */
export const metadata: Metadata = {
  title: 'Book a Puja — Choose Your Temple, Date and Pandit',
  description:
    'Complete your puja booking: pick a temple, a date and a time slot, add devotee names and sankalp, and see the full price including the platform fee before you pay.',
  alternates: { canonical: 'https://darshya.online/pujas/book' },
  robots: { index: false, follow: true },
};

export default function BookPujaLayout({ children }: { children: ReactNode }) {
  return children;
}
