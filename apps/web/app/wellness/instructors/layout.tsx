import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TITLE_TEMPLATE } from '../../../lib/seo/title-template';

/**
 * SEO-09 (prod sweep 2026-08-12) — /wellness/instructors served the root
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
 * No canonical here: every route under this segment declares its own, and a
 * canonical on the layout would be inherited by any future child that
 * forgets one — SEO-01 in miniature. Google self-canonicalises meanwhile.
 *
 * TEMPLATE, NOT A BARE STRING. Routes live below this segment, and a plain
 * `title: '…'` resolves to `{ absolute, template: null }` — which every one
 * of them would then inherit, shipping with no " | Darshya" at all. Declaring
 * `default` keeps this page's own title (the parent template still brands it)
 * and `template` keeps the brand flowing downwards. Guarded by
 * __tests__/seo/layout-title-template-inheritance.test.ts.
 */
export const metadata: Metadata = {
  title: { default: 'Yoga & Meditation Instructors', template: TITLE_TEMPLATE },
  description:
    'Instructors with a real upcoming session on Darshya — what they teach, when the next live class runs and what it costs. No stock profiles.',
};

export default function WellnessInstructorsLayout({ children }: { children: ReactNode }) {
  return children;
}
