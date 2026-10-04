/**
 * Admin refund-rail client.
 *
 * Colocated per-rail client, same shape as ../kyc/kyc-api.ts. The payout rail
 * lives in ../revenue/payout-api.ts and is imported, not copied, by
 * /admin/payouts — this file is a different API surface (bookings + the
 * Razorpay refund rail), so it is its own module rather than a third role
 * grafted onto the payout client.
 *
 * Verified against apps/api/src/routes/admin-bookings.ts and curled on the
 * live stack 2026-08-12:
 *
 *   GET  /api/v1/admin/bookings/refunds/pending
 *        → { bookings: [ …booking, pujaType, temple, user, payments[] ],
 *            schemaNote }
 *   POST /api/v1/admin/bookings/refunds/:bookingId/approve
 *        body { reason?, refundType?: 'full'|'partial', amountInr? }
 *        → 200 { ok: true, refund: ProcessRefundResult }
 *        | 502 { error, refund }   ← what the local stack actually answers
 *   POST /api/v1/admin/bookings/refunds/:bookingId/reject
 *        body { reason }  → { booking }
 *   GET  /api/v1/admin/bookings?status=refunded
 *        → { bookings, page, limit, total }
 *
 * THE QUEUE IS A DERIVED SET, NOT A STATUS. BookingStatus has no
 * REFUND_REQUESTED, so the server returns `cancelled` bookings whose Payment is
 * still captured/authorized. Two consequences the screen has to respect:
 * approving removes a row (the payment stops being captured), rejecting does
 * NOT — there is no REFUND_REJECTED either, so a rejected row stays in the
 * queue carrying a `[refund-rejected]` marker in cancellationReason.
 *
 * `ok` ON THE ENVELOPE IS NOT `ok` ON THE REFUND. approve answers 200 with
 * `{ ok: true }` even when the inner ProcessRefundResult failed, and answers
 * 200 on the idempotent already-refunded skip. Reading the HTTP status alone
 * reports a refund that never reached the devotee's card — so `approveRefund`
 * below throws unless the *inner* result says ok, and hands the skip back to
 * the caller flagged rather than swallowed.
 */

import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';

/** Payment rows the queue projection includes. `amount` is a stringified Decimal. */
export interface RefundPayment {
  id: string;
  status: string;
  amount: string;
}

export interface RefundBooking {
  id: string;
  bookingNumber: string;
  status: string;
  /** Stringified Prisma.Decimal — coerce with Number() only to display. */
  priceAmount: string;
  currency: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  scheduledDate: string | null;
  pujaType: { name: string; slug: string } | null;
  temple: { name: string; slug: string; city: string | null } | null;
  user: { fullName: string | null; phone: string | null } | null;
  /** Present on the queue projection; absent on the /admin/bookings list. */
  payments?: RefundPayment[];
}

/** apps/api/src/services/refund.service.ts → ProcessRefundResult. */
export interface RefundResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  refundId?: string;
  paymentId?: string;
  bookingId: string;
  amountInr?: number;
  status?: 'refunded' | 'partially_refunded' | string;
  error?: string;
}

export type RefundType = 'full' | 'partial';

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fastify handlers in this repo reply `{ error }` (plus `details`), not
 * `{ message }`. Reading only `message` is how the 502 the stack raises when
 * Razorpay is unconfigured reaches the operator as a bare "Request failed
 * (502)" with the one actionable word — razorpay — thrown away.
 */
async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    // RES-09: the server's own sentence when it wrote one worth reading (the
    // API localises its validation and guard messages); otherwise friendly copy.
    // The status is carried so the page can still tell a dead session apart.
    throw new UserFacingError(
      serverErrorText(text, userFacingMessage(new Error(`HTTP ${res.status}`), 'Request failed. Please try again.')),
      res.status,
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function rethrow(err: unknown): never {
  if (isNetworkFailure(err)) throw new UserFacingError(NETWORK_ERROR_MESSAGE);
  throw err instanceof UserFacingError ? err : new UserFacingError(userFacingMessage(err, 'Refund request failed.'));
}

export interface RefundQueue {
  bookings: RefundBooking[];
  /** The server's own admission that this queue is derived, not a status. */
  schemaNote: string | null;
}

export async function listPendingRefunds(token: string | undefined): Promise<RefundQueue> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/bookings/refunds/pending`, {
      headers: authHeaders(token),
    });
    const body = await asJson<{ bookings?: RefundBooking[]; schemaNote?: string }>(res);
    return {
      bookings: Array.isArray(body.bookings) ? body.bookings : [],
      schemaNote: typeof body.schemaNote === 'string' ? body.schemaNote : null,
    };
  } catch (err) {
    return rethrow(err);
  }
}

/**
 * Bookings already refunded — the read-only other half of the screen, so an
 * operator can see what was actually paid back without opening the database.
 */
export async function listRefundedBookings(
  token: string | undefined,
  limit = 25,
): Promise<RefundBooking[]> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/admin/bookings?status=refunded&limit=${encodeURIComponent(String(limit))}`,
      { headers: authHeaders(token) },
    );
    const body = await asJson<{ bookings?: RefundBooking[] }>(res);
    return Array.isArray(body.bookings) ? body.bookings : [];
  } catch (err) {
    return rethrow(err);
  }
}

export interface ApproveRefundInput {
  reason: string;
  refundType: RefundType;
  /** Rupees. Required by refund.service when refundType is 'partial'. */
  amountInr?: number;
}

/**
 * Send a refund to the gateway.
 *
 * Throws unless the INNER ProcessRefundResult reports ok. A 200 here only means
 * the route accepted the request: `{ ok: true, refund: { ok: false, error } }`
 * is a refund that did not happen, and the 502 path carries the same failure
 * with an HTTP status attached. Both must reach the operator as failures.
 *
 * A successful return may still be `skipped: true` (already refunded). That is
 * a genuine non-event, not a fresh refund, and the caller reports it as such
 * instead of claiming the devotee was just paid back a second time.
 */
export async function approveRefund(
  token: string | undefined,
  bookingId: string,
  input: ApproveRefundInput,
): Promise<RefundResult> {
  const payload: Record<string, unknown> = {
    reason: input.reason,
    refundType: input.refundType,
  };
  if (input.refundType === 'partial') payload.amountInr = input.amountInr;

  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/admin/bookings/refunds/${encodeURIComponent(bookingId)}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(payload),
      },
    );
    const body = await asJson<{ ok?: boolean; refund?: RefundResult }>(res);
    const refund = body.refund;
    if (!refund || typeof refund.ok !== 'boolean') {
      throw new UserFacingError(
        'The server accepted the request but did not report a refund result. Check the booking before refunding again.',
      );
    }
    if (!refund.ok) {
      throw new UserFacingError(refund.error ?? 'The gateway refused the refund. Nothing was refunded.');
    }
    return refund;
  } catch (err) {
    return rethrow(err);
  }
}

/**
 * Decline a refund request.
 *
 * The returned booking is the server's echo of its own write — deliberately NOT
 * treated as proof by the caller. There is no REFUND_REJECTED status, so the
 * only durable evidence is the `[refund-rejected]` marker on a REFETCHED
 * booking; this codebase has already shipped a control that read a 200 as proof
 * of a write ("User updated (mock)") and the ledger is the wrong place to
 * repeat it.
 */
export async function rejectRefund(
  token: string | undefined,
  bookingId: string,
  reason: string,
): Promise<RefundBooking | null> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/admin/bookings/refunds/${encodeURIComponent(bookingId)}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ reason }),
      },
    );
    const body = await asJson<{ booking?: RefundBooking }>(res);
    return body.booking ?? null;
  } catch (err) {
    return rethrow(err);
  }
}

/** The marker the reject route writes into cancellationReason. */
export const REFUND_REJECTED_MARKER = '[refund-rejected]';

/**
 * How much of this booking is still refundable, in rupees.
 *
 * Read off the captured/authorized payments the queue projection carries —
 * never off priceAmount, which is what the devotee was charged in theory rather
 * than what the gateway actually holds. Returns 0 when nothing is capturable,
 * which correctly blocks a partial refund with no money behind it.
 */
export function refundableInr(booking: RefundBooking): number {
  const rows = booking.payments ?? [];
  const refundable = rows.filter(
    (p) => p.status === 'captured' || p.status === 'authorized' || p.status === 'partially_refunded',
  );
  if (refundable.length === 0) return 0;
  return refundable.reduce((sum, p) => {
    const n = Number(p.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}
