import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * SEO-09 (prod sweep 2026-08-12) — /support/faq served the root layout's title
 * and description verbatim, so it shipped as one more SERP entry reading
 * "Darshya — India's Devotional Super App".
 *
 * page.tsx here is a 'use client' component and a client component cannot
 * export `metadata`, so the segment layout carries it — the arrangement
 * app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx already use.
 * The brand is deliberately absent from the title: the root layout's template
 * (lib/seo/title-template.ts) appends it exactly once, and repeating it here
 * is the doubling SEO-03 removed from 171 files.
 *
 * NOTE, NOT A DECISION MADE HERE: /faqs is a second FAQ surface with its own
 * written metadata ("FAQs — Puja Booking, Live Darshan, Pricing, Yatra").
 * Whether the site should have two is a content question, not a metadata one,
 * so this page keeps its own canonical and a title written to be visibly
 * different from /faqs rather than being quietly noindexed out of the way.
 */
export const metadata: Metadata = {
  title: 'Support FAQs — Bookings, Payments & Refunds',
  description:
    'Searchable support answers on puja bookings, payments and refunds, video proof, pandit assignment, donations and 80G receipts, store orders and account privacy.',
  alternates: { canonical: 'https://darshya.online/support/faq' },
};

export default function SupportFaqLayout({ children }: { children: ReactNode }) {
  return children;
}
