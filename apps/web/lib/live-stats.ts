/**
 * Live public counts for pages that publish a headline statistic.
 *
 * LEG-13 (prod sweep 2026-08-12) — /about published a four-stat trust strip
 * reading "200+ Temples partnered" and "100% Bookings with video proof". The
 * catalogue held 20 temples (GET /api/v1/temples -> total 20), i.e. the number
 * overstated by 10x on the page whose entire argument is "we tell you the
 * truth about whether the puja happened". The 100% was worse: four bookings
 * sit in status `completed` with videoProofUrl NULL, and the proof gate
 * (apps/api/src/routes/bookings.ts:276, VIDEO_PROOF_REQUIRED_STATUSES) only
 * covers `video_uploaded` and `delivered` — nothing requires proof to reach
 * `completed`, and no payout path reads videoProofUrl at all.
 *
 * The rule this module exists to enforce: a published count is either the
 * number the API just returned, or it is not published. `null` means "we could
 * not read it", and the caller must omit the stat — never fall back to a
 * remembered figure, a rounded one, or a "200+" that ages into a lie.
 */

/** Counts a marketing surface is allowed to publish. `null` = do not publish. */
export interface PublicStats {
  /** Temples in the live catalogue. */
  templeCount: number | null;
  /** Distinct puja types that can actually be booked. */
  pujaTypeCount: number | null;
}

function totalFromEnvelope(payload: unknown, listKey: string): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;

  // The list endpoints answer { <listKey>: [...], total, page, limit, totalPages }.
  const total = body.total;
  if (typeof total === 'number' && Number.isFinite(total) && total >= 0) {
    return Math.trunc(total);
  }

  // No usable `total`. Counting the page we happen to hold would publish the
  // page size (20) as though it were the catalogue, so refuse instead.
  if (Array.isArray(body[listKey])) return null;
  return null;
}

export function templeCountFromPayload(payload: unknown): number | null {
  return totalFromEnvelope(payload, 'temples');
}

export function pujaTypeCountFromPayload(payload: unknown): number | null {
  return totalFromEnvelope(payload, 'pujaTypes');
}

function resolveApiBase(): string {
  const candidate =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.darshya.online';
  return candidate.endsWith('/api/v1')
    ? candidate
    : `${candidate.replace(/\/$/, '')}/api/v1`;
}

async function fetchCount(
  path: string,
  parse: (payload: unknown) => number | null,
  tag: string,
): Promise<number | null> {
  try {
    const res = await fetch(`${resolveApiBase()}${path}`, {
      next: { revalidate: 900, tags: [tag] },
    } as RequestInit);
    if (!res.ok) return null;
    return parse(await res.json());
  } catch {
    return null;
  }
}

/**
 * Never throws. Any field that could not be read comes back `null` so the
 * caller renders one fewer stat rather than an invented one.
 */
export async function fetchPublicStats(): Promise<PublicStats> {
  const [templeCount, pujaTypeCount] = await Promise.all([
    fetchCount('/temples?limit=1', templeCountFromPayload, 'temples'),
    fetchCount('/pujas/types?limit=1', pujaTypeCountFromPayload, 'pujas'),
  ]);
  return { templeCount, pujaTypeCount };
}
