/**
 * Customer test 2026-10-05 — the "Pay now" dialog said who and how much, not
 * where. The transfer is made outside the system, so it now shows the payee's
 * bank details, and says so plainly when there are none on file.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 't' } }) }));
import AdminPayoutsPage from '../app/admin/payouts/page';

const REQ = {
  id: 'r1', providerId: 'p1', providerName: 'Pandit Ramesh Sharma', providerEmail: 'pandit@demo.com', role: 'PANDIT',
  amount: '360.8', method: 'upi', status: 'pending', reference: null, requestedAt: '2026-10-05T00:00:00.000Z',
  processedAt: null, linkedCommissionCount: 1, linkedCommissionTotal: '360.8',
};
const res = (b: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(b), json: async () => b }) as unknown as Response;

function mock(payTo: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/payout-requests')) return res({ requests: [{ ...REQ, payTo }] });
    return res({ ok: true, groups: [], scanLimit: 500, truncated: false });
  }));
}
async function openPay() {
  render(<AdminPayoutsPage />);
  await screen.findAllByText('Pandit Ramesh Sharma');
  fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
}
beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('pay-now dialog shows where to send the money', () => {
  it('lists holder, account number and IFSC', async () => {
    mock({ holderName: 'Ramesh Sharma', accountNumber: '123456789012', ifsc: 'HDFC0001234' });
    await openPay();
    expect(await screen.findByText('123456789012')).toBeTruthy();
    expect(screen.getByText('HDFC0001234')).toBeTruthy();
    expect(screen.getByText('Ramesh Sharma')).toBeTruthy();
  });

  it('says when no bank details are on file instead of staying silent', async () => {
    mock(null);
    await openPay();
    expect(await screen.findByText(/no bank details on file/i)).toBeTruthy();
  });
});
