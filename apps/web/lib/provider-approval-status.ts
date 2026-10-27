/**
 * The API reports user.status 'pending_approval' on signup only while
 * REQUIRE_PROVIDER_APPROVAL is on (default off => 'active'). Screens ask this
 * instead of assuming a review exists.
 */
export function isPendingApproval(status: string | null | undefined): boolean {
  return status === 'pending_approval';
}
