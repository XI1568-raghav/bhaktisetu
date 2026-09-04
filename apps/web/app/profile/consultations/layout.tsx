import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — /profile/consultations served the root
 * layout's title and description verbatim, so it shipped as one more SERP
 * entry reading "Darshya — India's Devotional Super App".
 *
 * page.tsx here is a 'use client' component and a client component cannot
 * export `metadata`, so the segment layout carries it — the arrangement
 * app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx already use.
 * The brand is deliberately absent from the title: the root layout's
 * template (lib/seo/title-template.ts) appends it exactly once, and
 * repeating it here is the doubling SEO-03 removed from 171 files.
 *
 * A signed-in surface: noindex, nofollow. There is nothing here for a
 * crawler and every link leads further into the account.
 */
export const metadata: Metadata = {
  title: 'My Consultations',
  description:
    'Every astrology consultation you have booked — astrologer, date, duration, amount paid and the room link once the session is due.',
  robots: { index: false, follow: false },
};

export default function ProfileConsultationsLayout({ children }: { children: ReactNode }) {
  return children;
}
