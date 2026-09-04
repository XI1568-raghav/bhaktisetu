/**
 * The temple detail contract — what `GET /api/v1/temples/:slug` and
 * `GET /api/v1/temples/:slug/pujas` actually return, and the one business rule
 * that decides whether anything on those screens may be presented as bookable.
 *
 * WHY A NEW MODULE RATHER THAN api-contracts.ts
 * ---------------------------------------------
 * lib/api-contracts.ts already carries `TempleVM` — the LIST row — and
 * `TempleOfferingVM`, which is the TEMPLE PORTAL's view of an offering (the
 * manager's own catalogue, read from /temple-portal/pujas). Neither describes
 * the public detail body, and reusing either name for a third meaning is how
 * a screen ends up reading a manager-scoped field off a public response. The
 * public detail shape lives here, under its own names.
 *
 * WHAT THE ENDPOINT REALLY SENDS
 * ------------------------------
 * `GET /temples/:slug` -> `{ temple: {...} }` (routes/temples.ts) where the
 * temple is the PUBLIC WHITELIST built by temple.service.ts findBySlug — a
 * top-level `select`, not the full row. So there is no `phone`, no `email`, no
 * `streamUrl`, no `trustScore` and no `verificationDate` to render, by design
 * (P0 #PUB-02/PUB-08). Anything this file does not name is not on the wire.
 *
 *   id, name, nameLocal, slug, description, deityPrimary, deities[],
 *   tradition, addressLine, city, state, pincode, country, lat, lng,
 *   websiteUrl, images[], timingInfo, isVerified, liveDarshanEnabled,
 *   createdAt, priests[{ isPrimary, priest{…} }], pujaOfferings[…],
 *   darshanStream[…]  (only rows whose status is not `offline`, take 1)
 *
 * `GET /temples/:slug/pujas` -> `{ temple: {id,name,slug}, pujas: [...] }`
 * where each puja row is the PujaType columns SPREAD over the offering's own
 * `offeringId` / `availableSlots` / `maxBookingsPerSlot` / `priceOverride`
 * (temple.service.ts getTemplePujas). `id` on that row is therefore the PUJA
 * TYPE id and `slug` the puja slug — NOT the offering. Reading `id` as an
 * offering id is the exact mistake puja.service.ts:122-128 was written about.
 *
 * Pure and dependency-free: apps/mobile/vitest.config.ts runs this package in
 * plain node with no react-native transform.
 */

// ─── shared primitives (kept local; this module imports nothing) ────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];
}

/** Decimal columns arrive as STRINGS ("1501.00"); numeric ones as numbers. */
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ─── published timings ──────────────────────────────────────────────────────
/**
 * `Temple.timingInfo` is Json. The ONE shape the API itself parses is
 * `{ regularHours: { <slotKey>: "HH:MM-HH:MM[, HH:MM-HH:MM]" } }` — see
 * apps/api/src/lib/darshan-schedule.ts `parseSchedule`, which drives whether a
 * darshan stream is considered live at all.
 *
 * This reads exactly that and nothing else. A temple whose `timingInfo` is
 * null, empty, or in some other shape yields `[]` and the screen renders no
 * timings section — it does NOT fall back to "6:00 AM - 9:00 PM" or "Open
 * 24x7", both of which appeared in earlier mobile mocks and are claims about a
 * real place of worship that no endpoint makes.
 *
 * The key is humanised with the SAME transformation the API uses (`keyToLabel`:
 * split camelCase, capitalise the first letter) so a devotee comparing the app
 * to the darshan badge sees one vocabulary, not two.
 */
export interface TempleTiming {
  /** `mangalaAarti` -> `Mangala Aarti`. */
  label: string;
  /** The window exactly as published, e.g. `04:00-05:30`. Never reformatted. */
  window: string;
}

const TIME_RANGE_RE = /^\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*$/;

export function selectTempleTimings(timingInfo: unknown): TempleTiming[] {
  if (!isRecord(timingInfo)) return [];
  const hours = timingInfo.regularHours;
  if (!isRecord(hours)) return [];
  const out: TempleTiming[] = [];
  for (const [key, raw] of Object.entries(hours)) {
    if (typeof raw !== 'string') continue;
    const windows = raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => TIME_RANGE_RE.test(part));
    if (windows.length === 0) continue;
    out.push({
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase())
        .trim(),
      window: windows.join(', '),
    });
  }
  return out;
}

// ─── the priests a temple publishes ─────────────────────────────────────────
/**
 * `priests` is the JOIN row (`TemplePriest`), so the person is at `.priest`.
 * `isVerified` on a Priest is deliberately NOT surfaced: TC-08 established
 * that nothing in the codebase writes `Priest.isVerified` outside
 * prisma/seed.ts, so rendering it as a credential publishes a check that never
 * ran. Name, languages and experience are self-declared profile facts and are
 * shown as such.
 */
export interface TemplePriestVM {
  id: string;
  name: string;
  specializations: string[];
  languages: string[];
  experienceYears: number | null;
  isPrimary: boolean;
}

function selectPriests(payload: unknown): TemplePriestVM[] {
  return (Array.isArray(payload) ? payload : [])
    .filter(isRecord)
    .map((row): TemplePriestVM | null => {
      const p = isRecord(row.priest) ? row.priest : row;
      const id = str(p.id);
      const name = str(p.displayName) ?? str(p.name);
      if (!id || !name) return null;
      return {
        id,
        name,
        specializations: strList(p.specializations),
        languages: strList(p.languages),
        experienceYears: num(p.experienceYears),
        isPrimary: row.isPrimary === true,
      };
    })
    .filter((p): p is TemplePriestVM => p !== null);
}

// ─── a puja offered AT this temple ──────────────────────────────────────────
/**
 * Two endpoints produce this row and they nest it differently:
 *
 *   /temples/:slug        `pujaOfferings[i]` = { id, priceOverride, …,
 *                                                pujaType: { name, slug, … } }
 *   /temples/:slug/pujas  `pujas[i]`         = { offeringId, priceOverride, …,
 *                                                …pujaType columns SPREAD }
 *
 * so the puja-type fields are one level down in the first and inline in the
 * second, while `id` means the OFFERING in the first and the PUJA TYPE in the
 * second. Both are normalised here, once, rather than in two screens.
 */
export interface TemplePujaVM {
  /** TemplePujaOffering.id — the id a booking is placed against. */
  offeringId: string;
  /** PujaType.slug — what (devotee)/puja-detail and /puja-book resolve. */
  pujaSlug: string;
  name: string;
  nameLocal: string | null;
  category: string | null;
  deity: string | null;
  description: string | null;
  durationMinutes: number | null;
  /** The offering's override where it has one, else the puja's base price. */
  priceInr: number | null;
  /** true when the price shown came from this temple's own override. */
  priceIsTempleOverride: boolean;
  /** Published slot times for this offering. Empty is empty, never invented. */
  slots: string[];
}

function selectOffering(raw: unknown): TemplePujaVM | null {
  if (!isRecord(raw)) return null;
  const nested = isRecord(raw.pujaType) ? raw.pujaType : null;
  // Detail: `id` is the offering, puja fields are nested.
  // Pujas list: `offeringId` is the offering, puja fields are inline (`id` is
  // then the PujaType id and must not be mistaken for one).
  const offeringId = str(raw.offeringId) ?? (nested ? str(raw.id) : null);
  const src = nested ?? raw;
  const pujaSlug = str(src.slug);
  const name = str(src.name);
  if (!offeringId || !pujaSlug || !name) return null;
  // The detail endpoint already filters `isActive: true`; the pujas endpoint
  // does too. An inactive row reaching a screen would 400 at submit with
  // "This puja is not currently offered", so it is dropped here as well —
  // cheap, and independent of which endpoint fed us.
  if (raw.isActive === false) return null;

  const override = num(raw.priceOverride);
  const base = num(src.basePrice);
  return {
    offeringId,
    pujaSlug,
    name,
    nameLocal: str(src.nameLocal),
    category: str(src.category),
    deity: str(src.deity),
    description: str(src.description),
    durationMinutes: num(src.durationMinutes),
    priceInr: override ?? base,
    priceIsTempleOverride: override !== null,
    slots: (Array.isArray(raw.availableSlots) ? raw.availableSlots : [])
      .map((s) => (isRecord(s) ? (str(s.label) ?? str(s.time)) : str(s)))
      .filter((s): s is string => s !== null),
  };
}

// ─── the temple ─────────────────────────────────────────────────────────────

export interface TempleDetailVM {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  description: string | null;
  deity: string | null;
  deities: string[];
  tradition: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  /** `city, state` — the same one-line form the list card renders. */
  location: string;
  websiteUrl: string | null;
  images: string[];
  timings: TempleTiming[];
  /**
   * `Temple.isVerified`, verbatim. NOT a badge on its own — read
   * {@link templeBookability} before letting any control imply a booking.
   */
  isVerified: boolean;
  liveDarshanEnabled: boolean;
  /**
   * The id to hand `(devotee)/darshan-player`. The public detail exposes the
   * stream row's own id; `GET /darshan/:id/stream` also resolves a temple
   * SLUG, so the slug is the fallback and never a fabrication.
   */
  darshanStreamId: string | null;
  priests: TemplePriestVM[];
  offerings: TemplePujaVM[];
}

export function selectTempleDetail(payload: unknown): TempleDetailVM | null {
  if (!isRecord(payload)) return null;
  // `{ temple: {...} }` is the wire shape; a bare body is accepted too so the
  // selector survives a caller that already unwrapped. A 404 body is
  // `{ error }` and has no slug, so it falls through to null.
  const t = isRecord(payload.temple) ? payload.temple : payload;
  const id = str(t.id);
  const slug = str(t.slug);
  const name = str(t.name);
  if (!id || !slug || !name) return null;

  const city = str(t.city);
  const state = str(t.state);
  const streamRow = (Array.isArray(t.darshanStream) ? t.darshanStream : []).find(isRecord);

  return {
    id,
    slug,
    name,
    nameLocal: str(t.nameLocal),
    description: str(t.description),
    deity: str(t.deityPrimary),
    deities: strList(t.deities),
    tradition: str(t.tradition),
    addressLine: str(t.addressLine),
    city,
    state,
    pincode: str(t.pincode),
    location: [city, state].filter(Boolean).join(', '),
    websiteUrl: str(t.websiteUrl),
    images: strList(t.images),
    timings: selectTempleTimings(t.timingInfo),
    isVerified: t.isVerified === true,
    liveDarshanEnabled: t.liveDarshanEnabled === true,
    darshanStreamId: streamRow ? (str(streamRow.id) ?? slug) : null,
    priests: selectPriests(t.priests),
    offerings: (Array.isArray(t.pujaOfferings) ? t.pujaOfferings : [])
      .map(selectOffering)
      .filter((o): o is TemplePujaVM => o !== null),
  };
}

/** `GET /temples/:slug/pujas` -> `{ temple, pujas[] }`. */
export interface TemplePujaListVM {
  templeName: string | null;
  templeSlug: string | null;
  pujas: TemplePujaVM[];
}

export function selectTemplePujaList(payload: unknown): TemplePujaListVM | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.pujas)) return null;
  const temple = isRecord(payload.temple) ? payload.temple : null;
  return {
    templeName: temple ? str(temple.name) : null,
    templeSlug: temple ? str(temple.slug) : null,
    pujas: payload.pujas.map(selectOffering).filter((p): p is TemplePujaVM => p !== null),
  };
}

// ─── THE VERIFICATION GATE ──────────────────────────────────────────────────
/**
 * Whether a puja at this temple may be presented as bookable — and if not, the
 * sentence the devotee is owed.
 *
 * THIS IS NOT COSMETIC. `booking.service.ts` refuses outright:
 *
 *     if (!offering.temple?.isVerified) {
 *       throw new Error('This temple has not been verified yet.');
 *     }
 *
 * which routes/bookings.ts classifies as 409 TEMPLE_NOT_VERIFIED. So on an
 * unverified temple EVERY offering is unbookable — not the subset a per-row
 * check would catch, all of them, because the gate is on the temple. That is
 * why the decision is taken once here from the temple, rather than reusing
 * lib/booking-flow.ts `partitionOfferings`: that function partitions offerings
 * of ONE PUJA ACROSS MANY TEMPLES (its input rows each carry their own
 * `isVerified`), which is the mirror-image screen. Same rule, different axis;
 * running the wrong one would silently mark every row bookable.
 *
 * The offerings are still LISTED when the gate is shut — a temple visible on
 * darshya.online must not vanish from the app with no reason given — but no
 * control on the screen may lead to a booking form, and the reason is printed.
 *
 * `verified` is only ever rendered from `Temple.isVerified` as returned. There
 * is no client-side inference: an absent field is `false`, which shows the
 * cautious state, never the badge.
 */
export interface TempleBookability {
  /** May a control on this screen start a booking? */
  canBook: boolean;
  /** May a "Verified temple" badge be drawn? Same fact, said positively. */
  showVerifiedBadge: boolean;
  /** Why not. Empty string when `canBook`. Rendered verbatim. */
  reason: string;
}

/** Copy is a constant so the screen cannot paraphrase the refusal. */
export const TEMPLE_UNVERIFIED_NOTICE =
  'Darshya has not completed verification for this temple yet, so puja bookings ' +
  'here cannot be accepted — the server refuses them. The pujas below are listed ' +
  'so you can see what this temple offers.';

export function templeBookability(temple: TempleDetailVM | null): TempleBookability {
  if (!temple || !temple.isVerified) {
    return { canBook: false, showVerifiedBadge: false, reason: TEMPLE_UNVERIFIED_NOTICE };
  }
  return { canBook: true, showVerifiedBadge: true, reason: '' };
}

// ─── reviews ────────────────────────────────────────────────────────────────
/**
 * `GET /temples/:slug/reviews` -> `{ templeSlug, reviews[], total,
 * averageRating, page, limit, totalPages }`. Each review is a PujaBooking row
 * with a non-null rating; the reviewer is `user.fullName` and the ritual is
 * `pujaType.name`.
 *
 * `averageRating` is `_avg.rating ?? 0` server-side, so a temple with NO
 * reviews reports 0 — which is not a rating and must never be drawn as a
 * zero-star score. `average` is therefore null unless `total > 0`.
 */
export interface TempleReviewVM {
  id: string;
  rating: number;
  text: string | null;
  authorName: string | null;
  pujaName: string | null;
  createdAt: string | null;
}

export interface TempleReviewsVM {
  reviews: TempleReviewVM[];
  total: number;
  /** null when there is nothing to average. */
  average: number | null;
}

export function selectTempleReviews(payload: unknown): TempleReviewsVM {
  const empty: TempleReviewsVM = { reviews: [], total: 0, average: null };
  if (!isRecord(payload) || !Array.isArray(payload.reviews)) return empty;

  const reviews = payload.reviews
    .filter(isRecord)
    .map((r): TempleReviewVM | null => {
      const id = str(r.id);
      const rating = num(r.rating);
      if (!id || rating === null) return null;
      const user = isRecord(r.user) ? r.user : null;
      const pujaType = isRecord(r.pujaType) ? r.pujaType : null;
      return {
        id,
        rating,
        text: str(r.reviewText),
        authorName: user ? str(user.fullName) : null,
        pujaName: pujaType ? str(pujaType.name) : null,
        createdAt: str(r.createdAt),
      };
    })
    .filter((r): r is TempleReviewVM => r !== null);

  const total = num(payload.total) ?? reviews.length;
  const average = num(payload.averageRating);
  return {
    reviews,
    total,
    average: total > 0 && average !== null && average > 0 ? average : null,
  };
}
