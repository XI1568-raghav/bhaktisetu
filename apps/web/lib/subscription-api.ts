/**
 * Marketplace subscription API client.
 * Backend routes:
 *   GET    /api/v1/subscriptions/plans              (public)
 *   GET    /api/v1/subscriptions/my                 (current user's sub)
 *   POST   /api/v1/subscriptions/subscribe          (start Razorpay subscription)
 *   POST   /api/v1/subscriptions/cancel             (cancel current sub)
 *   POST   /api/v1/subscriptions/webhook            (razorpay → server)
 *
 * Falls back gracefully when network is unavailable so demo / offline flows
 * keep rendering instead of crashing.
 */
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from './api-config';

export type ProviderRole =
  | 'priest'
  | 'astrologer'
  | 'wellness_instructor'
  | 'temple_manager'
  | 'store_owner'
  | 'gaushala_manager';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'pending'
  | 'expired';

export interface SubscriptionPlan {
  id: string;
  name: string;
  role: ProviderRole | string;
  description?: string | null;
  priceMonthly: number;
  currency: string;
  /**
   * PM-04: tier bucket (FREE | BASIC | PRO | ENTERPRISE), the API's `plan`
   * field. GET /subscriptions/my identifies the live subscription by TIER, not
   * by plan id, so without this the panel cannot tell which card the user is
   * already on and offered them "Subscribe" on the plan they were paying for.
   */
  tier?: string;
  // PM-02b: the API's /subscriptions/plans rows do not carry this. It is
  // optional so an absent value stays absent — defaulting it claimed
  // "Unlimited listings" on a plan capped at 5 bookings/month.
  //
  // PM-01: a `commissionOverride?: number` sat beside it, mapped below from a
  // field apps/api has never sent (grep `commissionOverride` across apps/api:
  // no matches). Its one consumer rendered "N% commission" on a plan card. No
  // plan changes any commission rate, so the field could only ever publish a
  // falsehood; it is removed rather than left dormant.
  maxListings?: number | null;
  features: string[];
  popular?: boolean;
  razorpayPlanId?: string | null;
}

export interface MarketplaceSubscription {
  id: string;
  userId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: SubscriptionStatus;
  razorpaySubscriptionId?: string | null;
  startedAt: string;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
}

export interface SubscribeResponse {
  subscription: MarketplaceSubscription | null;
  // PM-04: /subscriptions/subscribe returns NONE of these — it answers
  // `{ message, subscription }`. Typing them as required described a rail that
  // does not exist on that endpoint; the payment handles come from
  // POST /subscriptions/create (see `createSubscriptionCheckout`).
  razorpaySubscriptionId?: string | null;
  shortUrl?: string | null;
  keyId?: string | null;
  amount?: number | null;
  currency?: string | null;
}

/**
 * What POST /subscriptions/create answers: a real Razorpay subscription handle
 * plus the hosted-checkout URL. It refuses free plans and records the
 * transaction as PENDING — the ACTIVE row is written later, by the webhook.
 */
export interface SubscriptionCheckout {
  subscriptionId: string;
  shortUrl: string | null;
  status: string;
  /** True when the server minted a `sub_demo_*` id instead of calling Razorpay. */
  isDemo: boolean;
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

/**
 * PM-02b — web role name → API role enum.
 *
 * The API filters plans with `plan.roles.includes(role)` against the enum
 * PANDIT | ASTROLOGER | STORE_OWNER | WELLNESS_INSTRUCTOR | TEMPLE_MANAGER |
 * GAUSHALA_MANAGER | DEVOTEE. The web uses lowercase names and calls a pandit
 * a "priest", so `listPlans('priest')` sent `?role=priest` and the API returned
 * ZERO plans — verified live 2026-08-13: `?role=priest` → 0, `?role=PANDIT` →
 * 3. Every SubscriptionPanel in the app was therefore listing nothing, which is
 * why the ₹499-vs-₹999 gap on /pricing had never been noticed from inside the
 * product. Same bridge as auth-context's toApiRole, uppercased for this enum.
 */
const WEB_TO_API_ROLE: Record<string, string> = {
  priest: 'PANDIT',
  pandit: 'PANDIT',
  astrologer: 'ASTROLOGER',
  store_owner: 'STORE_OWNER',
  wellness_instructor: 'WELLNESS_INSTRUCTOR',
  temple_manager: 'TEMPLE_MANAGER',
  gaushala_manager: 'GAUSHALA_MANAGER',
  devotee: 'DEVOTEE',
};

export function toApiPlanRole(role: string): string {
  return WEB_TO_API_ROLE[role.toLowerCase()] ?? role.toUpperCase();
}

/**
 * PM-02b — map one API plan row onto the shape this client renders.
 *
 * The API sends `price` (rupees) and `roles` (array). The panel reads
 * `priceMonthly` and `role`. Nothing translated between them, so
 * `plan.priceMonthly` was `undefined`, `undefined > 0` is false, and every paid
 * plan rendered the literal word "Free" on the Subscribe card — while
 * subscription.service.ts created the Razorpay subscription from `plan.price`.
 * Shown ₹0, charged ₹999.
 *
 * A row with no usable numeric price returns null and is dropped from the list.
 * Rendering nothing is recoverable; rendering "Free" over a ₹2,999 charge is not.
 */
export function normalizePlan(raw: unknown): SubscriptionPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;

  const price =
    typeof r.priceMonthly === 'number' && Number.isFinite(r.priceMonthly)
      ? r.priceMonthly
      : typeof r.price === 'number' && Number.isFinite(r.price)
        ? r.price
        : null;
  if (price === null || price < 0) return null;

  const roles = Array.isArray(r.roles)
    ? r.roles.filter((x): x is string => typeof x === 'string')
    : [];

  return {
    id: r.id,
    name: r.name,
    role: typeof r.role === 'string' ? r.role : (roles[0] ?? ''),
    tier: typeof r.plan === 'string' ? r.plan : undefined,
    description: typeof r.description === 'string' ? r.description : null,
    priceMonthly: price,
    currency: typeof r.currency === 'string' ? r.currency : 'INR',
    maxListings:
      typeof r.maxListings === 'number' || r.maxListings === null
        ? (r.maxListings as number | null)
        : undefined,
    features: Array.isArray(r.features)
      ? r.features.filter((x): x is string => typeof x === 'string')
      : [],
    popular: r.popular === true,
    razorpayPlanId:
      typeof r.razorpayPlanId === 'string' ? r.razorpayPlanId : null,
  };
}

function unwrapPlans(payload: unknown): SubscriptionPlan[] {
  let rows: unknown[] = [];
  if (Array.isArray(payload)) rows = payload;
  else if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.plans)) rows = obj.plans;
    else if (Array.isArray(obj.data)) rows = obj.data;
  }
  return rows
    .map(normalizePlan)
    .filter((p): p is SubscriptionPlan => p !== null);
}

/**
 * PM-04 — map an API subscription row onto the shape the panel renders.
 *
 * The two sides never agreed on a single field name. apps/api returns
 * `SubscriptionResult`:
 *
 *     { id, userId, plan: 'PRO', role, startDate, endDate, amount,
 *       status: 'ACTIVE' }
 *
 * while SubscriptionPanel reads `planId`, `startedAt`, `currentPeriodEnd`, and
 * gates the Cancel button on `status === 'active'`. The payload was previously
 * cast straight across with `as MarketplaceSubscription`, so TypeScript never
 * saw the mismatch and every field silently arrived `undefined`:
 *
 *   - "Current plan: {plan?.name ?? planId}" rendered EMPTY;
 *   - "Started {formatDate(startedAt)}" rendered "—";
 *   - 'ACTIVE' !== 'active', so the Cancel plan button never rendered and a
 *     paying subscriber had no way to cancel from the UI.
 *
 * Accepts either vocabulary. Returns null rather than a half-built object.
 */
export function normalizeSubscription(raw: unknown): MarketplaceSubscription | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;

  const planId =
    typeof r.planId === 'string' ? r.planId : typeof r.plan === 'string' ? r.plan : null;
  if (planId === null) return null;

  const startedAt =
    typeof r.startedAt === 'string'
      ? r.startedAt
      : typeof r.startDate === 'string'
        ? r.startDate
        : '';

  const periodEnd =
    typeof r.currentPeriodEnd === 'string'
      ? r.currentPeriodEnd
      : typeof r.endDate === 'string'
        ? r.endDate
        : null;

  return {
    id: r.id,
    userId: typeof r.userId === 'string' ? r.userId : '',
    planId,
    // `plan` is a tier STRING on the API payload; only keep it when it is the
    // nested plan object this type actually describes.
    plan:
      r.plan && typeof r.plan === 'object'
        ? ((r.plan as unknown) as SubscriptionPlan)
        : undefined,
    status: (typeof r.status === 'string'
      ? r.status.toLowerCase()
      : 'pending') as SubscriptionStatus,
    razorpaySubscriptionId:
      typeof r.razorpaySubscriptionId === 'string' ? r.razorpaySubscriptionId : null,
    startedAt,
    currentPeriodEnd: periodEnd,
    cancelledAt: typeof r.cancelledAt === 'string' ? r.cancelledAt : null,
  };
}

function unwrapSub(payload: unknown): MarketplaceSubscription | null {
  if (!payload) return null;
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    if (obj.subscription && typeof obj.subscription === 'object') {
      return normalizeSubscription(obj.subscription);
    }
    if (obj.data && typeof obj.data === 'object') {
      return normalizeSubscription(obj.data);
    }
    return normalizeSubscription(obj);
  }
  return null;
}

function unwrapCheckout(payload: unknown): SubscriptionCheckout | null {
  if (!payload || typeof payload !== 'object') return null;
  const outer = payload as Record<string, unknown>;
  const raw =
    outer.subscription && typeof outer.subscription === 'object'
      ? (outer.subscription as Record<string, unknown>)
      : outer;
  if (typeof raw.subscriptionId !== 'string' || raw.subscriptionId.length === 0) return null;
  return {
    subscriptionId: raw.subscriptionId,
    shortUrl: typeof raw.shortUrl === 'string' && raw.shortUrl ? raw.shortUrl : null,
    status: typeof raw.status === 'string' ? raw.status : 'created',
    isDemo: raw.subscriptionId.startsWith('sub_demo_'),
  };
}

export async function listPlans(role?: ProviderRole | string): Promise<SubscriptionPlan[]> {
  const qs = role ? `?role=${encodeURIComponent(toApiPlanRole(role))}` : '';
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/plans${qs}`, {
    cache: 'no-store',
  }, DATA_FETCH_TIMEOUT_MS);
  const json = await asJson<unknown>(res);
  return unwrapPlans(json);
}

export async function getMySubscription(
  token: string | undefined,
): Promise<MarketplaceSubscription | null> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/my`, {
    headers: authHeaders(token),
    cache: 'no-store',
  }, DATA_FETCH_TIMEOUT_MS);
  if (res.status === 404) return null;
  const json = await asJson<unknown>(res);
  return unwrapSub(json);
}

/**
 * Claim a FREE plan. No money moves, so no gateway is involved.
 *
 * PM-04 — this must not be called for a plan with a price. The endpoint it hits
 * used to write an ACTIVE MarketplaceSubscription plus a COMPLETED
 * `Transaction` for `plan.price` with no Razorpay order and no payment
 * verification anywhere between the request and the row, so calling it for a
 * paid plan provisioned that plan for ₹0 and booked the amount as collected
 * revenue. Paid plans go through `createSubscriptionCheckout` below.
 *
 * The server hole is closed: subscriptionService.subscribe() refuses a priced
 * plan without activation evidence (only the verified Razorpay webhook and the
 * assert-guarded demo branch hold it), and POST /subscriptions/subscribe
 * answers 402 rather than granting. So a paid planId reaching this function is
 * now a loud failure instead of a silent free upgrade — but it is still a
 * failure, so keep this call on the free tier.
 */
export async function subscribeToFreePlan(
  token: string | undefined,
  planId: string,
): Promise<MarketplaceSubscription | null> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ planId }),
  }, DATA_FETCH_TIMEOUT_MS);
  const json = await asJson<unknown>(res);
  return unwrapSub(json);
}

/**
 * Start a PAID subscription: POST /subscriptions/create → a real Razorpay
 * subscription id + hosted-checkout URL, and a PENDING transaction. The ACTIVE
 * row is written by the webhook after the mandate is authorised, so a
 * successful call here means "checkout is ready", never "the user has paid".
 */
export async function createSubscriptionCheckout(
  token: string | undefined,
  planId: string,
  role: ProviderRole | string,
): Promise<SubscriptionCheckout | null> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ planId, role: toApiPlanRole(String(role)) }),
  }, DATA_FETCH_TIMEOUT_MS);
  const json = await asJson<unknown>(res);
  return unwrapCheckout(json);
}

export async function cancelMySubscription(
  token: string | undefined,
): Promise<MarketplaceSubscription | null> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({}),
  }, DATA_FETCH_TIMEOUT_MS);
  const json = await asJson<unknown>(res);
  return unwrapSub(json);
}

export async function listAllSubscriptions(
  token: string | undefined,
): Promise<MarketplaceSubscription[]> {
  // Admin endpoint — returns every active subscription across providers.
  const res = await fetchWithTimeout(`${API_BASE_URL}/admin/subscriptions`, {
    headers: authHeaders(token),
    cache: 'no-store',
  }, DATA_FETCH_TIMEOUT_MS);
  const json = await asJson<unknown>(res);
  if (Array.isArray(json)) return json as MarketplaceSubscription[];
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.subscriptions)) return obj.subscriptions as MarketplaceSubscription[];
    if (Array.isArray(obj.data)) return obj.data as MarketplaceSubscription[];
  }
  return [];
}

// ─── Razorpay checkout helper ────────────────────────────────────────────
// Loads the Razorpay script once, then opens the recurring-subscription
// checkout. No-op (returns false) in non-browser environments.

declare global {
  interface Window {
    Razorpay?: new (opts: unknown) => { open: () => void };
  }
}

let razorpayLoadPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayLoadPromise) return razorpayLoadPromise;
  razorpayLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayLoadPromise;
}

export interface OpenCheckoutOptions {
  keyId: string;
  subscriptionId: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess?: (paymentId: string) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(opts: OpenCheckoutOptions): Promise<boolean> {
  const ok = await loadRazorpayScript();
  if (!ok || typeof window === 'undefined' || !window.Razorpay) return false;

  const rzp = new window.Razorpay({
    key: opts.keyId,
    subscription_id: opts.subscriptionId,
    name: opts.name ?? 'Darshya',
    description: opts.description ?? 'Marketplace subscription',
    prefill: opts.prefill,
    handler: (resp: { razorpay_payment_id: string }) => {
      opts.onSuccess?.(resp.razorpay_payment_id);
    },
    modal: {
      ondismiss: () => opts.onDismiss?.(),
    },
    theme: { color: '#D4A438' },
  });
  rzp.open();
  return true;
}
