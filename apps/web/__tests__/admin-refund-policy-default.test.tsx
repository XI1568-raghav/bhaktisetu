/**
 * Customer test 2026-10-05 — the refund dialog defaulted to "Full refund" (Rs 502)
 * for a devotee who had been quoted 75% (Rs 376.50). One click on the default
 * over-refunded. When the server says what the cancellation policy owes, the
 * dialog now defaults to exactly that and sends no amount of its own.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import AdminRefundsPage from '../app/admin/refunds/page';

const QUOTE = { refundAmountInr: 376.5, feeAmountInr: 125.5, refundFraction: 0.75, tierLabel: '75% refund (24–48h before)' };
const BOOKING = {
  id: 'bk-1', bookingNumber: 'BS-20261005-P8R0H', status: 'cancelled', priceAmount: '502', currency: 'INR',
  cancelledAt: '2026-10-04T18:40:00.000Z', cancellationReason: 'Booking cancelled', scheduledDate: '2026-10-06T00:00:00.000Z',
  pujaType: { name: 'Satyanarayan Puja', slug: 's' }, temple: null, user: { fullName: 'Test Devotee', phone: null },
  payments: [{ id: 'p1', status: 'captured', amount: '502' }],
};

const res = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body }) as unknown as Response;

function mockApi(policyQuote: unknown) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if ((init?.method ?? 'GET') === 'POST' && url.endsWith('/approve')) {
      return res({ ok: true, refund: { ok: true, bookingId: 'bk-1', amountInr: 376.5, status: 'partially_refunded' } });
    }
    if (url.includes('/refunds/pending')) return res({ bookings: [{ ...BOOKING, policyQuote }], schemaNote: '' });
    return res({ bookings: [], page: 1, limit: 25, total: 0 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function open() {
  render(<AdminRefundsPage />);
  await screen.findByText('BS-20261005-P8R0H');
  fireEvent.click(screen.getByRole('button', { name: /^refund$/i }));
  await screen.findByLabelText(/reason/i);
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('admin refund dialog follows the cancellation policy', () => {
  it('defaults to the policy amount, not Full refund', async () => {
    mockApi(QUOTE);
    await open();
    const policy = screen.getByRole('radio', { name: /per cancellation policy/i }) as HTMLInputElement;
    expect(policy.checked).toBe(true);
    expect((screen.getByRole('radio', { name: /full refund/i }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getAllByText(/376\.50/).length).toBeGreaterThan(0);
  });

  it('sends refundType "policy" and no amount of its own', async () => {
    const fn = mockApi(QUOTE);
    await open();
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'Devotee cancelled' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm refund/i }));
    await waitFor(() => expect(fn.mock.calls.some((c) => String(c[0]).endsWith('/approve'))).toBe(true));
    const call = fn.mock.calls.find((c) => String(c[0]).endsWith('/approve'))!;
    const body = JSON.parse(String((call[1] as RequestInit).body));
    expect(body.refundType).toBe('policy');
    expect(body.amountInr).toBeUndefined();
  });

  it('falls back to Full when no quote is available, and hides the policy option', async () => {
    mockApi(null);
    await open();
    expect(screen.queryByRole('radio', { name: /per cancellation policy/i })).toBeNull();
    expect((screen.getByRole('radio', { name: /full refund/i }) as HTMLInputElement).checked).toBe(true);
  });

  it('does not default to policy when the policy owes nothing', async () => {
    mockApi({ ...QUOTE, refundAmountInr: 0, refundFraction: 0, tierLabel: 'No refund' });
    await open();
    expect((screen.getByRole('radio', { name: /full refund/i }) as HTMLInputElement).checked).toBe(true);
  });
});
