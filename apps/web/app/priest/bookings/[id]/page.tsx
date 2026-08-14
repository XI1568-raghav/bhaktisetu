import { redirect } from 'next/navigation';

/**
 * `/priest/bookings/:id` — the destination of the dispatch engine's one-tap
 * WhatsApp/push accept link (PJ-04, 2026-08-13).
 *
 * apps/api/src/services/dispatch.service.ts:275 builds
 * `${WEB_BASE_URL}/priest/bookings/${bookingId}?accept=1` for every T1/T2/T3
 * offer. No `[id]` segment existed under app/priest/bookings, so that link 404'd
 * and the WhatsApp fallback for the whole dispatch engine was dead.
 *
 * WHY `?accept=1` GOES TO /priest/offers AND NOT TO THE DETAIL VIEW: the detail
 * view is backed by `GET /priest/bookings/:id`, which calls
 * priestService.getAssignedBookingById and answers 403 "This booking is not
 * assigned to you" whenever `booking.priestId !== me`. An offer that has not
 * been accepted yet has no priestId at all, so that is the state EVERY accept
 * link arrives in. Pointing this route at the detail view would trade a 404 for
 * a 403 and still leave the pandit unable to accept. `GET /priest/offers` is the
 * only endpoint that can see an offer before it is accepted, so the accept link
 * lands on the screen built over it, carrying the booking id so that offer can
 * be singled out — or so the pandit can be told plainly that it is gone.
 *
 * Without `accept`, the id is an ordinary deep link to a booking he already
 * owns, and the existing detail page is the right destination.
 *
 * KNOWN GAP (not fixable from this file): apps/web/middleware.ts:164 builds the
 * login bounce as `signIn.searchParams.set('redirect', pathname)` — pathname
 * only, so a logged-out tap on the WhatsApp link loses `?accept=1` and lands on
 * the plain booking view after signing in. The redirect target needs the search
 * string appended; middleware.ts is outside this change's scope.
 */
export default async function PriestBookingDeepLink({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ accept?: string }>;
}) {
  const { id } = await params;
  const { accept } = await searchParams;

  if (accept === '1') {
    redirect(`/priest/offers?booking=${encodeURIComponent(id)}`);
  }

  redirect(`/priest/bookings/view?id=${encodeURIComponent(id)}`);
}
