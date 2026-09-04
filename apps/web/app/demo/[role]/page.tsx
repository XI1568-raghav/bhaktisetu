import type { Metadata } from 'next';
import { RoleDemoClient } from './role-demo-client';
import { RECEIPT_NOUN_PLURAL } from '../../../lib/eighty-g';

const VALID_ROLES = [
 'devotee',
 'pandit',
 'store-owner',
 'astrologer',
 'wellness',
 'temple-manager',
 'gaushala-manager',
] as const;

export function generateStaticParams() {
 return VALID_ROLES.map((role) => ({ role }));
}

/**
 * SEO-09 (prod sweep 2026-08-12) — all seven prerendered role walkthroughs
 * shipped the root layout's title and description, so /demo/pandit and
 * /demo/astrologer were indistinguishable from the homepage and from each
 * other in a SERP, in a browser tab and in a shared link.
 *
 * Written per role rather than as one templated string: the seven pages show
 * seven different products, and a title that says "Product demo" seven times
 * is the same duplicate-title defect in a smaller font.
 *
 * noindex, follow. These are mock screens with invented names and figures
 * (see role-demo-client.tsx) — indexing them would put fabricated content in
 * the SERP under the real brand — but the links out of them are real.
 * noindex also exempts the route from needing a canonical, which is right for
 * a page that is a walkthrough of another surface rather than a destination.
 */
const ROLE_COPY: Record<string, { title: string; description: string }> = {
 devotee: {
 title: 'Devotee App Walkthrough — Six Screens',
 description:
 'Signup, the home feed, booking a puja, joining a live darshan and the devotee profile, screen by screen, as a devotee sees them.',
 },
 pandit: {
 title: 'Pandit App Walkthrough — Six Screens',
 description:
 'Pandit onboarding, the daily dashboard, accepting and rejecting bookings, the earnings ledger and requesting a payout, screen by screen.',
 },
 'store-owner': {
 title: 'Store Owner App Walkthrough — Six Screens',
 description:
 'Listing a product, the order queue, marking an order shipped with a tracking number, commission and the store payout, screen by screen.',
 },
 astrologer: {
 title: 'Astrologer App Walkthrough — Six Screens',
 description:
 'Going online, taking call, chat and video consultations, the consult log and the 80% earnings split, screen by screen.',
 },
 wellness: {
 title: 'Wellness Instructor App Walkthrough — Six Screens',
 description:
 'Scheduling a live class, publishing the room link, enrolments, free satsangs and the instructor share of each session, screen by screen.',
 },
 'temple-manager': {
 title: 'Temple Manager App Walkthrough — Six Screens',
 description:
 'Publishing offerings and their bookable slots, the temple booking queue, darshan streams and the temple revenue share, screen by screen.',
 },
 'gaushala-manager': {
 title: 'Gaushala Manager App Walkthrough — Six Screens',
 description:
 `Listing cows for adoption, seva plans, donor records, ${RECEIPT_NOUN_PLURAL} and the gaushala payout, screen by screen.`,
 },
};

export async function generateMetadata({
 params,
}: {
 params: Promise<{ role: string }>;
}): Promise<Metadata> {
 const { role } = await params;
 const copy = ROLE_COPY[role] ?? {
 title: 'Product Demo — Role Walkthrough',
 description:
 'A screen-by-screen walkthrough of the Darshya app for one role, from signup through booking, earnings and payouts.',
 };
 return {
 title: copy.title,
 description: copy.description,
 robots: { index: false, follow: true },
 };
}

export default async function RoleDemoPage({
 params,
}: {
 params: Promise<{ role: string }>;
}) {
 const { role } = await params;
 return <RoleDemoClient role={role} />;
}
