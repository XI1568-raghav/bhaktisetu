/**
 * Admin marketplace-subscription client.
 *
 * Three endpoints, because no single one answers the question:
 *
 *   GET /api/v1/admin/subscriptions  the per-subscription list. TODAY THIS IS A
 *       STUB: routes/admin-subscriptions.ts returns a literal
 *       `const subs: unknown[] = []` with `active: 0, activeMrr: 0` and a `note`
 *       explaining itself that no UI ever rendered (AO-09).
 *   GET /api/v1/admin/dashboard      activeSubscriptions — a real
 *       `marketplaceSubscription.count({ where: { status: 'ACTIVE' } })`.
 *   GET /api/v1/admin/revenue        subscriptionRevenue — the same ACTIVE rows
 *       grouped by plan+role, and totalSubscriptions, their summed amount.
 *
 * The last two query the table the first one claims does not exist, which is why
 * /admin/subscriptions said 0 while /admin/revenue said 6. Until the list
 * endpoint is real, the counts come from the sources that work and the page says
 * out loud which part is missing.
 */

import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';
import type { MarketplaceSubscription } from '../../../lib/subscription-api';

export interface AdminSubscriptionList {
  subscriptions: MarketplaceSubscription[];
  total: number;
  /** The endpoint's own explanation of what it is not returning. */
  note: string | null;
}

export interface SubscriptionGroup {
  plan: string;
  role: string;
  count: number;
  totalAmount: number;
}

export interface SubscriptionTotals {
  /** ACTIVE MarketplaceSubscription rows — the number /admin/dashboard shows. */
  activeCount: number;
  /**
   * Sum of `amount` across those rows. NOT monthly recurring revenue: `amount`
   * is what the subscription is billed for its own term (startDate→endDate), and
   * the live ENTERPRISE row is Rs 5,000 for a YEAR. Calling this MRR — as the
   * tile used to — overstates it 12x for every annual plan.
   */
  activeValue: number;
  groups: SubscriptionGroup[];
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function asJson<T>(res: Response, fallback: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `${fallback} (${res.status})`;
    try {
      const parsed = text ? (JSON.parse(text) as { error?: string; message?: string }) : null;
      const detail = parsed?.error ?? parsed?.message;
      if (detail) message = `${fallback} (${res.status}): ${detail}`;
    } catch {
      /* keep the default */
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function rethrow(err: unknown): never {
  if (isNetworkFailure(err)) throw new Error(NETWORK_ERROR_MESSAGE);
  throw err instanceof Error ? err : new Error('Request failed.');
}

export async function listAdminSubscriptions(
  token: string | undefined,
): Promise<AdminSubscriptionList> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/subscriptions`, {
      headers: authHeaders(token),
      cache: 'no-store',
    });
    const body = await asJson<{
      subscriptions?: MarketplaceSubscription[];
      data?: MarketplaceSubscription[];
      total?: number;
      note?: string;
    }>(res, 'Failed to load subscriptions');

    const rows = Array.isArray(body.subscriptions)
      ? body.subscriptions
      : Array.isArray(body.data)
        ? body.data
        : [];
    return {
      subscriptions: rows,
      total: typeof body.total === 'number' ? body.total : rows.length,
      note: typeof body.note === 'string' && body.note.trim() ? body.note : null,
    };
  } catch (err) {
    return rethrow(err);
  }
}

/**
 * The authoritative counts, from the two endpoints that query the table.
 *
 * Both are required: if either fails the caller must show the count as unknown
 * rather than falling back to the stub's zero, which is the defect itself.
 */
export async function fetchSubscriptionTotals(
  token: string | undefined,
): Promise<SubscriptionTotals> {
  try {
    const [dashRes, revRes] = await Promise.all([
      fetchWithTimeout(`${API_BASE_URL}/admin/dashboard`, { headers: authHeaders(token) }),
      fetchWithTimeout(`${API_BASE_URL}/admin/revenue`, { headers: authHeaders(token) }),
    ]);

    const dashboard = await asJson<{ activeSubscriptions?: number }>(
      dashRes,
      'Failed to load the subscription count',
    );
    const revenue = await asJson<{
      totalSubscriptions?: number;
      subscriptionRevenue?: SubscriptionGroup[];
    }>(revRes, 'Failed to load subscription revenue');

    return {
      activeCount: typeof dashboard.activeSubscriptions === 'number' ? dashboard.activeSubscriptions : 0,
      activeValue: typeof revenue.totalSubscriptions === 'number' ? revenue.totalSubscriptions : 0,
      groups: Array.isArray(revenue.subscriptionRevenue) ? revenue.subscriptionRevenue : [],
    };
  } catch (err) {
    return rethrow(err);
  }
}
