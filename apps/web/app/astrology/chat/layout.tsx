import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — /astrology/chat served the root layout's
 * title and description verbatim, so it shipped as one more SERP entry
 * reading "Darshya — India's Devotional Super App".
 *
 * page.tsx here is a 'use client' component and a client component cannot
 * export `metadata`, so the segment layout carries it — the arrangement
 * app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx already use.
 * The brand is deliberately absent from the title: the root layout's
 * template (lib/seo/title-template.ts) appends it exactly once, and
 * repeating it here is the doubling SEO-03 removed from 171 files.
 */
export const metadata: Metadata = {
  title: 'Ask an AI Astrologer — Free Instant Answers',
  description:
    'Ask about your kundli, dasha, gochar or muhurat and get an instant Vedic answer for free, then connect to a verified human astrologer for a full reading.',
  alternates: { canonical: 'https://darshya.online/astrology/chat' },
};

export default function AstrologyChatLayout({ children }: { children: ReactNode }) {
  return children;
}
