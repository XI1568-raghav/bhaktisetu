/**
 * PM-04 (prod sweep 2026-08-12, AREA pricing-market) — the web half.
 *
 * The sweep found that POST /subscriptions/subscribe provisions a paid plan for
 * ₹0: it writes an ACTIVE MarketplaceSubscription plus a COMPLETED
 * `Transaction` for `plan.price` with no Razorpay order, no signature check and
 * no payment gate (apps/api/src/routes/subscriptions.ts:37-57 →
 * subscription.service.ts:256-307). Closing that hole is an apps/api change.
 *
 * What is fixable on the web — and what these tests pin — is that
 * SubscriptionPanel was wired to that endpoint at all, and then reported
 * success from its answer. Three separate contract breaks, each one side
 * shipped and the other left behind:
 *
 *  1. THE PAID RAIL WAS NEVER CALLED. apps/api exposes
 *     POST /subscriptions/create → createRazorpaySubscription(), which refuses
 *     free plans, creates a real Razorpay subscription and records a PENDING
 *     transaction — activation arriving later by webhook. The panel called
 *     /subscribe instead, the free-grant path. So the one endpoint that can
 *     take money was unreachable from the product.
 *
 *  2. SUCCESS WAS CLAIMED WITHOUT PAYMENT. /subscribe answers
 *     `{ message, subscription }` and carries no `keyId`, no
 *     `razorpaySubscriptionId` and no `shortUrl`. The panel's
 *     `if (resp.keyId && resp.razorpaySubscriptionId)` guard therefore never
 *     fired, no checkout ever opened — and `setCurrent(resp.subscription)` on
 *     the line above had already rendered a "Current plan" card. A pandit saw
 *     Pandit Pro confirmed having paid nothing.
 *
 *  3. THE FIELD NAMES DID NOT MATCH IN EITHER DIRECTION. The API sends
 *     `{ plan: 'PRO', startDate, endDate, status: 'ACTIVE' }`; the panel reads
 *     `planId`, `startedAt`, `currentPeriodEnd` and compares
 *     `status === 'active'` lowercase. Consequences on the live panel, for
 *     GET /my as much as for subscribe: the plan name rendered EMPTY, the start
 *     date rendered "—", and — because 'ACTIVE' !== 'active' — the Cancel plan
 *     button never rendered at all, so a subscriber could not cancel.
 *
 * Note for whoever closes the server hole: subscribe() also has a catch-all
 * `catch { ... mockSubscriptions.set(...) }` at subscription.service.ts:319-330
 * that returns a fabricated `sub-<timestamp>` with status ACTIVE when the
 * database write throws. That is a second, separate "claim success on error"
 * defect and it is NOT addressed here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { fullName: 'Test Pandit', email: 'pandit@demo.com', phone: '9999999999' },
  }),
}));

import { SubscriptionPanel } from '../components/SubscriptionPanel';
import { normalizeSubscription, getMySubscription } from '../lib/subscription-api';

/** Verbatim GET /api/v1/subscriptions/plans row for a paid pandit plan. */
const PAID_PLAN = {
  id: 'plan-pandit-pro',
  name: 'Pandit Pro',
  plan: 'PRO',
  roles: ['PANDIT'],
  price: 2999,
  currency: 'INR',
  interval: 'month',
  features: ['Unlimited bookings'],
  popular: false,
};

const FREE_PLAN = {
  id: 'plan-pandit-free',
  name: 'Pandit Starter',
  plan: 'FREE',
  roles: ['PANDIT'],
  price: 0,
  currency: 'INR',
  interval: 'forever',
  features: ['5 bookings/month'],
  popular: false,
};

/** Verbatim SubscriptionResult, as /subscribe and /my both return it. */
const API_SUBSCRIPTION = {
  id: 'sub-1',
  userId: 'u-1',
  plan: 'PRO',
  role: 'PANDIT',
  startDate: '2026-08-01T00:00:00.000Z',
  endDate: '2026-09-01T00:00:00.000Z',
  amount: 2999,
  status: 'ACTIVE',
};

function json(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** Route a stubbed fetch by URL so each test states its own server. */
function routeFetch(handlers: Record<string, unknown>) {
  const spy = vi.fn(async (url: string) => {
    for (const [needle, body] of Object.entries(handlers)) {
      if (url.includes(needle)) return json(body);
    }
    return json({ error: `unrouted ${url}` }, { ok: false, status: 404 });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const calledPaths = (spy: ReturnType<typeof vi.fn>): string[] =>
  spy.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PM-04 — normalizeSubscription reconciles the two field vocabularies', () => {
  it('maps plan/startDate/endDate/ACTIVE onto what the panel reads', () => {
    const sub = normalizeSubscription(API_SUBSCRIPTION);
    expect(sub).not.toBeNull();
    expect(sub!.planId).toBe('PRO');
    expect(sub!.status).toBe('active');
    expect(sub!.startedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(sub!.currentPeriodEnd).toBe('2026-09-01T00:00:00.000Z');
  });

  it('keeps a payload that already uses the web names', () => {
    const sub = normalizeSubscription({
      id: 'sub-2',
      userId: 'u-1',
      planId: 'plan-pandit-pro',
      status: 'active',
      startedAt: '2026-08-01T00:00:00.000Z',
      currentPeriodEnd: null,
    });
    expect(sub!.planId).toBe('plan-pandit-pro');
    expect(sub!.status).toBe('active');
  });

  it('returns null rather than a half-built object', () => {
    expect(normalizeSubscription(null)).toBeNull();
    expect(normalizeSubscription({ status: 'ACTIVE' })).toBeNull();
  });

  it('getMySubscription normalises what GET /my actually sends', async () => {
    routeFetch({ '/subscriptions/my': { subscription: API_SUBSCRIPTION } });
    const sub = await getMySubscription('test-token');
    expect(sub?.status).toBe('active');
    expect(sub?.startedAt).toBe('2026-08-01T00:00:00.000Z');
  });
});

describe('PM-04 — an ACTIVE subscription is cancellable', () => {
  it('renders the plan name and a Cancel button for the live payload', async () => {
    routeFetch({
      '/subscriptions/plans': { plans: [FREE_PLAN, PAID_PLAN] },
      '/subscriptions/my': { subscription: API_SUBSCRIPTION },
    });
    render(<SubscriptionPanel role="priest" />);
    // The plan name must not render empty — the heading carries it.
    const heading = await screen.findByRole('heading', { name: /Current plan:\s*\S+/i });
    expect(heading.textContent).toMatch(/Current plan:\s*PRO/i);
    // 'ACTIVE' from the server must still satisfy the panel's 'active' gate.
    expect(screen.getByRole('button', { name: /cancel plan/i })).toBeTruthy();
    // And the tier match must disable Subscribe on the plan already held.
    expect(
      (screen.getByRole('button', { name: /^current plan$/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe('PM-04 — paid plans go through the payment rail', () => {
  it('subscribing to a ₹2,999 plan calls /subscriptions/create, not /subscribe', async () => {
    const spy = routeFetch({
      '/subscriptions/plans': { plans: [PAID_PLAN] },
      '/subscriptions/my': { subscription: null },
      '/subscriptions/create': {
        subscription: { subscriptionId: 'sub_live_123', shortUrl: 'https://rzp.io/i/abc', status: 'created' },
      },
    });
    render(<SubscriptionPanel role="priest" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^subscribe$/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }));

    await waitFor(() => {
      expect(calledPaths(spy).some((u) => u.includes('/subscriptions/create'))).toBe(true);
    });
    expect(calledPaths(spy).some((u) => u.includes('/subscriptions/subscribe'))).toBe(false);
  });

  it('a free plan still uses /subscribe — no money, no gateway', async () => {
    const spy = routeFetch({
      '/subscriptions/plans': { plans: [FREE_PLAN] },
      '/subscriptions/my': { subscription: null },
      '/subscriptions/subscribe': { subscription: { ...API_SUBSCRIPTION, plan: 'FREE', amount: 0 } },
    });
    render(<SubscriptionPanel role="priest" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^subscribe$/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }));

    await waitFor(() => {
      expect(calledPaths(spy).some((u) => u.includes('/subscriptions/subscribe'))).toBe(true);
    });
    expect(calledPaths(spy).some((u) => u.includes('/subscriptions/create'))).toBe(false);
  });
});

describe('PM-04 — no success claimed without a payment handle', () => {
  it('shows an error and NO current-plan card when the gateway returns nothing usable', async () => {
    routeFetch({
      '/subscriptions/plans': { plans: [PAID_PLAN] },
      '/subscriptions/my': { subscription: null },
      // Demo/misconfigured gateway: an id that is not a real Razorpay
      // subscription and no checkout URL to send the buyer to.
      '/subscriptions/create': {
        subscription: { subscriptionId: 'sub_demo_1755000000', shortUrl: null, status: 'created' },
      },
    });
    render(<SubscriptionPanel role="priest" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^subscribe$/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('subscription-action-error')).toBeTruthy();
    });
    expect(screen.queryByText(/Current plan/i)).toBeNull();
  });

  it('does not mark the plan current on the strength of the create call alone', async () => {
    routeFetch({
      '/subscriptions/plans': { plans: [PAID_PLAN] },
      '/subscriptions/my': { subscription: null },
      '/subscriptions/create': {
        subscription: { subscriptionId: 'sub_live_123', shortUrl: 'https://rzp.io/i/abc', status: 'created' },
      },
    });
    // Razorpay's script never loads in the test environment, so the panel takes
    // its shortUrl fallback. Either way the plan is only PENDING payment.
    vi.stubGlobal('open', vi.fn());
    render(<SubscriptionPanel role="priest" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^subscribe$/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('subscription-pending-payment')).toBeTruthy();
    });
    expect(screen.queryByText(/Current plan/i)).toBeNull();
  });
});
