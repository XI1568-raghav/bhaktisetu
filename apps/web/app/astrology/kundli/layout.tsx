import type { Metadata } from 'next';

/**
 * TD-05 (prod sweep 2026-08-12): /astrology/kundli — the page /kundli
 * redirects to — served the site-wide default title. "free kundli" is one of
 * the highest-volume devotional searches in India and this is the free tool
 * built to capture it, so a title with no keyword in it made the cheapest
 * top-of-funnel surface Darshya has invisible, and every bookmark or shared
 * link unidentifiable.
 *
 * page.tsx is a client component and cannot export metadata, so the segment
 * layout carries it — the same arrangement as app/auth/login/layout.tsx. The
 * brand is deliberately absent from `title`: the root layout's template
 * appends it, and repeating it here is exactly the doubling SEO-03 removed
 * from 171 route files.
 */
export const metadata: Metadata = {
  title: 'Free Kundli — Janam Kundli & Birth Chart Online',
  description:
    'Generate your free Janam Kundli online — birth chart, lagna, rashi, nakshatra, planetary positions and dasha periods. Instant, no sign-up, in English and Hindi.',
  alternates: { canonical: 'https://darshya.online/astrology/kundli' },
  openGraph: {
    title: 'Free Kundli — Janam Kundli & Birth Chart Online | Darshya',
    description:
      'Generate your free Janam Kundli online — birth chart, lagna, rashi, nakshatra and dasha periods. Instant and no sign-up.',
    url: 'https://darshya.online/astrology/kundli',
    type: 'website',
    images: ['/og/default.png'],
  },
};

export default function KundliLayout({ children }: { children: React.ReactNode }) {
  return children;
}
