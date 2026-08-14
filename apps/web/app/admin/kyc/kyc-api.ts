/**
 * Admin provider-KYC client.
 *
 * Verified against apps/api/src/routes/admin-bookings.ts (curled on the live
 * stack 2026-08-12):
 *
 *   GET   /api/v1/admin/bookings/provider-kyc?status=pending|verified|rejected
 *         → { status, submissions: [ { user_id, verified, verified_at,
 *              rejection_reason, created_at, has_bank, full_name, email } ] }
 *   PATCH /api/v1/admin/bookings/provider-kyc/:userId
 *         body { action: 'verify' | 'reject', reason? }
 *         → { ok: true, userId, verified, reason }
 *
 * The queue rows come straight out of a raw SQL projection, so they are
 * **snake_case** — not the camelCase every other endpoint in this app returns.
 * They are normalised once, here, rather than leaking `submission.full_name`
 * into JSX. Account numbers are deliberately absent from the projection; this
 * client never asks for them and the screen never shows them.
 *
 * Why this rail matters more than a missing page: payout.service gates BOTH
 * payout paths on `provider_kyc.verified`, and until 2026-08-12 nothing in the
 * codebase could set that column to true. Every earning provider was
 * permanently told "KYC pending" and could not withdraw a rupee. The PATCH
 * below is the only writer.
 */

import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';

export type KycQueueStatus = 'pending' | 'verified' | 'rejected';

export interface KycSubmission {
  userId: string;
  fullName: string;
  email: string | null;
  verified: boolean;
  verifiedAt: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  /**
   * `bank_account_number IS NOT NULL AND bank_ifsc IS NOT NULL`, computed
   * server-side. Verifying without it is a 409 — the API refuses to unlock a
   * payout that has nowhere to send the money.
   */
  hasBank: boolean;
}

interface RawSubmission {
  user_id?: unknown;
  full_name?: unknown;
  email?: unknown;
  verified?: unknown;
  verified_at?: unknown;
  rejection_reason?: unknown;
  created_at?: unknown;
  has_bank?: unknown;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function normalise(row: RawSubmission): KycSubmission {
  return {
    userId: str(row.user_id) ?? '',
    fullName: str(row.full_name) ?? 'Unknown provider',
    email: str(row.email),
    verified: row.verified === true,
    verifiedAt: str(row.verified_at),
    rejectionReason: str(row.rejection_reason),
    submittedAt: str(row.created_at),
    hasBank: row.has_bank === true,
  };
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fastify handlers in this repo reply `{ error }` (plus `details`), not
 * `{ message }`. Reading only `message` is how a real backend rejection — the
 * "no bank account on file" 409, the "reason is required" 400 — reaches the
 * operator as a bare "Request failed (409)" with the actionable part dropped.
 */
async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const parsed = text ? (JSON.parse(text) as { error?: string; message?: string }) : null;
      if (parsed && typeof parsed.error === 'string') message = parsed.error;
      else if (parsed && typeof parsed.message === 'string') message = parsed.message;
    } catch {
      /* keep the default */
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function rethrow(err: unknown): never {
  if (isNetworkFailure(err)) throw new Error(NETWORK_ERROR_MESSAGE);
  throw err instanceof Error ? err : new Error('KYC request failed.');
}

export async function listKycSubmissions(
  token: string | undefined,
  status: KycQueueStatus = 'pending',
): Promise<KycSubmission[]> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/admin/bookings/provider-kyc?status=${encodeURIComponent(status)}`,
      { headers: authHeaders(token) },
    );
    const body = await asJson<{ submissions?: RawSubmission[] }>(res);
    return Array.isArray(body.submissions) ? body.submissions.map(normalise) : [];
  } catch (err) {
    return rethrow(err);
  }
}

export interface KycDecisionResult {
  userId: string;
  verified: boolean;
  reason: string | null;
}

/**
 * Record a KYC decision.
 *
 * Returns the server's own view. The caller MUST check `verified` against the
 * decision it asked for before telling anyone anything — a 200 is only proof
 * the request was accepted, and this codebase already shipped a control
 * ("User updated (mock)") that treated a 200 as proof of a write. Unlocking a
 * payout for an unverified provider, or telling a rejected one they passed,
 * both start from that same mistake.
 */
export async function decideKyc(
  token: string | undefined,
  userId: string,
  action: 'verify' | 'reject',
  reason?: string,
): Promise<KycDecisionResult> {
  const payload: Record<string, string> = { action };
  if (reason) payload.reason = reason;

  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/admin/bookings/provider-kyc/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(payload),
      },
    );
    const body = await asJson<{ ok?: boolean; userId?: string; verified?: unknown; reason?: unknown }>(res);
    if (typeof body.verified !== 'boolean') {
      throw new Error(
        'The server accepted the decision but did not confirm the KYC state. Reload the queue before deciding again.',
      );
    }
    return {
      userId: typeof body.userId === 'string' ? body.userId : userId,
      verified: body.verified,
      reason: str(body.reason),
    };
  } catch (err) {
    return rethrow(err);
  }
}
