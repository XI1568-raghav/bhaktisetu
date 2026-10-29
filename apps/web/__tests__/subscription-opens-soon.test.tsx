import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

/**
 * 2026-10-29: no RAZORPAY_PLAN_* variable is set on prod, so Subscribe on every
 * paid plan could only end in an error. The plans API now says per plan whether
 * it can be bought (`purchasable`), and the panel shows a disabled "Opens soon"
 * with a short note instead. Free plans and the current plan are untouched, and
 * no env var name ever reaches the page.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 't' }, user: { fullName: 'P', email: 'p@x.test', phone: '1' } }),
}));

import { SubscriptionPanel } from '../components/SubscriptionPanel';
import { normalizePlan } from '../lib/subscription-api';

const row = (over: Record<string, unknown>) => ({
  id: 'plan-pandit-pro', name: 'Pandit Pro', plan: 'PRO', roles: ['PANDIT'], price: 2999,
  currency: 'INR', interval: 'month', features: ['x'], popular: false, ...over,
});
const FREE = row({ id: 'plan-pandit-free', name: 'Pandit Starter', plan: 'FREE', price: 0, purchasable: true });

function serve(plans: unknown[]) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/subscriptions/plans')) return new Response(JSON.stringify({ plans }), { status: 200 });
    return new Response(JSON.stringify({ subscription: null }), { status: 200 });
  });
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('normalizePlan', () => {
  it('only an explicit false marks a plan as not purchasable', () => {
    expect(normalizePlan(row({ purchasable: false }))?.purchasable).toBe(false);
    expect(normalizePlan(row({ purchasable: true }))?.purchasable).toBe(true);
    expect(normalizePlan(row({}))?.purchasable).toBe(true);
  });
});

describe('SubscriptionPanel with a paid plan that cannot be bought yet', () => {
  it('shows a disabled "Opens soon" and a note, and keeps Free subscribable', async () => {
    serve([FREE, row({ purchasable: false })]);
    render(<SubscriptionPanel role="priest" description="d" />);
    const soon = await screen.findByRole('button', { name: 'Opens soon' });
    expect((soon as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('plan-opens-soon-note').textContent).toMatch(/not open yet/i);
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeNull(); // the free plan
    await waitFor(() => expect(document.body.textContent).not.toMatch(/RAZORPAY|PLAN_/));
  });

  it('a purchasable paid plan keeps its Subscribe button', async () => {
    serve([row({ purchasable: true })]);
    render(<SubscriptionPanel role="priest" description="d" />);
    const btn = await screen.findByRole('button', { name: 'Subscribe' });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText('Opens soon')).toBeNull();
  });
});
