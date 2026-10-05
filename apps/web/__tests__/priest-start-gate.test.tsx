/**
 * A pandit could press Start days before the puja, which made the earning
 * payable for a puja that had not happened. The API now refuses with a 409
 * naming when Start unlocks; the page shows that same sentence and disables the
 * button instead of letting the click fail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/priest/bookings/view',
  useSearchParams: () => new URLSearchParams({ id: 'bk-1' }),
}));
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));
vi.mock('../components/provider/VideoProofUpload', () => ({ default: () => null }));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));

import PriestBookingDetailPage from '../app/priest/bookings/view/page';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
beforeEach(() => vi.clearAllMocks());

function booking(over: Record<string, unknown>) {
  return {
    id: 'bk-1', bookingNumber: 'BS-1', status: 'priest_assigned',
    scheduledDate: '2999-01-01T00:00:00.000Z', scheduledTimeSlot: '18:00',
    priceAmount: 1100, platformCommission: 330, priestPayout: 770, currency: 'INR',
    devoteeNames: [{ name: 'Ramesh' }], sankalpDetails: null, specialInstructions: null,
    videoProofUrl: null, videoUploadedAt: null, rating: null, reviewText: null,
    createdAt: '2026-08-12T00:00:00.000Z',
    temple: { id: 't1', name: 'T', city: 'C', state: 'S' },
    pujaType: { id: 'p1', name: 'P', durationMinutes: 60, description: 'x' },
    user: { fullName: 'Ramesh', phone: '+919876543210' },
    ...over,
  };
}

function serve(b: Record<string, unknown>) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ booking: b }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ) as unknown as typeof fetch;
}

describe('pandit Start Puja time gate', () => {
  it('disables Start and shows the server sentence while it is locked', async () => {
    const msg = 'You can start this puja from 4:00 PM IST on 1 Jan 2999, 2 hours before the scheduled time.';
    serve(booking({ startUnlocksAt: '2999-01-01T10:30:00.000Z', startLockedMessage: msg }));
    render(<PriestBookingDetailPage />);
    expect(await screen.findByText(msg)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start puja/i })).toBeDisabled();
  });

  it('enables Start once the unlock time has passed', async () => {
    serve(booking({ startUnlocksAt: '2020-01-01T10:30:00.000Z', startLockedMessage: null }));
    render(<PriestBookingDetailPage />);
    expect(await screen.findByRole('button', { name: /start puja/i })).toBeEnabled();
    expect(screen.queryByText(/you can start this puja from/i)).toBeNull();
  });
});
