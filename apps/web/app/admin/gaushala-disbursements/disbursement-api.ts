/**
 * Admin gaushala-disbursement client.
 *   GET  /api/v1/admin/gaushala-disbursements → { gaushalas: GaushalaBalance[] }
 *   POST /api/v1/admin/gaushala-disbursements   body { gaushalaUserId, amountInr, reference, note? }
 * Recording a transfer moves no money; the bank transfer is made by hand first.
 */
import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';

export interface GaushalaBalance {
  gaushalaUserId: string;
  name: string;
  donationsCount: number;
  paidInr: number;
  disbursedInr: number;
  owedInr: number;
  payTo: { holderName: string | null; accountNumber: string; ifsc: string } | null;
}

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

export async function listGaushalaBalances(token: string | undefined): Promise<GaushalaBalance[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/gaushala-disbursements`, { headers: authHeaders(token) });
    const body = await asJson<{ gaushalas?: GaushalaBalance[] }>(res);
    return Array.isArray(body.gaushalas) ? body.gaushalas : [];
  } catch (err) {
    return rethrow(err);
  }
}

export async function recordGaushalaDisbursement(
  token: string | undefined,
  input: { gaushalaUserId: string; amountInr: number; reference: string },
): Promise<{ ok: true; owedInr: number }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/gaushala-disbursements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(input),
    });
    return await asJson<{ ok: true; owedInr: number }>(res);
  } catch (err) {
    return rethrow(err);
  }
}
