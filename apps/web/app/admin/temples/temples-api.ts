/**
 * Admin temple editor client.
 *   GET   /api/v1/admin/temples?q=&limit=             -> { temples, total }
 *   GET   /api/v1/admin/temples/:id                   -> { temple }
 *   PATCH /api/v1/admin/temples/:id                   -> { temple, changes }
 *   POST  /api/v1/admin/temples/:id/standard-offerings -> { added, alreadyPresent, ... }
 */
import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';

export interface AdminTemple {
  id: string;
  name: string;
  slug: string;
  description?: string;
  deityPrimary: string;
  city: string;
  state: string;
  addressLine?: string;
  pincode: string;
  lat: number;
  lng: number;
  isVerified: boolean;
  status?: 'active' | 'inactive' | 'pending_review';
  activeOfferings: number;
  flags: string[];
}

export interface TempleEditInput {
  name?: string;
  description?: string;
  deityPrimary?: string;
  city?: string;
  state?: string;
  addressLine?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  isVerified?: boolean;
  status?: 'active' | 'inactive' | 'pending_review';
}

export interface StandardOfferingsResult {
  message: string;
  added: number;
  alreadyPresent: number;
  missingFromCatalogue: string[];
}

export const FLAG_LABELS: Record<string, string> = {
  coordinates_missing: 'Location is 0,0 (not set)',
  pincode_invalid: 'Pincode missing or not 6 digits',
};

const authHeaders = (token: string | undefined): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new UserFacingError(
      serverErrorText(text, userFacingMessage(new Error(`HTTP ${res.status}`), 'Request failed. Please try again.')),
      res.status,
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function rethrow(err: unknown): never {
  if (isNetworkFailure(err)) throw new UserFacingError(NETWORK_ERROR_MESSAGE);
  throw err instanceof UserFacingError ? err : new UserFacingError(userFacingMessage(err, 'Request failed.'));
}

export async function listAdminTemples(
  token: string | undefined,
  q: string,
): Promise<{ temples: AdminTemple[]; total: number }> {
  try {
    const qs = new URLSearchParams({ limit: '100' });
    if (q.trim()) qs.set('q', q.trim());
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/temples?${qs}`, { headers: authHeaders(token) });
    const body = await asJson<{ temples?: AdminTemple[]; total?: number }>(res);
    const temples = Array.isArray(body.temples) ? body.temples : [];
    return { temples, total: body.total ?? temples.length };
  } catch (err) {
    return rethrow(err);
  }
}

export async function getAdminTemple(token: string | undefined, id: string): Promise<AdminTemple> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/temples/${id}`, { headers: authHeaders(token) });
    return (await asJson<{ temple: AdminTemple }>(res)).temple;
  } catch (err) {
    return rethrow(err);
  }
}

export async function updateAdminTemple(
  token: string | undefined,
  id: string,
  input: TempleEditInput,
): Promise<AdminTemple> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/temples/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(input),
    });
    return (await asJson<{ temple: AdminTemple }>(res)).temple;
  } catch (err) {
    return rethrow(err);
  }
}

export async function addStandardOfferings(
  token: string | undefined,
  id: string,
): Promise<StandardOfferingsResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/temples/${id}/standard-offerings`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return await asJson<StandardOfferingsResult>(res);
  } catch (err) {
    return rethrow(err);
  }
}
