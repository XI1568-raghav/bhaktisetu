/**
 * `GET /api/v1/priest/pujas` — the pandit's OWN puja offerings.
 *
 * WHAT THIS REPLACES
 * ------------------
 * `app/(priest)/services.tsx` is titled "My Services". It showed
 * `usePujas()` — the PLATFORM catalogue of `PujaType` rows, the same list every
 * devotee browses — and carried this note:
 *
 *   "There is no priest-service-toggle endpoint to wire it to, so the screen
 *    shows the catalogue read-only and says where it can be changed."
 *
 * That was false when it was written. `PriestPujaOffering` is a per-pandit
 * table with a full CRUD surface in routes/priest.ts:1112-1222 —
 * `GET /priest/pujas`, `POST /priest/pujas`, `PATCH /priest/pujas/:id`,
 * `DELETE /priest/pujas/:id` and, precisely, `PATCH /priest/pujas/:id/
 * toggle-active`. Every one is owner-gated ("You do not own this offering.").
 *
 * So a pandit's own service list — the thing that appears on their public
 * profile and decides what devotees can book from them — was invisible in the
 * app, and the one screen named after it showed someone else's price list. The
 * platform catalogue is still shown below the real list, clearly labelled as
 * the platform's, because a pandit does use it to see what Darshya lists at
 * what price.
 *
 * `basePrice` is `Decimal(10,2)` serialised as a STRING by the route
 * (`serializeOffering`), deliberately, to preserve precision. Parse it once,
 * here, and never treat an unparseable value as ₹0.
 */

export interface PriestOfferingVM {
  id: string;
  name: string;
  description: string | null;
  deity: string | null;
  /** Rupees. `null` when the string could not be parsed — renders as a dash. */
  basePriceInr: number | null;
  durationMinutes: number | null;
  isActive: boolean;
  maxBookingsPerSlot: number | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * `null` — not `[]` — when the payload is not `{offerings: [...]}`. "You list
 * no services" is a claim only the server gets to make.
 */
export function selectPriestOfferings(payload: unknown): PriestOfferingVM[] | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.offerings)) return null;
  return payload.offerings
    .filter(isRecord)
    .map((o): PriestOfferingVM | null => {
      const id = str(o.id);
      const name = str(o.name);
      if (!id || !name) return null;
      return {
        id,
        name,
        description: str(o.description),
        deity: str(o.deity),
        basePriceInr: num(o.basePrice),
        durationMinutes: num(o.durationMinutes),
        // The column is a non-null boolean; anything else is not "active".
        isActive: o.isActive === true,
        maxBookingsPerSlot: num(o.maxBookingsPerSlot),
      };
    })
    .filter((o): o is PriestOfferingVM => o !== null);
}

export function countActiveOfferings(rows: PriestOfferingVM[]): number {
  return rows.filter((o) => o.isActive).length;
}
