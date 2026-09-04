/**
 * AUTH-06 — the `reauth` flag reaches the screen.
 *
 * `friendlyApiError` has returned `{ message, reauth }` since P1 #208. Six
 * pages called it and read ONLY `.message`, so a session that died mid-action
 * rendered "Your session has expired. Please sign in again to continue." with
 * no way to sign in — and, on the pages that have one, next to a Retry button
 * that re-fires the request which just 401'd. The one control on screen was the
 * one control that could not work, and it looked like the way out.
 *
 * app/admin/leads was fixed with the component. This file covers the other five:
 *
 *   app/admin/ratings   text-only error box
 *   app/store/orders    text-only error box
 *   app/bookings        error box WITH a Retry button — the important one,
 *                       because the prompt must REPLACE Retry, not sit beside it
 *   app/store/checkout  the highest-intent moment in the funnel: a 401 on
 *                       "Place Order" left the buyer staring at one line of red
 *                       text with the cart intact and no route back in
 *   app/bookings/view   TWO surfaces, added 2026-09-01 — see the block at the
 *                       bottom. This one was named in the finding, described in
 *                       ReauthPrompt's own docblock, and then left out of both
 *                       the fix and this list, which is how it survived.
 *
 * What is asserted is the affordance, not the wording: a link to /auth/login
 * that carries the current path as `redirect`, so the user comes back where
 * they were. `ReauthPrompt` sanitises that through `reauthLoginHref`.
 *
 * Each test also pins the NEGATIVE case — a non-auth failure (a 500, a dropped
 * connection) must still get the ordinary error box and, on /bookings, must
 * still get Retry. Retry is right for those; it is only wrong for a 401.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const authState = {
  session: { accessToken: 'live-token' } as { accessToken: string } | null,
  user: { id: 'u1', role: 'admin', fullName: 'Admin' } as unknown,
  isAuthenticated: true,
  isLoading: false,
};

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>('../lib/auth-context');
  return { ...actual, useAuth: () => authState };
});

let pathname = '/bookings';
let search = '';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

const CART_PRODUCT = {
  id: 'p1',
  handle: 'rudraksha-mala',
  title: 'Rudraksha Mala',
  price: 999,
  compareAtPrice: null,
  image: null,
  category: 'malas',
  inStock: true,
  freeDelivery: true,
};

vi.mock('../components/CartContext', async () => {
  const actual = await vi.importActual<typeof import('../components/CartContext')>(
    '../components/CartContext',
  );
  return {
    ...actual,
    useCart: () => ({
      items: [{ id: 'ci1', product: CART_PRODUCT, quantity: 1 }],
      itemCount: 1,
      subtotal: 999,
      deliveryFee: 0,
      total: 999,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      isOpen: false,
      openCart: vi.fn(),
      closeCart: vi.fn(),
      toggleCart: vi.fn(),
    }),
  };
});

import AdminRatingsPage from '../app/admin/ratings/page';
import StoreOrdersPage from '../app/store/orders/page';
import BookingsPage from '../app/bookings/page';
import StoreCheckoutPage from '../app/store/checkout/page';
import BookingDetailPage from '../app/bookings/view/page';

const realFetch = globalThis.fetch;

/** A response the page turns into an Error whose text carries the status. */
function statusOnly(status: number) {
  return vi.fn(async () =>
    Promise.resolve({
      ok: false,
      status,
      text: async () => '',
      json: async () => ({ error: 'nope' }),
    } as unknown as Response),
  );
}

function withQueryClient(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

/** The affordance: a link into /auth/login carrying this page as `redirect`. */
function reauthLink(): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>('a[href^="/auth/login"]');
}

beforeEach(() => {
  authState.session = { accessToken: 'live-token' };
  authState.isAuthenticated = true;
  authState.isLoading = false;
  search = '';
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('AUTH-06 — app/admin/ratings', () => {
  beforeEach(() => {
    pathname = '/admin/ratings';
  });

  it('offers a way to sign in again when the list 401s', async () => {
    globalThis.fetch = statusOnly(401) as unknown as typeof fetch;

    render(<AdminRatingsPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/admin/ratings'),
    );
  });

  it('does NOT offer it for an ordinary server failure', async () => {
    globalThis.fetch = statusOnly(500) as unknown as typeof fetch;

    render(<AdminRatingsPage />);

    await waitFor(() =>
      expect(screen.getByText(/something went wrong on our side/i)).toBeTruthy(),
    );
    expect(reauthLink()).toBeNull();
  });
});

describe('AUTH-06 — app/store/orders', () => {
  beforeEach(() => {
    pathname = '/store/orders';
  });

  it('offers a way to sign in again when the order list 401s', async () => {
    globalThis.fetch = statusOnly(401) as unknown as typeof fetch;

    render(<StoreOrdersPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/store/orders'),
    );
  });

  it('does NOT offer it for an ordinary server failure', async () => {
    globalThis.fetch = statusOnly(500) as unknown as typeof fetch;

    render(<StoreOrdersPage />);

    await waitFor(() =>
      expect(screen.getByText(/something went wrong on our side/i)).toBeTruthy(),
    );
    expect(reauthLink()).toBeNull();
  });
});

describe('AUTH-06 — app/bookings replaces Retry rather than joining it', () => {
  beforeEach(() => {
    pathname = '/bookings';
  });

  it('shows the sign-in link and REMOVES Retry on a 401', async () => {
    globalThis.fetch = statusOnly(401) as unknown as typeof fetch;

    render(withQueryClient(<BookingsPage />));

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/bookings'),
    );
    expect(
      screen.queryByRole('button', { name: /retry/i }),
      'Retry re-fires the request that just 401d — offering it beside "sign in ' +
        'again" makes the useless control the obvious one',
    ).toBeNull();
  });

  it('keeps Retry for a failure retrying can actually fix', async () => {
    globalThis.fetch = statusOnly(503) as unknown as typeof fetch;

    render(withQueryClient(<BookingsPage />));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy(),
    );
    expect(reauthLink()).toBeNull();
  });
});

describe('AUTH-06 — app/store/checkout', () => {
  beforeEach(() => {
    pathname = '/store/checkout';
  });

  /**
   * One saved address so the Place Order button is enabled, then whatever the
   * caller wants POST /store/orders to answer.
   */
  function checkoutFetch(orderStatus: number) {
    return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      if (url.includes('/users/me/addresses')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            addresses: [
              {
                id: 'addr-1',
                label: 'Home',
                line1: '12 Temple Road',
                line2: null,
                city: 'Gurugram',
                state: 'Haryana',
                pincode: '122001',
                isDefault: true,
              },
            ],
          }),
        } as unknown as Response;
      }
      if (url.endsWith('/store/orders') && init.method === 'POST') {
        return {
          ok: false,
          status: orderStatus,
          text: async () => '',
          json: async () => ({}),
        } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as unknown as Response;
    });
  }

  async function placeOrder() {
    render(<StoreCheckoutPage />);
    const button = await screen.findByRole('button', { name: /place order/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
  }

  it('offers a way to sign in again when placing the order 401s', async () => {
    globalThis.fetch = checkoutFetch(401) as unknown as typeof fetch;

    await placeOrder();

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/store/checkout'),
    );
  });

  it('does NOT offer it for an ordinary server failure', async () => {
    globalThis.fetch = checkoutFetch(500) as unknown as typeof fetch;

    await placeOrder();

    await waitFor(() =>
      expect(screen.getByText(/something went wrong on our side/i)).toBeTruthy(),
    );
    expect(reauthLink()).toBeNull();
  });
});

/**
 * AUTH-06 (2026-09-01) — the SIXTH page, and the one the list above quietly
 * dropped. The header of this file names six pages and then covers four of
 * them; app/admin/leads is covered by __tests__/auth06-load-error-reauth.ts,
 * which left app/bookings/view untested and, as it turned out, unfixed. It has
 * TWO 401 surfaces, not one:
 *
 *  - the LOAD. Its own copy is "Your session has expired. Please sign in again
 *    to view this booking.", printed under two controls: "View All Bookings",
 *    which is the same API and the same dead token, and "Contact Support".
 *  - the REFUND. "Confirm refund" 401s, the panel prints the reason, and the
 *    only control is the button that just failed.
 */
describe('AUTH-06 — app/bookings/view, both of its 401 surfaces', () => {
  const IN_THREE_DAYS = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    pathname = '/bookings/view';
    search = 'id=BS-20260901-ABCDE';
  });

  it('offers a way to sign in again when the booking load 401s', async () => {
    globalThis.fetch = statusOnly(401) as unknown as typeof fetch;

    render(<BookingDetailPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/bookings/view'),
    );
    // and the dead-end primary is gone: /bookings reads the same API with the
    // same expired token.
    expect(screen.queryByRole('link', { name: /view all bookings/i })).toBeNull();
  });

  it('keeps "View All Bookings" when the booking is merely missing', async () => {
    globalThis.fetch = statusOnly(404) as unknown as typeof fetch;

    render(<BookingDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /view all bookings/i })).toBeTruthy(),
    );
    expect(reauthLink()).toBeNull();
  });

  /** A loadable, refundable booking; POST request-refund answers `status`. */
  function refundFetch(status: number) {
    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/request-refund')) {
        return {
          ok: status < 400,
          status,
          text: async () => '',
          json: async () => ({}),
        } as unknown as Response;
      }
      if (url.includes('/cancel-quote')) {
        return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          booking: {
            id: 'b-1',
            bookingNumber: 'BS-20260901-ABCDE',
            status: 'confirmed',
            scheduledDate: IN_THREE_DAYS,
            temple: { name: 'Test Temple', slug: 't', city: 'Gurugram', state: 'Haryana' },
            payments: [],
          },
        }),
        text: async () => '',
      } as unknown as Response;
    });
  }

  async function requestRefund() {
    render(<BookingDetailPage />);
    const open = await screen.findByRole('button', { name: /request cancellation/i });
    fireEvent.click(open);
    const confirm = await screen.findByRole('button', { name: /confirm refund/i });
    await waitFor(() => expect(confirm).not.toBeDisabled());
    fireEvent.click(confirm);
  }

  it('offers a way to sign in again when the refund request 401s, and drops Confirm', async () => {
    globalThis.fetch = refundFetch(401) as unknown as typeof fetch;

    await requestRefund();

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/bookings/view'),
    );
    expect(
      screen.queryByRole('button', { name: /confirm refund/i }),
      'Confirm refund re-fires the request that just 401d',
    ).toBeNull();
  });

  it('shows an ordinary refund failure in the panel and keeps Confirm', async () => {
    // Also the regression guard for the panel closing itself: `finally` used to
    // run setShowRefundConfirm(false) on every path, so the message RES-09 added
    // was set and then unmounted in the same tick and never reached a screen.
    globalThis.fetch = refundFetch(500) as unknown as typeof fetch;

    await requestRefund();

    await waitFor(() =>
      expect(screen.getByText(/something went wrong on our side/i)).toBeTruthy(),
    );
    expect(screen.getByRole('button', { name: /confirm refund/i })).toBeTruthy();
    expect(reauthLink()).toBeNull();
  });
});
