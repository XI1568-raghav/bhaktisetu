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
import { API_BASE_URL } from './api-config';

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
  commissionOverride: number;
  maxListings: number | null;
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
  subscription: MarketplaceSubscription;
  razorpaySubscriptionId: string;
  shortUrl?: string | null;
  keyId?: string | null;
  amount?: number | null;
  currency?: string | null;
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

function unwrapPlans(payload: unknown): SubscriptionPlan[] {
  if (Array.isArray(payload)) return payload as SubscriptionPlan[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.plans)) return obj.plans as SubscriptionPlan[];
    if (Array.isArray(obj.data)) return obj.data as SubscriptionPlan[];
  }
  return [];
}

function unwrapSub(payload: unknown): MarketplaceSubscription | null {
  if (!payload) return null;
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    if (obj.subscription && typeof obj.subscription === 'object') {
      return obj.subscription as MarketplaceSubscription;
    }
    if (obj.data && typeof obj.data === 'object') {
      return obj.data as MarketplaceSubscription;
    }
    if ('id' in obj && 'planId' in obj) {
      return obj as unknown as MarketplaceSubscription;
    }
  }
  return null;
}

export async function listPlans(role?: ProviderRole | string): Promise<SubscriptionPlan[]> {
  const qs = role ? `?role=${encodeURIComponent(role)}` : '';
  const res = await fetch(`${API_BASE_URL}/subscriptions/plans${qs}`, {
    cache: 'no-store',
  });
  const json = await asJson<unknown>(res);
  return unwrapPlans(json);
}

export async function getMySubscription(
  token: string | undefined,
): Promise<MarketplaceSubscription | null> {
  const res = await fetch(`${API_BASE_URL}/subscriptions/my`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  const json = await asJson<unknown>(res);
  return unwrapSub(json);
}

export async function subscribeToPlan(
  token: string | undefined,
  planId: string,
): Promise<SubscribeResponse> {
  const res = await fetch(`${API_BASE_URL}/subscriptions/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ planId }),
  });
  return asJson<SubscribeResponse>(res);
}

export async function cancelMySubscription(
  token: string | undefined,
): Promise<MarketplaceSubscription | null> {
  const res = await fetch(`${API_BASE_URL}/subscriptions/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({}),
  });
  const json = await asJson<unknown>(res);
  return unwrapSub(json);
}

export async function listAllSubscriptions(
  token: string | undefined,
): Promise<MarketplaceSubscription[]> {
  // Admin endpoint — returns every active subscription across providers.
  const res = await fetch(`${API_BASE_URL}/admin/subscriptions`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
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
