/**
 * One refund-timing statement for every user-facing surface.
 *
 * Darshya issues a refund to the payment gateway straight away; how long the
 * customer's bank then takes to show it is the bank's timing. The two figures
 * below are the only ones we publish:
 *
 *   - Indian payment methods (UPI, wallets, Indian cards, net banking):
 *     {@link REFUND_DAYS_LABEL} — the cancel quote's `refundDaysLabel`.
 *   - International cards: {@link REFUND_INTERNATIONAL_CARD_LABEL} — a bank /
 *     gateway timing, stated as such, never as a Darshya promise.
 *
 * apps/web mirrors both in lib/cancellation-policy.ts (it cannot import from
 * apps/api); `copy-truth-sweep.test.ts` in apps/web fails if they drift.
 */
export const REFUND_DAYS_LABEL = '5-7 business days';

export const REFUND_INTERNATIONAL_CARD_LABEL = 'up to 14 business days';

/** One sentence for emails and push text. */
export const REFUND_TIMING_SENTENCE =
  `It reaches your original payment method in ${REFUND_DAYS_LABEL}. ` +
  `International cards can take ${REFUND_INTERNATIONAL_CARD_LABEL}, which is set by your card issuer and not by Darshya.`;
