/**
 * astrologer-supply-label.ts — AW-02.
 *
 * THE DEFECT: the devotee astrology screen read `data.total` from
 * GET /api/v1/astrology/astrologers and printed
 * "Astrology Services • {n} astrologers online".
 *
 * `total` is EVERY approved AstrologerProfile, not the online-filtered set. The
 * three real astrologers all read `isOnline: false`, so the screen said
 * "3 astrologers online" while zero were — the app stating supply that is not
 * there, which is the whole of AW-02 in one string.
 *
 * The honest label depends on what we can actually know:
 *   - if the rows carry `isOnline`, count the ones that are, and say "online"
 *     only when that count is > 0;
 *   - otherwise fall back to the count of VERIFIED astrologers, which is what
 *     `total` truthfully is.
 *
 * Pure and in `lib/` on purpose: apps/mobile's runner is node-environment and
 * does not render React Native, so screen copy is only testable when its
 * derivation lives in a module like this one.
 */

export interface SupplyRow {
  isOnline?: boolean;
}

export interface AstrologerSupply {
  /** Rows the directory returned for this page, if any. */
  astrologers?: SupplyRow[] | null;
  /** Server-side count of ALL approved astrologers — never the online count. */
  total?: number | null;
}

/**
 * How many of the returned astrologers are actually online. Returns null when
 * the payload carries no rows at all, which is "unknown", not "zero".
 */
export function onlineAstrologerCount(supply: AstrologerSupply | null | undefined): number | null {
  const rows = supply?.astrologers;
  if (!Array.isArray(rows)) return null;
  return rows.filter((r) => r?.isOnline === true).length;
}

/** Total VERIFIED (approved) astrologers, however the payload expresses it. */
export function verifiedAstrologerCount(supply: AstrologerSupply | null | undefined): number {
  const total = supply?.total;
  if (typeof total === 'number' && Number.isFinite(total) && total >= 0) return total;
  const rows = supply?.astrologers;
  return Array.isArray(rows) ? rows.length : 0;
}

/**
 * The section heading suffix. Empty string when there is no supply to describe,
 * so the caller renders a bare "Astrology Services" rather than a zero.
 *
 * Never claims "online" from a number that does not measure being online.
 */
export function astrologerSupplyLabel(supply: AstrologerSupply | null | undefined): string {
  const online = onlineAstrologerCount(supply);
  if (online !== null && online > 0) {
    return ` • ${online} ${online === 1 ? 'astrologer' : 'astrologers'} online`;
  }
  const verified = verifiedAstrologerCount(supply);
  if (verified > 0) {
    return ` • ${verified} verified ${verified === 1 ? 'astrologer' : 'astrologers'}`;
  }
  return '';
}
