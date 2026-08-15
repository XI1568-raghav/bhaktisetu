import type { Metadata } from 'next';
import LiveAstrologersClient from './live/LiveAstrologersClient';

/**
 * DF-12 (2026-08-12) — the astrologer directory had no reachable entry point.
 *
 * There was no static `astrologers` segment under /astrology, so
 * `/astrology/astrologers` was matched by the sibling catch-all
 * app/astrology/[id]/page.tsx with id="astrologers" and 307-redirected to
 * /astrology/view?id=astrologers — the path segment treated as an astrologer id.
 * The sweep found the fabricated profile DF-03 through exactly that door. The
 * obvious URL for "Talk to an Astrologer" therefore led to a profile page for a
 * person named "astrologers".
 *
 * A static app-router segment always outranks a sibling dynamic one, so simply
 * existing is most of the fix: the URL can no longer reach [id].
 *
 * It RENDERS the directory (the sweep's own words: "so it renders the directory
 * rather than redirecting into the id-based view") from the SAME client
 * component /astrology/astrologers/live uses — one list, two doors, no way for
 * them to drift into showing different astrologers.
 *
 * `robots: index:false, follow:true` because this is an alias, not a second
 * directory: /astrology/astrologers/live is the URL every internal link already
 * points at and the one carrying the indexable tags. Serving the same list on
 * two indexed URLs is the duplicate-content defect DF-04 filed against the
 * temple list; `follow` keeps every astrologer link on the page crawlable.
 */

export const metadata: Metadata = {
  title: 'Astrologers on Darshya — Verified Vedic Astrologer Directory',
  description:
    'Browse every verified astrologer on Darshya. Each profile is a real, approved Vedic astrologer with live online status, per-minute rate, languages and specializations — book a consultation by chat or call.',
  robots: { index: false, follow: true },
};

export default function AstrologersDirectoryPage() {
  return <LiveAstrologersClient />;
}
