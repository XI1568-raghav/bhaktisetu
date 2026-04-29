/**
 * Commission API client.
 * Backend routes:
 *   GET    /api/v1/admin/commissions                (admin list, ?providerId / ?status / ?role)
 *   GET    /api/v1/admin/commissions/me             (current provider's commissions)
 *
 * The admin list is also reachable per provider via `?providerId=me` so the
 * same helper covers payouts + earnings dashboards across portals.
 */
import { API_BASE_URL } from './api-config';

export type CommissionStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'on_hold';

export interface Commission {
  id: string;
  bookingId: string;
  providerId: string;
  providerName?: string | null;
  providerRole?: string | null;
  bookingNumber?: string | null;
  itemName?: string | null;
  amount: number;
  grossAmount?: number | null;
  netAmount?: number | null;
  ratePercent?: number | null;
  status: CommissionStatus | string;
  payoutMethod?: string | null;
  payoutReference?: string | null;
  processedAt?: string | null;
  createdAt: string;
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (parsed && typeof parsed.message === 'string') message = parsed.message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function unwrapCommissions(payload: unknown): Commission[] {
  if (Array.isArray(payload)) return payload as Commission[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.commissions)) return obj.commissions as Commission[];
    if (Array.isArray(obj.data)) return obj.data as Commission[];
  }
  return [];
}

export interface ListCommissionOptions {
  providerId?: string; // 'me' for current user
  status?: CommissionStatus | string;
  role?: string;
}

export async function listCommissions(
  token: string | undefined,
  opts: ListCommissionOptions = {},
): Promise<Commission[]> {
  const qs = new URLSearchParams();
  if (opts.providerId) qs.set('providerId', opts.providerId);
  if (opts.status) qs.set('status', String(opts.status));
  if (opts.role) qs.set('role', opts.role);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/admin/commissions${suffix}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  const json = await asJson<unknown>(res);
  return unwrapCommissions(json);
}

export async function listMyCommissions(
  token: string | undefined,
  status?: CommissionStatus | string,
): Promise<Commission[]> {
  return listCommissions(token, { providerId: 'me', status });
}
