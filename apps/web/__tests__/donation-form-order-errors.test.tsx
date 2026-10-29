import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/**
 * QA 2026-10-29 (donation retest): on prod the payment sheet never opened and
 * the donor saw "Could not create your donation order (401)". The API refused
 * the donation because Razorpay refused its credentials, and older API builds
 * reported that as a 401. A donor cannot act on a status code; when the server
 * sends a sentence for a 400/404/503 the form now shows it. A 401 stays on the
 * generic line (it is not a sentence about the donor's session here).
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee', email: 'd@x.test', phone: '9990000000' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));
vi.mock('../lib/razorpay-loader', () => ({
  preloadRazorpayCheckout: () => {},
  loadRazorpayCheckout: () => Promise.resolve(null),
}));

beforeEach(() => {
  Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function fillAndSubmit() {
  const { default: DonationForm } = await import('../components/DonationForm');
  render(<DonationForm causeId="gs_001" causeName="Shri Krishna Gaushala" causeKind="gaushala" />);
  fireEvent.click(screen.getByRole('button', { name: '₹1,100' }));
  fireEvent.change(document.getElementById('donor-name')!, { target: { value: 'QA Donor' } });
  fireEvent.change(document.getElementById('donor-email')!, { target: { value: 'qa@example.com' } });
  fireEvent.change(document.getElementById('donor-phone')!, { target: { value: '+91 88689 12697' } });
  fireEvent.click(screen.getByRole('button', { name: /Donate ₹1,100/ }));
}

function answer(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

describe('donation form — order creation failures', () => {
  it('1100 with a valid phone raises no minimum-amount or phone message', async () => {
    answer(503, {});
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/could not|try again/i)).toBeTruthy());
    expect(screen.queryByText(/Minimum donation/)).toBeNull();
    expect(screen.queryByText(/Phone is required/)).toBeNull();
  });

  it('shows the server sentence for a 503 gateway failure', async () => {
    answer(503, {
      error: 'We could not open the payment page right now. Nothing has been charged. Please try again in a few minutes.',
      code: 'PAYMENT_GATEWAY_UNAVAILABLE',
    });
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/Nothing has been charged/)).toBeTruthy());
    expect(screen.queryByText(/\(503\)/)).toBeNull();
  });

  it('shows the server sentence for a gaushala that is not onboarded', async () => {
    answer(400, { code: 'gaushala_not_onboarded', error: 'Gaushala not available for donations', message: 'This gaushala is not yet onboarded.' });
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/Gaushala not available for donations/)).toBeTruthy());
  });

  it('keeps the generic line for a 401', async () => {
    answer(401, { error: 'BadRequest', message: 'Please sign in to continue.', code: 'UNAUTHORIZED' });
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/Could not create your donation order \(401\)/)).toBeTruthy());
  });
});
