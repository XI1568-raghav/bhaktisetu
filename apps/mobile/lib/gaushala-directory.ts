/**
 * The devotee-facing gaushala contract — and the decision of WHICH list a
 * gaushala directory is allowed to be built from.
 *
 * THERE ARE TWO GAUSHALA LISTS AND ONLY ONE OF THEM IS REAL
 * ---------------------------------------------------------
 *   GET /api/v1/gaushala            -> gaushalaService.getGaushalas()
 *   GET /api/v1/providers/gaushala  -> prisma.gaushalaProfile, where approved
 *
 * The first is a fixture array. Its own header in
 * apps/api/src/services/gaushala.service.ts reads "SAMPLE listings. Nothing
 * here has been verified", and TC-11 set `isVerified: false` on every row
 * precisely because the organisations named are real while the contact details
 * and credentials beside them were typed by a developer.
 *
 * apps/web already acted on this: TC-11 DELETED the three hand-written
 * gaushala cards from app/gaushala/page.tsx and replaced them with
 * `<ApprovedProvidersStrip type="gaushala">`, i.e. GET /providers/gaushala,
 * under the heading "Approved gaushalas on Darshya". This module mirrors that
 * decision rather than re-deriving it, so the app and the site cannot list a
 * different set of shelters.
 *
 * WHY IT ALSO MATTERS FOR MONEY
 * -----------------------------
 * `POST /donations/create-order` resolves the donee through
 * apps/api/src/lib/gaushala-donee.ts, which refuses anything that does not
 * match an APPROVED GaushalaProfile — by profile id, by owner user id, or by a
 * fixture's NAME matching an approved profile. A directory built from the
 * fixture list therefore offers shelters whose donation 400s with
 * `gaushala_not_onboarded` AFTER the devotee has chosen an amount. A directory
 * built from /providers/gaushala cannot: that query is
 * `where: { approved: true }`, and a profile id is one of the three spellings
 * the resolver accepts.
 *
 * NOTHING IS EVER BADGED "VERIFIED"
 * ---------------------------------
 * `GaushalaProfile.verified` survives on the model and IS present on the
 * provider listing payload (it is not in the provider PII denylist). It is
 * written by NOTHING — every approval path in the API sets `approved`
 * (gaushala-portal.ts:152/:163, admin.service.ts:694/:748,
 * onboarding.service.ts:302, auth.ts:1279, gaushala-cows.ts:35) — so it can
 * only ever be false, and `GET /gaushala/:id` already stopped echoing it for
 * exactly that reason. This module does not read the field at all: the flag
 * that is really written is `approved`, and "Approved gaushala" is the phrase
 * apps/web settled on for it.
 *
 * Pure and dependency-free so it is testable in Node without a RN renderer.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ─── the directory row ──────────────────────────────────────────────────────

export interface ApprovedGaushalaVM {
  /** GaushalaProfile.id — a donation cause id the resolver accepts. */
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  /**
   * `GaushalaProfile.totalCows`, a self-reported figure with a DB default of
   * 0. null when it is 0 or absent: a shelter that has not stated a herd size
   * must read "Not stated", never "0 cows in care", which is a claim about a
   * gau shala that would be false of every one of them.
   */
  totalCows: number | null;
}

/** `GET /api/v1/providers/gaushala` -> `{ providers[], total, page, limit }`. */
export function selectApprovedGaushalas(payload: unknown): ApprovedGaushalaVM[] {
  if (!isRecord(payload)) return [];
  // The provider service answers `{providers,…}` directly; `{data,…}` is the
  // envelope the generic listing routes use. apps/web's getApprovedProviders
  // accepts both, so this does too — and neither is invented if absent.
  const rows = Array.isArray(payload.providers)
    ? payload.providers
    : Array.isArray(payload.data)
      ? payload.data
      : [];
  return rows
    .filter(isRecord)
    .map((p): ApprovedGaushalaVM | null => {
      const id = str(p.id);
      const name = str(p.gaushalaName) ?? str(p.name);
      if (!id || !name) return null;
      const totalCows = num(p.totalCows);
      return {
        id,
        name,
        city: str(p.city),
        description: str(p.description),
        totalCows: totalCows !== null && totalCows > 0 ? totalCows : null,
      };
    })
    .filter((g): g is ApprovedGaushalaVM => g !== null);
}

export function selectApprovedGaushalaTotal(payload: unknown, fallback: number): number {
  if (isRecord(payload)) {
    const total = num(payload.total);
    if (total !== null) return total;
    const pagination = isRecord(payload.pagination) ? payload.pagination : null;
    const nested = pagination ? num(pagination.total) : null;
    if (nested !== null) return nested;
  }
  return fallback;
}

// ─── the detail ─────────────────────────────────────────────────────────────
/**
 * `GET /api/v1/gaushala/:id` answers from ONE of two sources and says which:
 *
 *   source: 'profile'  a real, APPROVED GaushalaProfile. Carries `approved`,
 *                      an empty `cows` array by design (no fixture herd is
 *                      grafted onto a real shelter), and a `donationCauseId`
 *                      that is the OWNER'S user id — the canonical donee key.
 *   source: 'fixture'  a legacy directory sample (gs_00x). `donationCauseId`
 *                      is echoed back as the fixture id, which the donation
 *                      resolver accepts only if an approved profile happens to
 *                      carry the same NAME.
 *
 * The distinction is carried through rather than flattened, because it decides
 * whether a donate control may be drawn at all.
 */
export type GaushalaSource = 'profile' | 'fixture' | 'unknown';

export interface GaushalaDetailVM {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  address: string | null;
  /** null rather than 0 — see {@link ApprovedGaushalaVM.totalCows}. */
  totalCows: number | null;
  source: GaushalaSource;
  /** The id to pass as a donation cause. Never invented. */
  donationCauseId: string | null;
  /**
   * True only for a `profile` row the API returned `approved: true` for.
   * `GET /gaushala/:id` looks the profile up with `where: { approved: true }`,
   * so reaching the page at all already implies it — the field is read anyway
   * rather than assumed, so a future route change cannot silently promote an
   * unapproved shelter.
   */
  approved: boolean;
}

export function selectGaushalaDetail(payload: unknown): GaushalaDetailVM | null {
  if (!isRecord(payload)) return null;
  const g = isRecord(payload.gaushala) ? payload.gaushala : payload;
  const id = str(g.id);
  const name = str(g.name) ?? str(g.gaushalaName);
  // A 404 body is `{ error }`. Without a name there is nothing to render and a
  // half-populated shelter page is worse than an honest "not found".
  if (!id || !name) return null;

  const rawSource = str(g.source);
  const source: GaushalaSource =
    rawSource === 'profile' ? 'profile' : rawSource === 'fixture' ? 'fixture' : 'unknown';
  const totalCows = num(g.totalCows);
  const location = str(g.location) ?? str(g.city);
  const state = str(g.state);

  return {
    id,
    name,
    location: location && state ? `${location}, ${state}` : location,
    description: str(g.description),
    address: str(g.address),
    totalCows: totalCows !== null && totalCows > 0 ? totalCows : null,
    source,
    donationCauseId: str(g.donationCauseId),
    approved: g.approved === true,
  };
}

// ─── may this shelter be offered a donation? ────────────────────────────────
/**
 * The gau-seva mirror of lib/temple-detail.ts's verification gate.
 *
 * A donate control may only be drawn where the server will actually accept the
 * cause id behind it. That is true for an approved profile — the id is one of
 * the three spellings `resolveGaushalaDonee` collapses — and NOT knowable for a
 * legacy fixture, whose acceptance depends on an approved profile elsewhere in
 * the database sharing its name. Offering a donation that 400s with
 * "This gaushala is not yet onboarded" after the devotee has chosen an amount
 * is the same defect class as offering a booking at an unverified temple.
 */
export interface GaushalaDonability {
  canDonate: boolean;
  /** The cause id to hand the donation screen. null when `!canDonate`. */
  causeId: string | null;
  /** Why not. Empty when `canDonate`. Rendered verbatim. */
  reason: string;
}

export const GAUSHALA_NOT_ONBOARDED_NOTICE =
  'This is a directory listing, not an onboarded gaushala. Darshya cannot route ' +
  'a donation to it yet, so no donation is offered here.';

export function gaushalaDonability(g: GaushalaDetailVM | null): GaushalaDonability {
  if (!g || g.source !== 'profile' || !g.approved) {
    return { canDonate: false, causeId: null, reason: GAUSHALA_NOT_ONBOARDED_NOTICE };
  }
  const causeId = g.donationCauseId ?? g.id;
  return { canDonate: true, causeId, reason: '' };
}

/**
 * What a donor is entitled to know about where the money lands, on every
 * gaushala surface that offers one.
 *
 * TC-11 removed "your donation reaches the shelter directly" from the website
 * for a specific reason: the money lands in Darshya's Razorpay account and the
 * shelter's share is released by hand, because no automated payout rail is
 * live. The sentence below is the one apps/web replaced it with, so the two
 * clients make the same promise. It is deliberately silent about tax — that
 * claim is owned by lib/eighty-g.ts and gated on a registration Darshya does
 * not hold.
 */
export const GAUSHALA_SETTLEMENT_NOTICE =
  'Contributions are recorded against this shelter and appear in its portal. ' +
  'Darshya collects the payment and releases the shelter’s share.';
