/**
 * PM-10 / F062 — what an astrologer is told they earn per minute.
 *
 * The astrologer portal's own profile screen used to publish THREE per-minute
 * prices, derived in the component:
 *
 *   Chat        round(pricePerMinute * 0.8)
 *   Voice Call  pricePerMinute
 *   Video Call  round(pricePerMinute * 1.6)
 *
 * plus a hardcoded ₹40 / ₹60 / ₹100 table shown whenever the screen could not
 * match the signed-in user to a directory row.
 *
 * None of it exists. There is no mode-based pricing anywhere in the product:
 * `POST /consultation/book` (apps/api/src/routes/consultation.ts) accepts
 * `{ astrologerId, minutes, scheduledAt? }` — there is no mode on the request —
 * and charges `Math.round(perMinuteRate * minutes)`, with `perMinuteRate` read
 * straight off `AstrologerProfile.pricePerMinute`. The multipliers and the
 * fallback table were invented in the view layer.
 *
 * The harm lands on SUPPLY, the scarce side of this marketplace. An astrologer
 * on ₹25/min was told video consults bill ₹40/min: a 30-minute video booking he
 * expected to gross ₹1,200 (₹960 to him at the uniform 80% provider share)
 * actually grossed ₹750 and paid him ₹600. Finding that gap on a first payout
 * is how a platform loses an astrologer permanently.
 *
 * The derivation lives here, as a pure function, because apps/mobile's vitest
 * runner is node-only and does not render React Native components — a rule that
 * lives inside a screen is a rule nothing can test.
 */

export interface AstrologerRateRow {
  label: string;
  value: string;
}

/** Shown instead of a number when the directory row is not loaded. */
export const RATE_UNAVAILABLE = 'Not available offline';

/**
 * What the platform bills, stated once because it is billed once.
 *
 * Returns a single row deliberately. A list of one is not an oversight: it is
 * the shape that cannot grow a second invented tier without someone editing
 * this file and reading the note above.
 */
export function astrologerRateRows(pricePerMinute: unknown): AstrologerRateRow[] {
  const rate =
    typeof pricePerMinute === 'number' && Number.isFinite(pricePerMinute) && pricePerMinute > 0
      ? pricePerMinute
      : null;
  return [
    {
      label: 'Consultation',
      value: rate === null ? RATE_UNAVAILABLE : `₹${rate} / min`,
    },
  ];
}

/**
 * The sentence printed under the rate, so the three-tier card is not reinvented
 * by the next person who assumes video must cost more.
 */
export const RATE_MODE_NOTE =
  'This is the rate charged for every consultation — chat, voice and video are billed the same per minute.';
