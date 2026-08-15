/**
 * DB-06 (prod sweep 2026-08-12) — the shipped cancellation/refund promise.
 *
 * Three surfaces used to say three different things about the same booking:
 *
 *   /pujas/[slug] trust badge   "Money-Back Guarantee — 100% refund if not satisfied"
 *   /pujas/book payment step    "100% Money-Back"
 *   /pujas/book terms checkbox  "cancellation is allowed up to 24 hours before"
 *
 * and the code did something else again. An unconditional "100% refund if not
 * satisfied", rendered directly above the Pay button, is a promise the platform
 * cannot keep: there is no dissatisfaction-based refund anywhere in the API.
 *
 * What actually ships (apps/api/src/services/cancellation.service.ts
 * DEFAULT_CANCEL_POLICY + booking.service.ts cancelBooking):
 *
 *   - a devotee-initiated cancellation is REFUSED inside 24h of the slot
 *     ("Cancellation is not allowed within 24 hours of the scheduled puja
 *     time."), unless the booking is still pending_payment;
 *   - 48h or more before the slot  -> 100% refund;
 *   - 24-48h before the slot       -> 75% refund;
 *   - the policy's 50% (4-24h) and 25% (<4h) tiers are unreachable for a
 *     devotee cancel because of that same 24h block, so no consumer surface
 *     may advertise them;
 *   - if the PANDIT cancels, the devotee is refunded in full;
 *   - refunds land in 5-7 business days.
 *
 * Copy lives here so the badge, the detail page and the wizard cannot drift
 * apart again. Keep it in step with DEFAULT_CANCEL_POLICY — the API test
 * `cancellation-policy-consumer-copy.test.ts` fails if that ladder moves.
 */

/** Hours before the slot at or beyond which a cancellation is refunded in full. */
export const FULL_REFUND_HOURS_BEFORE = 48;

/** Hours before the slot at which cancellation stops being allowed at all. */
export const CANCELLATION_CUTOFF_HOURS = 24;

/** Refund fraction between the cutoff and the full-refund window, as a percent. */
export const PARTIAL_REFUND_PERCENT = 75;

/** Business days a refund takes to reach the devotee's account. */
export const REFUND_DAYS_LABEL = '5-7 business days';

/** Short badge label. Safe next to a Pay button — it promises only what ships. */
export const CANCELLATION_BADGE_LABEL = `Free cancellation ${FULL_REFUND_HOURS_BEFORE}h+ before`;

/** One-line expansion of the badge, for the surfaces that show a description. */
export const CANCELLATION_BADGE_DESC = `${PARTIAL_REFUND_PERCENT}% refund ${CANCELLATION_CUTOFF_HOURS}-${FULL_REFUND_HOURS_BEFORE}h before`;

/** Full sentence for terms/checkbox copy. */
export const CANCELLATION_POLICY_SENTENCE =
  `Cancel ${FULL_REFUND_HOURS_BEFORE}h or more before your puja for a full refund, ` +
  `or ${CANCELLATION_CUTOFF_HOURS}-${FULL_REFUND_HOURS_BEFORE}h before for ${PARTIAL_REFUND_PERCENT}%. ` +
  `Cancellation is not possible within ${CANCELLATION_CUTOFF_HOURS} hours of the scheduled time. ` +
  `Refunds reach your account in ${REFUND_DAYS_LABEL}.`;

/**
 * LEG-19 (prod sweep 2026-08-12) — the settlement table.
 *
 * Four surfaces published four different answers to "how long does a refund
 * take":
 *
 *   /refunds section 8   a four-row table, UPI at the top of it
 *   /faqs                "within 3-7 working days ... UPI refunds are usually
 *                        instant", which contradicted that table's own top row
 *   /nri-pujas           "processed within 5-7 business days", flat
 *   /why-darshya         "3-7 day processing"
 *
 * while the engine carries exactly one figure: DEFAULT_CANCEL_POLICY
 * .refundDaysLabel in apps/api/src/services/cancellation.service.ts. apps/web
 * cannot import from apps/api, so `REFUND_DAYS_LABEL` above mirrors it and the
 * wave-3 test re-reads the API source and fails if the two drift.
 *
 * The rows below are the /refunds table unchanged — no figure here is new. The
 * point is that they now live in ONE array: /refunds renders it, and every
 * other page quotes `REFUND_SETTLEMENT_SENTENCE`, which is generated from it.
 */
export const REFUND_SETTLEMENT_BANDS: ReadonlyArray<{ method: string; label: string }> = [
  { method: 'UPI and wallets', label: '1-3 business days' },
  { method: 'Debit and credit cards', label: REFUND_DAYS_LABEL },
  { method: 'Net banking', label: '5-10 business days' },
  { method: 'International cards', label: '7-14 business days' },
];

/**
 * The bands as one plain-text sentence. Derived, never retyped — a page that
 * quotes this cannot fall out of step with the table on /refunds.
 */
export const REFUND_SETTLEMENT_SENTENCE =
  `Once a refund is issued it goes back to the method you paid with: ` +
  `${REFUND_SETTLEMENT_BANDS.map((b) => `${b.method} ${b.label}`).join(', ')}.`;
