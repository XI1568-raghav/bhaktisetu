import { describe, it, expect } from 'vitest';
import {
  TRUST_SCORE_MAX,
  TRUST_SCORE_MARQUEE,
  formatTrustScore,
  formatTrustScoreOutOf,
  hasMeaningfulTrustScore,
} from '../lib/trust-score';

/**
 * CM-01 / CM-02 (2026-08-12, P0).
 *
 * `Temple.trustScore` is 0–5 in Postgres — the 20 seeded temples span 4.6–5.0.
 * Four call sites assumed 0–100, and a 2026-08-03 comment asserted it, taken
 * from the booking page's own MOCK fixtures (98/96/95). Real data never matched:
 *
 *   /pujas/[slug]          `score / 20` → a gold star beside "0.2" for Kashi
 *                          Vishwanath, on 100% of puja detail sessions
 *   /pujas/[slug]/temples  "Trust score: 4.9/100" directly under "Higher = safer"
 *   /pujas/book            `>= 20` hid the badge on every real temple
 *   /temples               `>= 97` meant the Jyotirlinga badge could never fire
 *
 * The lesson is the reason these tests exist: the earlier pass validated against
 * fixtures instead of the database, so the fixtures taught it the wrong scale.
 * These assertions are pinned to the REAL observed range.
 */

// Observed in Postgres: select min(trust_score), max(trust_score) from temples
const REAL_MIN = 4.6;
const REAL_MAX = 5.0;
const KASHI_VISHWANATH = 4.9;

describe('trust score — one scale, matching the database', () => {
  it('is a 0-5 scale', () => {
    expect(TRUST_SCORE_MAX).toBe(5);
  });

  it('renders Kashi Vishwanath as 4.9/5, not 0.2', () => {
    expect(formatTrustScoreOutOf(KASHI_VISHWANATH)).toBe('4.9/5');
    // The exact string the old `/20` produced, which read as a near-zero rating.
    expect(formatTrustScore(KASHI_VISHWANATH / 20)).toBe('0.2');
    expect(formatTrustScoreOutOf(KASHI_VISHWANATH)).not.toContain('/100');
  });

  it('every real temple score renders as a credible number', () => {
    for (const score of [REAL_MIN, 4.7, 4.8, KASHI_VISHWANATH, REAL_MAX]) {
      const shown = Number(formatTrustScore(score));
      // A trust signal must never render below 1 on a 5-point scale — that is
      // the failure that made the site look fake.
      expect(shown).toBeGreaterThan(1);
      expect(shown).toBeLessThanOrEqual(TRUST_SCORE_MAX);
    }
  });

  it('shows the badge for every real temple — the old >= 20 guard hid them all', () => {
    for (const score of [REAL_MIN, KASHI_VISHWANATH, REAL_MAX]) {
      expect(hasMeaningfulTrustScore(score)).toBe(true);
      expect(score >= 20).toBe(false); // the guard that used to gate it
    }
  });

  it('the marquee threshold is reachable on the real scale — >= 97 never was', () => {
    expect(TRUST_SCORE_MARQUEE).toBeLessThanOrEqual(TRUST_SCORE_MAX);
    expect(KASHI_VISHWANATH).toBeGreaterThan(TRUST_SCORE_MARQUEE);
    expect(REAL_MAX >= 97).toBe(false); // the old Jyotirlinga guard
  });

  it('still hides a thin or missing score rather than printing a bad one', () => {
    expect(hasMeaningfulTrustScore(0)).toBe(false);
    expect(hasMeaningfulTrustScore(1.2)).toBe(false);
    expect(hasMeaningfulTrustScore(null)).toBe(false);
    expect(hasMeaningfulTrustScore(undefined)).toBe(false);
    expect(hasMeaningfulTrustScore(NaN)).toBe(false);
  });

  it('always renders one decimal so a column of scores aligns', () => {
    expect(formatTrustScore(5)).toBe('5.0');
    expect(formatTrustScore(4.84)).toBe('4.8');
    expect(formatTrustScore(4.86)).toBe('4.9');
    // Not a typo: 4.85 is stored as 4.8499999... in binary, so toFixed(1)
    // rounds DOWN. Pinned deliberately — a future "fix" that makes this 4.9
    // would mean someone swapped in custom rounding, which is a change worth
    // noticing rather than a bug worth chasing.
    expect(formatTrustScore(4.85)).toBe('4.8');
  });
});
