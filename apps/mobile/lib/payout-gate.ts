import type { PayoutBalanceVM } from './api-contracts';

/**
 * Whether the signed-in provider may request a payout right now, and if not,
 * the one sentence that tells them what to do about it.
 *
 * WHY THIS IS A MODULE AND NOT THREE `&&`s IN A SCREEN
 * ---------------------------------------------------
 * Four screens render this button (astrologer, store owner, gaushala manager,
 * wellness instructor) and the server refuses the request for four distinct
 * reasons. When the gate lives inline, the copies drift, and the copy that
 * drifts is the one still offering a withdrawal the server will refuse — or
 * worse, quietly disabling the button with no reason on screen, which is the
 * same dead end as having no button.
 *
 * The order of the checks is deliberate. KYC outranks the payout method:
 * adding a bank account does nothing until KYC clears, so naming the bank first
 * sends the provider down a path that cannot succeed.
 *
 * The null-vs-zero distinction is the load-bearing one, and it is the same
 * mistake as RES-02 on the web: a failed or refused balance load must NOT read
 * as "you have ₹0 available". `availableInr` is null when the server sent
 * something non-numeric, and the whole balance is null on a 403 or a network
 * failure. Neither is a report that the provider has no money.
 */
export interface PayoutGate {
  canRequest: boolean;
  /** null exactly when canRequest is true. */
  reason: string | null;
}

export function payoutGate(
  balance: PayoutBalanceVM | null,
  requestPending: boolean,
): PayoutGate {
  if (balance === null) {
    return {
      canRequest: false,
      reason:
        'Your balance could not be loaded, so nothing is shown. This is a server or permission error, not a report that your balance is zero.',
    };
  }
  if (!balance.kycVerified) {
    return {
      canRequest: false,
      reason:
        'Payouts unlock once your KYC is verified. That is completed on darshya.online — the app has no KYC form yet.',
    };
  }
  if (!balance.kycOnFile) {
    return {
      canRequest: false,
      reason:
        'Add a bank account or UPI ID to unlock payouts. That is completed on darshya.online — the app has no payout-details form yet.',
    };
  }
  if (balance.availableInr === null) {
    return {
      canRequest: false,
      reason:
        'Your available balance could not be read from the server, so no withdrawal can be requested. Pull down to retry.',
    };
  }
  if (balance.availableInr <= 0) {
    return {
      canRequest: false,
      reason: 'Nothing is available to withdraw right now.',
    };
  }
  if (requestPending) {
    return { canRequest: false, reason: 'Requesting…' };
  }
  return { canRequest: true, reason: null };
}
