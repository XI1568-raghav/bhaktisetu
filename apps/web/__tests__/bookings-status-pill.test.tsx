/**
 * DB-02 (prod sweep 2026-08-12, P1) — the raw Prisma enum leaked onto the
 * status pill of My Bookings.
 *
 * The Prisma enum has 9 values (apps/api/prisma/schema.prisma — pending_payment,
 * confirmed, priest_assigned, in_progress, completed, video_uploaded, delivered,
 * cancelled, refunded). `getStatusConfig` in apps/web/app/bookings/page.tsx
 * mapped only 7 of them, was missing `pending_payment`, `confirmed` and
 * `refunded`, and carried a dead `booked` key that is not a valid enum value at
 * all. Its fallback is `{ label: status }` — print the raw enum.
 *
 * So the first screen a customer sees after paying (the success screen's "View
 * Booking" CTA links straight to /bookings) greeted their brand-new order with a
 * grey lowercase `confirmed`, and any abandoned attempts with literal
 * `pending_payment`, underscore and all. `confirmed` is the status a booking
 * gets the instant payment verifies (apps/api/src/services/payment.service.ts
 * `data: { status: 'confirmed' }`).
 *
 * The sibling detail page already did this correctly
 * (apps/web/app/bookings/view/page.tsx getStatusBadge), which is where the
 * labels asserted here come from — the two surfaces must agree.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', role: 'devotee' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import BookingsPage from '../app/bookings/page';

vi.setConfig({ testTimeout: 45_000 });

/** Every value of the shipped Prisma `BookingStatus` enum, with the label the
 *  customer must actually see. Sourced from the detail page's getStatusBadge. */
const ENUM_TO_LABEL: Array<[string, string]> = [
  ['pending_payment', 'Payment Pending'],
  ['confirmed', 'Confirmed'],
  ['priest_assigned', 'Priest Assigned'],
  ['in_progress', 'In Progress'],
  ['completed', 'Completed'],
  ['video_uploaded', 'Video Ready'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
  ['refunded', 'Refunded'],
];

function apiBooking(n: number, status: string) {
  return {
    id: `b${n}`,
    bookingNumber: `BS-20260812-${String(n).padStart(5, '0')}`,
    status,
    // Far future so the row is never filtered by any date logic.
    scheduledDate: '2027-09-12T00:00:00.000Z',
    scheduledTimeSlot: '07:00',
    priceAmount: '1100.00',
    videoProofUrl: null,
    createdAt: '2026-08-12T00:00:00.000Z',
    temple: { name: `Temple ${n}`, city: 'Varanasi' },
    pujaType: { name: `Puja ${n}` },
  };
}

function mockApi() {
  const rows = ENUM_TO_LABEL.map(([status], i) => apiBooking(i + 1, status));
  const payload = {
    bookings: rows,
    total: rows.length,
    page: 1,
    limit: 20,
    totalPages: 1,
    counts: { all: rows.length, upcoming: 2, completed: 3, cancelled: 1 },
  };
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }) as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BookingsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DB-02 — no raw database enum ever reaches the status pill', () => {
  it('renders a human label for every one of the 9 shipped enum values', async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByText('Puja 1');

    for (const [status, label] of ENUM_TO_LABEL) {
      expect(
        screen.queryAllByText(label).length,
        `status "${status}" should render the pill "${label}"`,
      ).toBeGreaterThan(0);
    }

    // And the raw enum must appear nowhere on the page. This is the assertion
    // that fails pre-fix: `pending_payment` and `confirmed` were printed
    // verbatim by the `{ label: status }` fallback.
    const text = container.textContent ?? '';
    for (const [status] of ENUM_TO_LABEL) {
      expect(text, `raw enum "${status}" leaked to the customer`).not.toContain(status);
    }
  });

  it('a just-paid booking reads "Confirmed", not the lowercase enum', async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByText('Puja 1');

    expect(screen.queryAllByText('Confirmed').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toContain('confirmed');
  });

  it('an unpaid booking reads "Payment Pending", not "pending_payment"', async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByText('Puja 1');

    expect(screen.queryAllByText('Payment Pending').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toContain('pending_payment');
  });
});
