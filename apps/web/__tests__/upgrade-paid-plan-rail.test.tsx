import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * PM-04 (prod sweep 2026-08-12) — the /upgrade half.
 *
 * The devotee upgrade page picked its endpoint by CADENCE, not by price:
 *
 *     const isAutoRenew = planId === 'astro_monthly';
 *     const endpoint = isAutoRenew ? '/subscriptions/create'
 *                                  : '/subscriptions/subscribe';
 *
 * So "Single Session" (₹99) and "NRI Premium" (₹5,000) both POSTed
 * /subscriptions/subscribe — the endpoint that writes an ACTIVE
 * MarketplaceSubscription plus a COMPLETED ₹-transaction with no Razorpay
 * order, no signature check and no payment gate between the click and the row.
 * Two of the three paid cards on this page provisioned themselves for ₹0, and
 * admin revenue reporting counted the amounts as earned.
 *
 * The rule is now price-based: anything that costs money goes to the rail that
 * can take money. The server enforces the same split (402 from /subscribe for a
 * priced plan, subscriptions.paid-gate.test.ts), so this is the client side of
 * one contract rather than the only guard.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee', email: 'd@x.test' },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode } ) => <>{children}</>,
}));

function json(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function stubFetch() {
  const spy = vi.fn(async () =>
    json({ subscription: { subscriptionId: 'sub_x', shortUrl: null, status: 'created' } }),
  );
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

async function renderUpgrade() {
  const { default: UpgradePage } = await import('../app/upgrade/page');
  render(<UpgradePage />);
}

describe('PM-04 — /upgrade never provisions a priced plan through the free-grant endpoint', () => {
  it('sends the ₹99 single-session pass to the paid rail, not /subscribe', async () => {
    const spy = stubFetch();
    await renderUpgrade();

    fireEvent.click(screen.getByRole('button', { name: /get session/i }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const paths = calledPaths(spy);
    expect(paths.some((u) => u.includes('/subscriptions/create'))).toBe(true);
    expect(paths.some((u) => u.includes('/subscriptions/subscribe'))).toBe(false);
  });

  /**
   * REWRITTEN 2026-08-23, and the rewrite is the point.
   *
   * This case used to click "Go Premium" and assert the Rs 5,000 NRI annual plan
   * reached /subscriptions/create rather than the free-grant endpoint. That
   * button no longer exists: TC-03/TC-04 WITHDREW the plan, because all six of
   * its advertised benefits were ungated — the entitlement hook existed and
   * nothing consulted it, so the subscription sold access every visitor already
   * had. Withdrawing it was the honest fix; building six gates to justify a
   * price nobody had paid yet was not.
   *
   * So the original assertion is unreachable, and deleting it would quietly drop
   * PM-04's protection on this plan. Instead it inverts: the plan must not be
   * SOLD at all while it is withdrawn, and the day it returns it must come back
   * through the paid rail — which the sibling cases below still enforce for the
   * plans that are live.
   */
  it('does not sell the withdrawn Rs 5,000 NRI annual plan at all', async () => {
    const spy = stubFetch();
    await renderUpgrade();

    expect(screen.queryByRole('button', { name: /go premium/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/5,000|nri premium/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it('still sends the ₹499 monthly plan to the paid rail', async () => {
    const spy = stubFetch();
    await renderUpgrade();

    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(calledPaths(spy).some((u) => u.includes('/subscriptions/create'))).toBe(true);
  });
});
