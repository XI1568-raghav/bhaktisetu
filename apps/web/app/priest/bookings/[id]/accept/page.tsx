import { redirect } from 'next/navigation';

/**
 * `/priest/bookings/:id/accept` — the login-survivable form of the dispatch
 * engine's one-tap accept link (PJ-04, second half).
 *
 * The sibling `[id]/page.tsx` already turns `?accept=1` into a hop to the
 * offers surface. That works for a pandit who is already signed in and fails
 * for the one who is not, which on a WhatsApp tap from a phone is the common
 * case: `/priest` is a PORTAL_PREFIX, and middleware.ts:221 builds the bounce
 * as `signIn.searchParams.set('redirect', pathname)` — pathname only. The query
 * string is gone before the login page is even rendered, so after signing in
 * the pandit lands on the plain booking view, which answers 403 for an offer he
 * has not accepted yet. The intent is destroyed by the one hop it is guaranteed
 * to make.
 *
 * A path segment survives that bounce untouched, so the intent lives in the
 * path instead of the query. Nothing in middleware.ts has to change.
 *
 * Destination is `/priest/offers`, not the booking detail view, for the reason
 * spelled out in ../page.tsx: `GET /priest/bookings/:id` is assigned-only, and
 * an un-accepted offer has no priestId, so the detail view can only ever answer
 * 403 here. `GET /priest/offers` is the sole endpoint that can see an offer
 * before it is accepted.
 */
export default async function PriestBookingAcceptDeepLink({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/priest/offers?booking=${encodeURIComponent(id)}`);
}
