/**
 * Temple trust score — ONE scale, defined once.
 *
 * `Temple.trustScore` is a Postgres `Float` (schema.prisma:290) and the API
 * serves it on a **0–5** scale: across all 20 seeded temples the range is
 * 4.6–5.0.
 *
 * Four independent call sites assumed 0–100, and a 2026-08-03 comment in
 * pujas/book/page.tsx even asserted it ("trustScore is 0-100") — an assumption
 * taken from that page's own MOCK fixtures, which used 98/96/95. The real data
 * never matched, so:
 *
 *   - /pujas/[slug]        rendered `trustScore / 20` → a gold star next to
 *                          "0.2" for Kashi Vishwanath. On any 5-point reading
 *                          that is a near-zero rating for one of the most
 *                          revered shrines in Hinduism, on 100% of puja detail
 *                          sessions. The reaction is not "the number is
 *                          broken", it is "this site is fake".
 *   - /pujas/[slug]/temples printed "Trust score: 4.9/100" directly under copy
 *                          reading "Higher = safer" — teaching the scale in one
 *                          sentence and violating it in the next.
 *   - /pujas/book          hid the badge entirely behind `>= 20`.
 *   - /temples             gated the Jyotirlinga badge on `>= 97`, so it could
 *                          never render.
 *
 * Import from here rather than hard-coding a divisor or a threshold. If the API
 * scale ever changes, this file is the single place it changes.
 */

export const TRUST_SCORE_MAX = 5;

/** Below this a score is too thin to be meaningful — show nothing rather than a bad number. */
export const TRUST_SCORE_MIN_DISPLAY = 3;

/** Jyotirlinga/marquee badge threshold, expressed on the real scale (was 97/100). */
export const TRUST_SCORE_MARQUEE = 4.85;

/** `4.9` → `"4.9"`. Always one decimal, so 5 renders as "5.0" and the column aligns. */
export function formatTrustScore(score: number | null | undefined): string {
  return (typeof score === 'number' && Number.isFinite(score) ? score : 0).toFixed(1);
}

/** `4.9` → `"4.9/5"`. Use this wherever the number is shown to a customer. */
export function formatTrustScoreOutOf(score: number | null | undefined): string {
  return `${formatTrustScore(score)}/${TRUST_SCORE_MAX}`;
}

/** Whether the score is worth showing at all. */
export function hasMeaningfulTrustScore(score: number | null | undefined): boolean {
  return typeof score === 'number' && Number.isFinite(score) && score >= TRUST_SCORE_MIN_DISPLAY;
}

// ───────────────────────────────────────────────────────────────────────────
// TC-07 — is there anything behind the number?
//
// CM-02 fixed the SCALE. It did not ask where the value comes from, and the
// answer is: nowhere. `Temple.trustScore` (schema.prisma:294,
// `Float @default(0)`) has no writer anywhere in the codebase. Every non-zero
// value in the database is one of twenty literals typed by hand into
// apps/api/prisma/seed.ts (4.6–5.0), assigned before the platform had taken a
// single booking. No job recomputes it, no review updates it, no verification
// step touches it.
//
// That matters because of how it is described to devotees. The temple
// comparison page (apps/web/app/pujas/[slug]/temples/page.tsx) prints
// "Trust score combines temple verification, devotee reviews, on-time delivery
// and video-proof completion. Higher = safer." — a four-factor methodology for
// a number computed from none of them, next to a ranking that orders which
// temple a devotee should send money to. That is not a display bug; it is a
// published claim about a measurement nobody takes.
//
// Until a real computation exists, the number may be used INTERNALLY (the API
// still orders by it) but must not be PUBLISHED to a devotee as a trust
// metric. Flip TRUST_SCORE_IS_COMPUTED to true in the same change that adds
// the writer, and not before.
// ───────────────────────────────────────────────────────────────────────────

/** Whether any code actually computes `Temple.trustScore`. It does not. */
export const TRUST_SCORE_IS_COMPUTED = false;

/**
 * The four inputs the comparison page advertises. Every one of them must be a
 * real input to a real computation before the methodology may be printed.
 */
export const TRUST_SCORE_CLAIMED_FACTORS = [
  'temple verification',
  'devotee reviews',
  'on-time delivery',
  'video-proof completion',
] as const;

/**
 * Whether this score may be shown to a devotee as a trust signal.
 *
 * Stricter than `hasMeaningfulTrustScore`, which only asks whether the number
 * is thick enough to render. This also asks whether the number means anything.
 */
export function canPublishTrustScore(score: number | null | undefined): boolean {
  return TRUST_SCORE_IS_COMPUTED && hasMeaningfulTrustScore(score);
}

/**
 * Whether the "combines verification, reviews, on-time delivery and video
 * proof" methodology copy may be printed. It describes work the platform does
 * not do, so it may not.
 */
export function canPublishTrustScoreMethodology(): boolean {
  return TRUST_SCORE_IS_COMPUTED;
}
