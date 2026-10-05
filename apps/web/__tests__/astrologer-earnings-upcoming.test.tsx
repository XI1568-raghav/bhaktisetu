import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The astrologer Earnings page showed one "Pending payout" number that mixed
 * releasable money with consultations that have not happened yet. The API now
 * reports `summary.upcomingInr` separately (and keeps it out of `pendingInr`);
 * the page must show it in its own card with true wording.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'tok' } }),
}));

import AstrologerEarningsPage from '../app/astrologer-portal/earnings/page';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function respond(summary: Record<string, number>) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ data: [], summary }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  ) as unknown as typeof fetch;
}

describe('astrologer earnings: pending vs upcoming', () => {
  it('shows upcoming consultations apart from pending payout', async () => {
    respond({ totalEarningsInr: 700, pendingInr: 300, upcomingInr: 400, paidInr: 0, astrologerShare: 0.8 });
    render(<AstrologerEarningsPage />);
    const upcoming = await screen.findByTestId('earnings-upcoming');
    expect(upcoming.textContent).toMatch(/400/);
    expect(upcoming.textContent).toMatch(/after the consultation is completed/i);
    expect(screen.getByTestId('earnings-pending').textContent).toMatch(/300/);
    expect(screen.getByTestId('earnings-pending').textContent).not.toMatch(/700/);
  });

  it('omits the upcoming card when there is nothing upcoming', async () => {
    respond({ totalEarningsInr: 300, pendingInr: 300, upcomingInr: 0, paidInr: 0, astrologerShare: 0.8 });
    render(<AstrologerEarningsPage />);
    await screen.findByTestId('earnings-pending');
    expect(screen.queryByTestId('earnings-upcoming')).toBeNull();
  });
});
