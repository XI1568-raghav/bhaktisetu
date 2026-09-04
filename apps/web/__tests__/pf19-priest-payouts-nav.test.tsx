/**
 * PF-19 — the unified provider payouts page is unreachable from the pandit portal.
 *
 * apps/web/app/payouts/page.tsx says in its own header that it is "the single
 * payout surface for ALL provider roles", and PROVIDER_ROLES includes 'priest'.
 * It is the only screen that carries a "Request payout" button. Yet the priest
 * sidebar's only Payouts entry pointed at /priest/payouts — the LEGACY,
 * read-only PriestPayout ledger, which has no withdraw control at all. A grep
 * of apps/web/app + apps/web/components for '/payouts' returned exactly one
 * hit before this change: the redirect in app/settings/earnings/page.tsx.
 *
 * So the pandit could see money and never ask for it.
 *
 * The legacy entry is kept, relabelled, because createPriestPayout deliberately
 * skips bookings a Commission row already owns (the two rails are mutually
 * exclusive by design) and historical PriestPayout rows must stay readable.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/priest',
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ user: { fullName: 'Pandit Sharma', phone: '+919999999999' }, signOut: vi.fn() }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import PriestLayout from '../app/priest/layout';

function hrefOf(name: RegExp): string | null {
  const link = screen.queryByRole('link', { name });
  return link ? link.getAttribute('href') : null;
}

describe('PF-19 — the pandit portal reaches the payout surface that can pay', () => {
  it('links Payouts at the unified provider rail', () => {
    render(<PriestLayout>{null}</PriestLayout>);
    expect(hrefOf(/^payouts$/i)).toBe('/payouts');
  });

  it('still reaches the legacy per-booking puja payout ledger', () => {
    render(<PriestLayout>{null}</PriestLayout>);
    expect(hrefOf(/puja payouts/i)).toBe('/priest/payouts');
  });

  it('keeps the rest of the portal navigation intact', () => {
    render(<PriestLayout>{null}</PriestLayout>);
    expect(hrefOf(/^bookings$/i)).toBe('/priest/bookings');
    expect(hrefOf(/^offers$/i)).toBe('/priest/offers');
    expect(hrefOf(/^profile$/i)).toBe('/priest/profile');
  });
});
