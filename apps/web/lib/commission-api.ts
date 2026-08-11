/**
 * Commission API client.
 *
 * Backend routes (both verified against apps/api/src/routes):
 *   GET /api/v1/admin/commissions    admin ledger, admin-only, paginated
 *                                    (?status / ?providerId / ?from / ?to / ?page / ?pageSize)
 *   GET /api/v1/payouts/commissions  the signed-in provider's own commissions
 *
 * batch9-review (2026-08-11): the previous docblock advertised
 * `GET /api/v1/admin/commissions/me` and claimed the admin list could be scoped
 * per provider with `?providerId=me`. Neither was true. `providerId` is
 * validated as `z.string().uuid()` (admin.ts), so 'me' 400'd, and the route sits
 * behind `requireRole('admin')`, so a provider would have got a 403 even with a
 * real UUID. /wellness-portal/earnings was therefore permanently dead. Provider
 * self-serve now has its own endpoint and its own function below; there is no
 * 'me' sentinel any more.
 */
import { API_BASE_URL } from './api-config';

/**
 * The wire values are the Prisma `CommissionStatus` enum, verbatim — the admin
 * route spreads the raw row. They were lowercase here, and three of the six
 * ('processing' | 'failed' | 'on_hold') were PayoutRequestStatus values a
 * Commission can never hold, so every status comparison in the UI silently
 * matched nothing. Keep this union bound to the DB enum so tsc catches drift.
 */
export type CommissionStatus = 'PENDING' | 'PAID' | 'REVERSED';

/**
 * Money crosses the wire as a STRING — the API stringifies every Prisma.Decimal
 * so no value is rounded through a JS float. The union is deliberate: it makes
 * `sum + c.amount` a compile error, which is how the earlier "800 + 1200 =
 * '08001200'" bug got in. Coerce with Number() at the point of use.
 */
type Money = string | number;

export interface Commission {
  id: string;
  /** Null for store-order and wellness-enrollment commissions. */
  bookingId: string | null;
  storeOrderId?: string | null;
  wellnessEnrollmentId?: string | null;
  payoutRequestId?: string | null;
  providerId: string;
  providerName?: string | null;
  providerRole?: string | null;
  bookingNumber?: string | null;
  itemName?: string | null;
  /** The PROVIDER's earning — see apps/api/src/lib/commission-math.ts. */
  amount: Money;
  /** Gross transaction value the row was split from. */
  grossAmount?: Money | null;
  /** The platform's share of that same gross. */
  platformCut?: Money | null;
  /** The platform's take rate as a percentage, e.g. 20 for 20%. */
  ratePercent?: number | null;
  status: CommissionStatus | string;
  /** Reference of the PayoutRequest that settled this row. */
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
      // Fastify handlers in this repo reply `{ error }` (plus `details`), not
      // `{ message }`. Reading only `message` meant every backend rejection
      // surfaced to the user as the bare "Request failed (400)" with the actual
      // reason discarded.
      if (parsed && typeof parsed.message === 'string') message = parsed.message;
      else if (parsed && typeof parsed.error === 'string') message = parsed.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export interface CommissionPage {
  items: Commission[];
  /** Total rows matching the query across ALL pages, not just this one. */
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Both endpoints reply `{ data, page, pageSize, total }`. Tolerate a bare array
 * or a `commissions` key too so a shape change degrades to "no pager" rather
 * than "no rows".
 */
function unwrapPage(payload: unknown, fallbackPageSize: number): CommissionPage {
  if (Array.isArray(payload)) {
    const items = payload as Commission[];
    return { items, total: items.length, page: 1, pageSize: fallbackPageSize };
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const items = (Array.isArray(obj.data)
      ? obj.data
      : Array.isArray(obj.commissions)
        ? obj.commissions
        : []) as Commission[];
    return {
      items,
      total: typeof obj.total === 'number' ? obj.total : items.length,
      page: typeof obj.page === 'number' ? obj.page : 1,
      pageSize: typeof obj.pageSize === 'number' ? obj.pageSize : fallbackPageSize,
    };
  }
  return { items: [], total: 0, page: 1, pageSize: fallbackPageSize };
}

/**
 * The route's maximum (admin.ts caps pageSize at 200). The client used to send
 * no pagination at all, so it silently took the route's default of 20 and threw
 * away `total` — an admin with a 500-row ledger saw 20 rows, filtered and
 * summed over those 20, and had nothing on screen saying 480 more existed.
 */
export const COMMISSION_PAGE_SIZE = 200;

export interface ListCommissionOptions {
  providerId?: string;
  status?: CommissionStatus | string;
  page?: number;
  pageSize?: number;
}

export async function listCommissions(
  token: string | undefined,
  opts: ListCommissionOptions = {},
): Promise<CommissionPage> {
  const pageSize = opts.pageSize ?? COMMISSION_PAGE_SIZE;
  const qs = new URLSearchParams();
  if (opts.providerId) qs.set('providerId', opts.providerId);
  if (opts.status) qs.set('status', String(opts.status));
  qs.set('page', String(opts.page ?? 1));
  qs.set('pageSize', String(pageSize));
  const res = await fetch(`${API_BASE_URL}/admin/commissions?${qs.toString()}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  return unwrapPage(await asJson<unknown>(res), pageSize);
}

/**
 * The signed-in provider's own commissions.
 *
 * Deliberately NOT the admin route with a filter: that route is admin-only, so
 * a wellness instructor or astrologer calling it gets a 403 no matter what
 * query string is attached.
 */
export async function listMyCommissions(
  token: string | undefined,
  opts: Omit<ListCommissionOptions, 'providerId'> = {},
): Promise<CommissionPage> {
  const pageSize = opts.pageSize ?? COMMISSION_PAGE_SIZE;
  const qs = new URLSearchParams();
  if (opts.status) qs.set('status', String(opts.status));
  qs.set('page', String(opts.page ?? 1));
  qs.set('pageSize', String(pageSize));
  const res = await fetch(`${API_BASE_URL}/payouts/commissions?${qs.toString()}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  return unwrapPage(await asJson<unknown>(res), pageSize);
}
