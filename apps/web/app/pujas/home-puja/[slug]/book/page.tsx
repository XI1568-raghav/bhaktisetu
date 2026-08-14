// app/pujas/home-puja/[slug]/book/page.tsx
// Path-style at-home booking URL → the home-puja wizard.
//
// PF-01 (2026-08-12, P0). Every /pujas/home-puja/[slug] detail page exposes
// exactly four booking CTAs — "Book Now", "Choose basic", "Choose standard",
// "Choose premium" — and all four point at /pujas/home-puja/{slug}/book. That
// route did not exist, so all 32 CTAs across the 8 ceremonies returned a hard
// 404 with no recovery path and no alternate route to the wizard from anywhere
// in the UI.
//
// This is the segment advertised as the FIRST hero card on /pujas ("Book a
// Pandit at Your Home … Starting ₹1,100", "500+ pujas completed", "Aadhaar
// verified"), and it covers Griha Pravesh and Satyanarayan Katha — both launch
// SKUs. The whole at-home funnel was unbookable.
//
// The wizard itself already exists at app/pujas/home-puja/book/page.tsx and
// reads `slug` from SEARCH PARAMS, so this is a redirect shim only — exactly
// the same pattern as app/pujas/[slug]/book/page.tsx, whose own header comment
// records the identical bug ("Without this route those CTAs 404'd") on the
// temple funnel.
//
// `tier` is forwarded so the three "Choose <tier>" CTAs land on the right
// package instead of dropping the user's choice.

import { redirect } from 'next/navigation';

export const revalidate = 3600;

interface HomePujaBookPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tier?: string }>;
}

export default async function HomePujaSlugBookPage({
  params,
  searchParams,
}: HomePujaBookPageProps) {
  const { slug } = await params;
  const { tier } = await searchParams;
  const target = tier
    ? `/pujas/home-puja/book?slug=${encodeURIComponent(slug)}&tier=${encodeURIComponent(tier)}`
    : `/pujas/home-puja/book?slug=${encodeURIComponent(slug)}`;
  redirect(target);
}
