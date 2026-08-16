import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — /weddings/muhurat served the root
 * layout's title and description verbatim, so it shipped as one more SERP
 * entry reading "Darshya — India's Devotional Super App".
 *
 * page.tsx here is a 'use client' component and a client component cannot
 * export `metadata`, so the segment layout carries it — the arrangement
 * app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx already use.
 * The brand is deliberately absent from the title: the root layout's
 * template (lib/seo/title-template.ts) appends it exactly once, and
 * repeating it here is the doubling SEO-03 removed from 171 files.
 */
export const metadata: Metadata = {
  title: 'Vivah Muhurat Dates — Auspicious Wedding Days',
  description:
    'Shubh vivah muhurat dates month by month with the tithi, nakshatra and the exact auspicious window, and the pandits free on each date.',
  alternates: { canonical: 'https://darshya.online/weddings/muhurat' },
};

export default function WeddingsMuhuratLayout({ children }: { children: ReactNode }) {
  return children;
}
