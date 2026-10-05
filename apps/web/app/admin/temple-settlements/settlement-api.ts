/**
 * Admin temple-settlement client.
 *   GET  /api/v1/admin/temple-settlements              → { temples: TempleBalance[] }
 *   POST /api/v1/admin/temple-settlements/puja-share   body { templeId, amountInr, reference }
 *   POST /api/v1/admin/temple-settlements/donations    body { templeId, amountInr, reference }
 * Recording a transfer moves no money; the bank transfer is made by hand first.
 */
import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';

export interface TempleBalance {
  templeId: string;
  name: string;
  pujaShareOwedInr: number;
  pujaShareHeldInr: number;
  pujaShareSentInr: number;
  donationsCount: number;
  donationsPaidInr: number;
  donationsSentInr: number;
  donationsOwedInr: number;
  payTo: { holderName: string | null; accountNumber: string; ifsc: string } | null;
}

export type TransferKind = 'puja-share' | 'donations';

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

export async function listTempleBalances(token: string | undefined): Promise<TempleBalance[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/temple-settlements`, { headers: authHeaders(token) });
    const body = await asJson<{ temples?: TempleBalance[] }>(res);
    return Array.isArray(body.temples) ? body.temples : [];
  } catch (err) {
    return rethrow(err);
  }
}

export async function recordTempleTransfer(
  token: string | undefined,
  kind: TransferKind,
  input: { templeId: string; amountInr: number; reference: string },
): Promise<{ ok: true }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/temple-settlements/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(input),
    });
    return await asJson<{ ok: true }>(res);
  } catch (err) {
    return rethrow(err);
  }
}
