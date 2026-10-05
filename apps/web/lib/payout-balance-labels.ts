/**
 * One honest vocabulary for a provider's money, shared by every web screen that
 * used to show a single mixed "Pending" number.
 *
 * GET /payouts/balance splits it three ways:
 *   availableInr  earned, released and not yet requested        -> Ready to withdraw
 *   upcomingInr   earned from a puja/session that has not happened -> Upcoming (after the puja/session)
 *   pendingInr    already inside a payout request                -> Requested, awaiting payout
 *
 * The screens fall back to their old single label ONLY when the server did not
 * send the fields (an older API), via `hasBalanceSplit`.
 */
export interface BalanceSplit {
  availableInr?: number | null;
  upcomingInr?: number | null;
  pendingInr?: number | null;
}

export const READY_TO_WITHDRAW_LABEL = 'Ready to withdraw';
export const UPCOMING_LABEL = 'Upcoming (after the puja/session)';
export const REQUESTED_LABEL = 'Requested, awaiting payout';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** True when the server sent the split (available and requested are both numbers). */
export function hasBalanceSplit(b: BalanceSplit | null | undefined): b is BalanceSplit {
  return !!b && isNum(b.availableInr) && isNum(b.pendingInr);
}

/** The three labelled figures, in display order. Empty when the split is absent. */
export function balanceSplitCards(
  b: BalanceSplit | null | undefined,
): Array<{ label: string; amount: number }> {
  if (!hasBalanceSplit(b)) return [];
  return [
    { label: READY_TO_WITHDRAW_LABEL, amount: b.availableInr as number },
    { label: UPCOMING_LABEL, amount: isNum(b.upcomingInr) ? b.upcomingInr : 0 },
    { label: REQUESTED_LABEL, amount: b.pendingInr as number },
  ];
}
