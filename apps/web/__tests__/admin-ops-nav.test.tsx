/**
 * AO-03 (prod sweep 2026-08-12) — the admin sidebar listed no payouts, no
 * refunds and no KYC entry, so even once those screens exist an operator has
 * no way to reach them: "Read the admin sidebar — Dashboard, Users, Approvals,
 * Leads, Outreach, Waitlist, Support, Ratings, Commissions, Subscriptions,
 * Revenue, Reports, Metrics, Agents, Settings."
 *
 * A page nobody can navigate to is the same defect as a page that 404s.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ user: { fullName: 'Platform Admin' }, signOut: vi.fn() }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminRootLayout from '../app/admin/layout';

function hrefOf(label: RegExp): string | null {
  const link = screen.queryByRole('link', { name: label });
  return link ? link.getAttribute('href') : null;
}

describe('AO-03 — the admin sidebar reaches the money and KYC screens', () => {
  it('links to the payout queue', () => {
    render(<AdminRootLayout>{null}</AdminRootLayout>);
    expect(hrefOf(/payouts/i)).toBe('/admin/payouts');
  });

  it('links to refunds', () => {
    render(<AdminRootLayout>{null}</AdminRootLayout>);
    expect(hrefOf(/refunds/i)).toBe('/admin/refunds');
  });

  it('links to provider KYC', () => {
    render(<AdminRootLayout>{null}</AdminRootLayout>);
    expect(hrefOf(/kyc/i)).toBe('/admin/kyc');
  });

  it('keeps the existing revenue and commissions entries', () => {
    render(<AdminRootLayout>{null}</AdminRootLayout>);
    expect(hrefOf(/^revenue$/i)).toBe('/admin/revenue');
    expect(hrefOf(/^commissions$/i)).toBe('/admin/commissions');
  });
});
