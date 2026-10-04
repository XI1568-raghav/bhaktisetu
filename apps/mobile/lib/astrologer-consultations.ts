/**
 * `GET /api/v1/consultation/astrologer/mine` — the astrologer's REAL bookings.
 *
 * WHICH RAIL, AND WHY IT MATTERS
 * ------------------------------
 * `app/(astrologer)/consultations.tsx` used to call `useAstrologyConsultations`
 * → `GET /api/v1/astrology/consultations`. That endpoint answers from
 * `astrology.service`'s **private in-memory `Map`**:
 *
 *     private sessions: Map<string, PortalConsultation> = new Map();
 *
 * Nothing writes to it except `startSession()` inside the same process. It is
 * empty on every boot, is not shared between server instances, and holds no row
 * that survives a redeploy. Paid consultations live in the
 * `astrologer_consultations` table — which is what `GET /astrologer-portal/
 * dashboard` counts, what the Commission ledger is keyed to, and what
 * `/consultation/astrologer/mine` reads.
 *
 * So the astrologer's "Sessions" tab showed an empty list while their dashboard
 * on the previous tab counted real consultations, and the three buttons on each
 * card addressed the same volatile Map:
 *
 *   Join Call       POST /astrology/consultations/:id/start-call → 404 for a
 *                   real row ("Consultation not found").
 *   Mark Completed  PATCH /astrology/consultations/:id → 404, same reason.
 *   Cancel          the astrologer must not have this at all. The real
 *                   endpoint, POST /consultation/:id/cancel, is DEVOTEE-only:
 *                   `if (row.user_id !== currentUser.id) return 403`. There is
 *                   no astrologer-side cancellation anywhere in the API.
 *
 * The status vocabulary was wrong too. The screen filtered on 'scheduled',
 * which this table has never stored; the real set is `pending_payment |
 * payment_review | confirmed | completed | cancelled`, so the "Upcoming" tab
 * was permanently empty even against the Map.
 */

export type ConsultationStatus =
  | 'pending_payment'
  | 'payment_review'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface AstrologerConsultationVM {
  id: string;
  /** Human-facing booking reference, e.g. "CN-2026-0007". */
  reference: string | null;
  status: string;
  minutes: number | null;
  /**
   * `amount_inr` — what the DEVOTEE PAID. This is gross: the astrologer's own
   * share is `Commission.amount` and is shown on the Earnings screen. Never
   * label this figure as an earning, and never derive one from it.
   */
  grossPaidInr: number | null;
  scheduledAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
  /** Minted at verify-payment; `null` until the room exists. */
  jitsiUrl: string | null;
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
 * `null` — not `[]` — when the payload is not this endpoint's shape. "No
 * consultations" and "the request failed" must not render identically; that
 * conflation is what let the old screen tell a working astrologer they had
 * nothing booked.
 */
export function selectAstrologerConsultations(
  payload: unknown,
): AstrologerConsultationVM[] | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.consultations)) return null;
  return payload.consultations
    .filter(isRecord)
    .map((c) => ({
      id: String(c.id ?? ''),
      reference: str(c.reference),
      status: (str(c.status) ?? '').toLowerCase(),
      minutes: num(c.minutes),
      grossPaidInr: num(c.amountInr),
      scheduledAt: str(c.scheduledAt),
      paidAt: str(c.paidAt),
      createdAt: str(c.createdAt),
      jitsiUrl: str(c.jitsiUrl),
    }))
    .filter((c) => c.id !== '');
}

/**
 * The astrologer may mark a consultation complete only from `confirmed`.
 *
 * `PATCH /consultation/:id/complete` returns 409 "Cannot complete a
 * {status} consultation." for every other value, and answers idempotently for
 * one already `completed`. Offering the button outside this state can only
 * produce an error the astrologer cannot act on.
 */
export function canCompleteConsultation(status: string): boolean {
  return status.toLowerCase() === 'confirmed';
}

/**
 * The room is reachable for a paid row only. `POST /consultation/start` refuses
 * anything that is not `confirmed` or `completed` with "Consultation is not
 * paid/active." — and there is no point sending a finished session back into a
 * call, so the control is offered on `confirmed` alone.
 */
export function canJoinConsultation(status: string, jitsiUrl: string | null): boolean {
  return status.toLowerCase() === 'confirmed' && !!jitsiUrl;
}

export interface ConsultationFilter {
  key: string;
  label: string;
  /** `null` = no filter. */
  statuses: ConsultationStatus[] | null;
}

/** Mirrors `astrologerListSchema`'s enum so a tab here means what it means there. */
export const CONSULTATION_FILTERS: ReadonlyArray<ConsultationFilter> = Object.freeze([
  { key: 'all', label: 'All', statuses: null },
  { key: 'unpaid', label: 'Awaiting payment', statuses: ['pending_payment', 'payment_review'] },
  { key: 'confirmed', label: 'Upcoming', statuses: ['confirmed'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
]);

export function filterConsultations(
  rows: AstrologerConsultationVM[],
  filterKey: string,
): AstrologerConsultationVM[] {
  const f = CONSULTATION_FILTERS.find((x) => x.key === filterKey);
  if (!f || f.statuses === null) return rows;
  const wanted = f.statuses as string[];
  return rows.filter((r) => wanted.includes(r.status));
}
