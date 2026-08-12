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
