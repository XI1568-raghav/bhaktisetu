/**
 * Admin payout-queue client — the one rail that actually settles a provider.
 *
 * Verified against apps/api/src/routes/admin-bookings.ts:
 *
 *   GET  /api/v1/admin/bookings/payout-requests?status=pending
 *        → { requests: AdminPayoutRequest[] }   (payout.service.listPayoutRequests)
 *   POST /api/v1/admin/bookings/payout-requests/:id/process
 *        body { action: 'complete' | 'reject' | 'fail', reference?, failureReason? }
 *        → { ok: true, payout: { id, status } } (payout.service.processPayout)
 *
 * The id in that path is a **PayoutRequest** id, never a Commission id.
 * `processPayout` looks the row up with `payoutRequest.findUnique` and throws
 * "Payout request not found." for anything else, which the route turns into a
 * 404. A PENDING Commission that no provider has requested a payout against is
 * therefore not settleable from here — a request has to exist first, and that
 * is what the /admin/revenue page renders the two lists separately to show.
 *
 * Completing is the action the revenue dashboard wires. It is the one that
 * moves money: `processPayout('complete')` marks every linked Commission PAID
 * behind a completion guard (COMPLETABLE_STATUSES, linked-set present, all
 * still PENDING, totals equal). reject/fail release the balance back to the
 * provider and live on the dedicated /admin/payouts screen (AO-03), which
 * imports `processPayoutRequest` below rather than growing a second client.
 */

import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';

/** PayoutRequestStatus in prisma/schema.prisma — lowercase, and no 'reversed'. */
export type PayoutRequestStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected';

export interface AdminPayoutRequest {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string | null;
  role: string;
  /**
   * Money crosses the wire as a STRING — the API stringifies every
   * Prisma.Decimal so nothing is rounded through a JS float. Coerce with
   * Number() only at the point of display.
   */
  amount: string;
  method: string;
  status: PayoutRequestStatus | string;
  reference: string | null;
  requestedAt: string;
  processedAt: string | null;
  /** How many Commission rows this request owns. 0 means a hollow request. */
  linkedCommissionCount: number;
  linkedCommissionTotal: string;
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fastify handlers in this repo reply `{ error }` (plus `details`), not
 * `{ message }`. Reading only `message` is how backend rejections end up on
 * screen as a bare "Request failed (400)" with the actual reason — including
 * every guard message processPayout raises — thrown away.
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

/** Turns a stalled/unreachable call into a message an operator can act on. */
function rethrow(err: unknown): never {
  if (isNetworkFailure(err)) throw new UserFacingError(NETWORK_ERROR_MESSAGE);
  throw err instanceof UserFacingError ? err : new UserFacingError(userFacingMessage(err, 'Payout request failed.'));
}

/** The admin payout queue. Defaults to the settleable (pending) slice. */
export async function listPayoutRequests(
  token: string | undefined,
  status: PayoutRequestStatus | '' = 'pending',
): Promise<AdminPayoutRequest[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/bookings/payout-requests${qs}`, {
      headers: authHeaders(token),
    });
    const body = await asJson<{ requests?: AdminPayoutRequest[] }>(res);
    return Array.isArray(body.requests) ? body.requests : [];
  } catch (err) {
    return rethrow(err);
  }
}

/**
 * The accrual side of the same screen: what each provider has EARNED but not
 * yet requested. `GET /admin/bookings/payouts/pending` groups the ledger (plus
 * the PriestPayout sidecar for PRIEST) and excludes anything already claimed by
 * an open payout request.
 *
 * Deliberately has no settle action anywhere it is rendered. There is no
 * endpoint that can pay one of these groups — processPayout takes a
 * PayoutRequest id — so a control here could only ever lie.
 */
export interface PayoutAccrualGroup {
  providerId: string;
  providerName: string;
  role: string;
  bookingsCount: number;
  totalPayout: number;
}

export interface PayoutAccrual {
  groups: PayoutAccrualGroup[];
  scanLimit: number;
  truncated: boolean;
  schemaNote: string | null;
}

export async function getPayoutAccrual(token: string | undefined): Promise<PayoutAccrual> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/bookings/payouts/pending`, {
      headers: authHeaders(token),
    });
    const body = await asJson<{
      groups?: PayoutAccrualGroup[];
      scanLimit?: number;
      truncated?: boolean;
      schemaNote?: string;
    }>(res);
    return {
      groups: Array.isArray(body.groups) ? body.groups : [],
      scanLimit: typeof body.scanLimit === 'number' ? body.scanLimit : 0,
      truncated: body.truncated === true,
      schemaNote: body.schemaNote ?? null,
    };
  } catch (err) {
    return rethrow(err);
  }
}

export interface ProcessedPayout {
  id: string;
  status: PayoutRequestStatus | string;
}

/** The three transitions POST …/process accepts. */
export type PayoutAction = 'complete' | 'reject' | 'fail';

/**
 * Drive one payout request through the admin rail.
 *
 * `complete` records a transfer the operator has already made and marks the
 * linked Commissions PAID. `reject` / `fail` unlink them, which puts the money
 * back in the provider's withdrawable balance — a real state change with its
 * own failure modes, not a cancel button.
 *
 * Returns the server's view of the request. The caller MUST check that
 * `status` is the one it asked for before telling anyone anything happened: a
 * 200 alone only means the request was accepted, and processPayout answers 200
 * with the unchanged row on its already-completed short-circuit (so a reject
 * can legitimately come back `completed`). This codebase has already shipped
 * one control — "User updated (mock)" — that read a 200 as proof of a write.
 */
export async function processPayoutRequest(
  token: string | undefined,
  payoutRequestId: string,
  action: PayoutAction,
  opts: { reference?: string; failureReason?: string } = {},
): Promise<ProcessedPayout> {
  const payload: Record<string, string> = { action };
  if (opts.reference) payload.reference = opts.reference;
  if (opts.failureReason) payload.failureReason = opts.failureReason;

  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/admin/bookings/payout-requests/${encodeURIComponent(payoutRequestId)}/process`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(payload),
      },
    );
    const body = await asJson<{ ok?: boolean; payout?: ProcessedPayout }>(res);
    if (!body.payout || typeof body.payout.status !== 'string') {
      throw new UserFacingError(
        'The server accepted the request but did not confirm the payout status. Check the payout queue before transferring again.',
      );
    }
    return body.payout;
  } catch (err) {
    return rethrow(err);
  }
}

/**
 * Record a completed transfer against a payout request.
 *
 * `reference` is the operator's real transfer reference (UTR / UPI ref). It is
 * optional on the wire but required by the caller: a settled payout with no
 * reference cannot be reconciled against a bank statement later.
 */
export async function completePayoutRequest(
  token: string | undefined,
  payoutRequestId: string,
  reference: string,
): Promise<ProcessedPayout> {
  return processPayoutRequest(token, payoutRequestId, 'complete', { reference });
}
