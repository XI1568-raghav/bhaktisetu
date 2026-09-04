/**
 * Selectors for the yatra catalogue the API actually serves.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * `packages/api-client`'s `YatraDestination` declares
 * `{slug, title, state?, region?, description?, heroImage?, durationDays?,
 * priceFromInr?}` (hooks/wave-5.ts:99-109). `GET /api/v1/yatra/list` and
 * `GET /api/v1/yatra/:slug` have never sent `priceFromInr` or `state`. The
 * rows they send read
 *
 *   {slug, title, subtitle, description, durationDays, startingPrice, region,
 *    helicopterAvailable, heroImage, places[], highlights[], difficulty,
 *    bestTime}
 *
 * (apps/api/src/routes/yatra.ts:41-63, returned verbatim by `/list` and
 * `/:slug`). So the declared price key is fabricated, and the compiler agreed
 * with the screen that read it. The visible consequence: `yatra.tsx` rendered
 * `d.priceFromInr` and every API destination showed NO price at all, while the
 * four rows of a hardcoded `FALLBACK_DESTINATIONS` constant in the same file
 * did show one — hand-typed figures that contradicted the API on every row it
 * overlapped (`char-dham` was quoted at ₹32,000 against the server's ₹38,500).
 * The only prices a devotee could see on that screen were the invented ones.
 *
 * This is the same failure and the same fix as lib/api-contracts.ts: read the
 * key the server sends, and let an unrecognised shape yield empty rather than
 * invented data. `packages/api-client` is not edited from the mobile lane, so
 * these selectors sit over the hooks' raw payload.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function int(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
}

export interface YatraRow {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  region: string | null;
  /**
   * `startingPrice` — the server's own "from" figure, per person, in whole
   * rupees. Rendered with `formatInr`. NOTHING in the app multiplies it: the
   * tier prices that would make a real quote live server-side only
   * (apps/api/src/lib/yatra-pricing.ts, never exposed over GET), so a total
   * shown here would be a number the till does not agree with.
   */
  startingPriceInr: number | null;
  durationDays: number | null;
  helicopterAvailable: boolean;
  heroImage: string | null;
  places: string[];
  highlights: string[];
  difficulty: string | null;
  bestTime: string | null;
}

function selectYatraRow(raw: unknown): YatraRow | null {
  if (!isRecord(raw)) return null;
  const slug = str(raw.slug);
  const title = str(raw.title);
  // A row with no identity cannot be navigated to and must not be listed.
  if (!slug || !title) return null;
  return {
    slug,
    title,
    subtitle: str(raw.subtitle) ?? null,
    description: str(raw.description) ?? null,
    region: str(raw.region) ?? null,
    startingPriceInr: int(raw.startingPrice),
    durationDays: int(raw.durationDays),
    helicopterAvailable: raw.helicopterAvailable === true,
    heroImage: str(raw.heroImage) ?? null,
    places: strings(raw.places),
    highlights: strings(raw.highlights),
    difficulty: str(raw.difficulty) ?? null,
    bestTime: str(raw.bestTime) ?? null,
  };
}

/** `GET /api/v1/yatra/list` -> `{yatras[], total}`. Never invents a row. */
export function selectYatraList(payload: unknown): YatraRow[] {
  if (!isRecord(payload)) return [];
  const rows = payload.yatras;
  if (!Array.isArray(rows)) return [];
  return rows.map(selectYatraRow).filter((r): r is YatraRow => r !== null);
}

/** `GET /api/v1/yatra/:slug` -> `{yatra}`. `null` on a 404 body or any other shape. */
export function selectYatra(payload: unknown): YatraRow | null {
  if (!isRecord(payload)) return null;
  return selectYatraRow(payload.yatra);
}

/**
 * The tiers `POST /api/v1/yatra-inquiry` accepts
 * (`packageTier: z.enum(['economy','standard','premium'])`,
 * routes/yatra-inquiry.ts:39).
 *
 * NO PRICES. The per-tier rupee figures exist only in
 * apps/api/src/lib/yatra-pricing.ts (`YATRA_TIER_PRICE_INR`), which is read by
 * `POST /yatra-inquiry/create-order` and by nothing a client can GET. The
 * website's tier prices come from its own `apps/web/lib/yatra-data.ts`, a
 * web-only catalogue this app has no copy of and must not grow one: a hand-typed
 * tier price here is exactly the drift that COM-05 was raised for, on the one
 * axis where the app and the till disagreeing has a rupee cost.
 *
 * The tier is real data — the desk quotes against it — so the choice is offered.
 * The number is not shown because no number is available to show.
 */
export const YATRA_TIERS = [
  {
    tier: 'economy' as const,
    label: 'Economy',
    blurb: 'Shared rooms, road transport, group darshan.',
  },
  {
    tier: 'standard' as const,
    label: 'Standard',
    blurb: 'Twin-sharing 3-star stays, private coach, tour manager.',
  },
  {
    tier: 'premium' as const,
    label: 'Premium',
    blurb: 'Best available stays, private vehicle, VIP darshan assistance.',
  },
];

export type YatraTier = (typeof YATRA_TIERS)[number]['tier'];

export function readYatraTier(value: unknown): YatraTier | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const found = YATRA_TIERS.find((t) => t.tier === raw);
  return found ? found.tier : null;
}

/**
 * Pickup cities offered on the booking form. Mirrors the web flow's own list
 * (apps/web/app/yatra/book/page.tsx step 1). The API takes `pickupCity` as a
 * free string (`z.string().max(80).optional()`), so this is a convenience, not
 * a constraint — the value is copy, not data the server can contradict.
 */
export const PICKUP_CITIES = [
  'Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad',
  'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi',
];
