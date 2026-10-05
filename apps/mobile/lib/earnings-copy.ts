/**
 * Copy for earnings that are earned but not yet releasable.
 *
 * The API holds a provider's earning until the session is held, the puja is
 * performed AND proved (video), or the consultation is completed, and reports
 * it as `upcomingInr` apart from what can be acted on. Screens show it on its
 * own card rather than inside one mixed "Pending" figure.
 */
export const UPCOMING_LABEL = 'Upcoming (after the puja/session)';

export const UPCOMING_HINT =
  'Earned. Becomes payable once the session is held or the puja is performed and proved.';

/** Show the Upcoming card only when the server sent a positive figure. */
export function upcomingShown(upcomingInr: number | null | undefined): boolean {
  return typeof upcomingInr === 'number' && upcomingInr > 0;
}

/** Labels for the two halves of a provider's not-yet-paid money. */
export const READY_LABEL = 'Ready to withdraw';
export const REQUESTED_LABEL = 'Requested, awaiting payout';

/** Show the Requested card only when the server sent a positive figure. */
export function requestedShown(requestedInr: number | null | undefined): boolean {
  return typeof requestedInr === 'number' && requestedInr > 0;
}
