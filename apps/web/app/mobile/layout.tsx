import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TITLE_TEMPLATE } from '../../lib/seo/title-template';
import MobileTabBar from './MobileTabBar';

/**
 * SEO-09 (prod sweep 2026-08-12) — /mobile was the last indexable page still
 * emitting the root layout's title and description verbatim, i.e. one more SERP
 * entry reading "Darshya — India's Devotional Super App". It is not in
 * app/sitemap.ts and carries no robots noindex, so it is a weakly-indexable
 * orphan rather than a page nobody can reach.
 *
 * page.tsx here is `'use client'` and so was this layout (it reads
 * usePathname() for the active bottom tab), so there was no server file on the
 * route's path able to hold a metadata export at all. The client half now lives
 * in ./MobileTabBar and this file is a plain server shell.
 *
 * TEMPLATE, NOT A BARE STRING — routes live below this segment (/mobile/temples,
 * /mobile/darshan, …). A plain `title: '…'` resolves to
 * `{ absolute, template: null }`, which every child would inherit, shipping with
 * no " | Darshya" at all. `default` keeps this page's own title while `template`
 * keeps the brand flowing downwards. Guarded by
 * __tests__/seo/layout-title-template-inheritance.test.ts.
 *
 * No canonical here: children declare their own, and a canonical on the layout
 * would be inherited by any future child that forgets one (SEO-01 in miniature).
 */
export const metadata: Metadata = {
  title: { default: 'Darshya Mobile App Preview', template: TITLE_TEMPLATE },
  description:
    'A walkthrough of the Darshya mobile experience — live temple darshan, puja booking, aartis and chalisas, and your bookings, laid out screen by screen.',
};

export default function MobileLayout({ children }: { children: ReactNode }) {
  return <MobileTabBar>{children}</MobileTabBar>;
}
