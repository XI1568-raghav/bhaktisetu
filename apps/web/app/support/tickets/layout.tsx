import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TITLE_TEMPLATE } from '../../../lib/seo/title-template';

/**
 * SEO-09 (prod sweep 2026-08-12) — /support/tickets served the root layout's
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
 * A signed-in surface: noindex, nofollow. There is nothing here for a
 * crawler and every link leads further into the account.
 *
 * TEMPLATE, NOT A BARE STRING. Routes live below this segment, and a plain
 * `title: '…'` resolves to `{ absolute, template: null }` — which every one
 * of them would then inherit, shipping with no " | Darshya" at all. Declaring
 * `default` keeps this page's own title (the parent template still brands it)
 * and `template` keeps the brand flowing downwards. Guarded by
 * __tests__/seo/layout-title-template-inheritance.test.ts.
 */
export const metadata: Metadata = {
  title: { default: 'My Support Tickets', template: TITLE_TEMPLATE },
  description:
    'Every support ticket you have raised with Darshya — category, status, last reply and whether it is still open.',
  robots: { index: false, follow: false },
};

export default function SupportTicketsLayout({ children }: { children: ReactNode }) {
  return children;
}
