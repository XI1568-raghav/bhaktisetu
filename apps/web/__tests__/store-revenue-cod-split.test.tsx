import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

/**
 * Unpaid cash-on-delivery orders count as sales but never produce a commission
 * or platform payout. The store revenue page must not present them as money the
 * platform will pay: it splits online-paid sales from COD sales collected by
 * the owner.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Store Owner', email: 's@x.test' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

import StoreRevenuePage from '../app/store-admin/revenue/page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubRevenue(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => body })),
  );
}

describe('/store-admin/revenue splits online-paid from cash-on-delivery', () => {
  it('shows both labelled sections with their amounts', async () => {
    stubRevenue({
      topProducts: [],
      totals: { todayInr: 1000, monthInr: 4000, yearInr: 9000 },
      onlinePaid: { todayInr: 500, monthInr: 1500, yearInr: 6000 },
      cashOnDelivery: { todayInr: 500, monthInr: 2500, yearInr: 3000 },
    });
    render(<StoreRevenuePage />);
    await screen.findByText('Online-paid sales');
    expect(screen.getByText('Cash-on-delivery sales (collected by you)')).toBeTruthy();
    expect(screen.getByText('₹6,000')).toBeTruthy();
    expect(screen.getByText('₹3,000')).toBeTruthy();
    expect(screen.getByText(/only online-paid sales are paid out/i)).toBeTruthy();
  });

  it('still renders against an older API without the split fields', async () => {
    stubRevenue({ topProducts: [], totals: { todayInr: 1, monthInr: 2, yearInr: 3 } });
    render(<StoreRevenuePage />);
    await waitFor(() => expect(screen.getByText('This Year')).toBeTruthy());
    expect(screen.queryByText('Online-paid sales')).toBeNull();
  });
});
