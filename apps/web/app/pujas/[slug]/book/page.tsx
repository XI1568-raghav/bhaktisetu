// app/pujas/[slug]/book/page.tsx
// Path-style booking URL → generic booking flow.
//
// The actual booking UI is the generic client component at
// app/pujas/book/page.tsx, which reads `slug` (and optional `temple`)
// from SEARCH PARAMS. The parent puja page CTAs link to the path-style
// URL `/pujas/{slug}/book` (bookmarkable, SEO-friendly), so this route
// resolves that URL by redirecting to the generic page with the slug
// forwarded as a query param. Without this route those CTAs 404'd.
//
// Preserves an incoming `?temple=` query so per-temple "Book Now" CTAs
// (which link to `/pujas/{slug}/book?temple={templeSlug}`) preselect the
// temple on the booking form.

import { redirect } from 'next/navigation';

export const revalidate = 3600;

interface BookPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ temple?: string }>;
}

export default async function PujaSlugBookPage({ params, searchParams }: BookPageProps) {
  const { slug } = await params;
  const { temple } = await searchParams;
  const target = temple
    ? `/pujas/book?slug=${encodeURIComponent(slug)}&temple=${encodeURIComponent(temple)}`
    : `/pujas/book?slug=${encodeURIComponent(slug)}`;
  redirect(target);
}
