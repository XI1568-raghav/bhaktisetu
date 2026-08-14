/**
 * CM-11 / DF-05 (prod sweep 2026-08-12) — real, server-counted inventory
 * figures for the funnel's trust surfaces.
 *
 * THE RULE FOR THIS FILE (same doctrine as lib/social-proof.ts): a number only
 * reaches a page if the API counted it. There is no default, no seed, no
 * "approximately", no rounding up. When the count is unavailable the caller
 * gets `null` and must render a claim with NO DIGITS IN IT — never a
 * remembered marketing figure.
 *
 * What was shipping before:
 *   TrustStrip      "200+ verified temples" / "500+ vetted pandits"
 *   IntentTrio      "Watch live aarti from 200+ temples"
 *   WorshipStrip    "Watch live aarti from 200+ temples"
 *   /waitlist       "Live darshan from 200+ temples"
 *   /pujas          "1,500+ weddings"
 * Live Postgres darshya_utf8 on 2026-08-13: 20 temples (all is_verified),
 * 3 priests, 10 puja types, 0 completed weddings. Every one of those strings
 * was ~10x reality, and none was wired to anything that could correct it.
 *
 * The pandit headcount is deliberately NOT exposed here. Three seeded priests
 * is a true number that reads as an empty marketplace, and the honest move on
 * a trust strip is to make a claim that is not about volume at all
 * ("Aadhaar-verified pandits"). Add it back when supply is real.
 */

export interface PlatformCounts {
  /** Temples the API reports as listed. `null` when the count is unknown. */
  verifiedTemples: number | null;
  /** Distinct temples with a darshan stream. `null` when unknown or zero. */
  liveDarshanTemples: number | null;
}

export const UNKNOWN_COUNTS: PlatformCounts = {
  verifiedTemples: null,
  liveDarshanTemples: null,
};

function resolveApiBase(): string {
  const candidate =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

/** A count is usable only if it is a non-negative INTEGER. A string "200" from
 *  a drifted contract must not silently become 200 on a trust surface. */
function strictCount(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0) return null;
  return value;
}

/** Pull `pagination.total` out of GET /temples. Anything else yields null. */
export function templeTotalFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const pagination = (payload as { pagination?: unknown }).pagination;
  if (!pagination || typeof pagination !== 'object') return null;
  return strictCount((pagination as { total?: unknown }).total);
}

/**
 * Count DISTINCT temples behind GET /darshan/live. The live payload duplicates
 * temples that carry more than one stream, and "live aarti from N temples" is
 * a claim about temples, not about streams.
 *
 * Zero collapses to `null` on purpose: "live aarti from 0 temples" is a
 * sentence no page should render, so callers fall back to the digit-free copy.
 */
export function liveDarshanTempleCountFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const streams = (payload as { streams?: unknown }).streams;
  if (!Array.isArray(streams)) return null;

  const slugs = new Set<string>();
  for (const stream of streams) {
    if (!stream || typeof stream !== 'object') continue;
    const temple = (stream as { temple?: unknown }).temple;
    const slug =
      temple && typeof temple === 'object'
        ? (temple as { slug?: unknown; id?: unknown }).slug ?? (temple as { id?: unknown }).id
        : (stream as { templeSlug?: unknown; templeId?: unknown }).templeSlug ??
          (stream as { templeId?: unknown }).templeId;
    if (typeof slug === 'string' && slug.length > 0) slugs.add(slug);
  }
  return slugs.size > 0 ? slugs.size : null;
}

/** "20 verified temples" — or a digit-free claim when the count is unknown. */
export function verifiedTempleClaim(count: number | null): string {
  if (count === null) return 'Verified temples, manager-signed';
  return `${count} verified temple${count === 1 ? '' : 's'}`;
}

/** "Watch live aarti from 17 temples" — digit-free when unknown. */
export function liveDarshanClaim(count: number | null): string {
  if (count === null) return 'Watch live aarti from verified temples';
  return `Watch live aarti from ${count} temple${count === 1 ? '' : 's'}`;
}

/**
 * Fetch both counts. Never throws and never partially invents: each count is
 * resolved independently, and a failure on either side yields `null` for that
 * one only.
 */
export async function getPlatformCounts(): Promise<PlatformCounts> {
  const base = resolveApiBase();

  const read = async (path: string): Promise<unknown> => {
    try {
      const res = await fetch(`${base}${path}`, {
        next: { revalidate: 900, tags: ['temples'] },
      } as RequestInit);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const [templesPayload, darshanPayload] = await Promise.all([
    read('/temples?limit=1'),
    read('/darshan/live'),
  ]);

  return {
    verifiedTemples: templeTotalFromPayload(templesPayload),
    liveDarshanTemples: liveDarshanTempleCountFromPayload(darshanPayload),
  };
}
