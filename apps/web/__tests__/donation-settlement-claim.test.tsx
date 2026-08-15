import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * COM-16 (prod sweep 2026-08-12, P2/trust) — the donate form printed
 * "100% to cause" as a trust badge, next to "Razorpay secured" and
 * "80G receipt".
 *
 * Donation funds land in Darshya's own Razorpay account. There is no
 * disbursement code anywhere on the donation path: apps/api/src/routes/
 * donations.ts (452 lines) contains not one match for commission/payout —
 * no Commission row, no TemplePayout, no PayoutRequest is written when a
 * donation is verified, so a donation never enters the unified payout rail
 * that pays every other provider role. gaushala-portal and temple-portal only
 * LIST donations; nothing disburses them.
 *
 * So the badge is a specific financial promise the product has no mechanism to
 * keep or evidence, on a consumer-facing charitable collection. It comes off
 * until a settlement path exists. The two badges that ARE backed by code stay:
 * Razorpay really does take the payment, and a receipt number really is issued.
 *
 * This test asserts on the RENDERED form, not on source text, so restoring the
 * claim in any wording fails it.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee', email: 'd@x.test', phone: '9990000000' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

afterEach(() => cleanup());

async function renderForm() {
  const { default: DonationForm } = await import('../components/DonationForm');
  render(
    <DonationForm causeId="temple-1" causeName="Kashi Vishwanath" causeKind="temple" />,
  );
}

describe('COM-16 — the donate form makes no settlement promise it cannot keep', () => {
  it('does not claim that 100% of the donation reaches the cause', async () => {
    await renderForm();
    expect(screen.queryByText(/100\s*%/)).toBeNull();
    expect(screen.queryByText(/to cause/i)).toBeNull();
    expect(screen.queryByText(/every rupee/i)).toBeNull();
  });

  it('keeps the trust badges that code actually backs', async () => {
    await renderForm();
    expect(screen.getByText(/Razorpay secured/i)).toBeTruthy();
    // This assertion used to require a Section 80G badge here. COM-02 then
    // established that the receipt is not a Section 80G instrument — the
    // platform holds no registration and the donee PAN is null — so the badge
    // is now gated on donationLegal.HAS_80G_VERIFIED and the un-gated form
    // promises only what it delivers: a receipt, by email.
    // The tax claim itself is covered by donation-form-80g-honesty.test.tsx.
    expect(screen.getAllByText(/receipt/i).length).toBeGreaterThan(0);
  });
});
