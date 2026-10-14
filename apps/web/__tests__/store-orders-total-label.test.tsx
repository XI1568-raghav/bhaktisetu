import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>('../lib/auth-context');
  return {
    ...actual,
    useAuth: () => ({
      session: { accessToken: 't' },
      user: { id: 'u1', role: 'devotee', fullName: 'D' },
      isAuthenticated: true,
      isLoading: false,
    }),
  };
});
vi.mock('next/navigation', () => ({
  usePathname: () => '/store/orders',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

import StoreOrdersPage from '../app/store/orders/page';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const order = (id: string, status: string, paymentStatus: string | null) => ({
  id,
  orderNumber: `ORD-${id}`,
  status,
  createdAt: '2026-10-01T00:00:00Z',
  totalAmount: 169,
  subtotalInr: 120,
  deliveryFeeInr: 49,
  paymentStatus,
  items: [{ productId: 'p', name: 'Diya', quantity: 1, priceAtPurchase: 120 }],
});

describe('store orders total label follows paymentStatus', () => {
  it('says Total paid only when money was captured; otherwise not paid online / pending', async () => {
    const data = [
      order('A', 'CONFIRMED', 'captured'),
      order('B', 'PENDING', null),
      order('C', 'PENDING', 'initiated'),
    ];
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data }) }) as unknown as Response) as unknown as typeof fetch;
    render(<StoreOrdersPage />);
    await waitFor(() => expect(screen.getAllByTestId('order-total-label')).toHaveLength(3));
    const labels = screen.getAllByTestId('order-total-label').map((e) => e.textContent);
    expect(labels).toEqual(['Total paid', 'Total (not paid online)', 'Total (payment pending)']);
  });
});
