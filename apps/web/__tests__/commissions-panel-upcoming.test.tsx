/**
 * The provider earnings panel (wellness, store, gaushala...) showed one
 * "Pending" figure that mixed releasable earnings with earnings still held
 * until the session is held / puja is proved. The API now flags each row with
 * `releaseStatus`; the panel must show Upcoming apart from Pending.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import { CommissionsPanel } from '../components/CommissionsPanel';

function row(id: string, amount: string, releaseStatus: string, status = 'PENDING') {
  return {
    id,
    bookingId: `b-${id}`,
    providerId: 'p1',
    amount,
    grossAmount: null,
    platformCut: null,
    ratePercent: null,
    status,
    releaseStatus,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CommissionsPanel (me): pending vs upcoming', () => {
  it('keeps upcoming earnings out of Pending and shows them in their own card', async () => {
    const rows = [row('a', '300.00', 'payable'), row('b', '700.00', 'upcoming'), row('c', '100.00', 'paid', 'PAID')];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: rows, page: 1, pageSize: 20, total: rows.length }),
      })),
    );
    render(<CommissionsPanel mode="me" />);
    const pending = await screen.findByTestId('summary-pending');
    const upcoming = await screen.findByTestId('summary-upcoming');
    expect(pending.textContent).toMatch(/300/);
    expect(pending.textContent).not.toMatch(/1,000/);
    expect(upcoming.textContent).toMatch(/700/);
    expect(upcoming.textContent).toMatch(/becomes payable once the session is held or the puja is performed and proved/i);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull());
  });

  it('hides the Upcoming card when nothing is upcoming', async () => {
    const rows = [row('a', '300.00', 'payable')];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: rows, page: 1, pageSize: 20, total: 1 }),
      })),
    );
    render(<CommissionsPanel mode="me" />);
    await screen.findByTestId('summary-pending');
    expect(screen.queryByTestId('summary-upcoming')).toBeNull();
  });
});
