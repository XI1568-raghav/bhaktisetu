import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { priestBreakdown } from '../lib/priest-breakdown';

/**
 * Pandit journey, customer test 2026-10-05. Two things a pandit sees:
 *
 *  1. The Price Breakdown read "Booking Amount ₹502, Platform Commission -₹90,
 *     Your Payout ₹361". 502 - 90 is 412, not 361: the ₹51 platform fee the
 *     devotee pays on top of the puja fee was missing, so a pandit checking the
 *     arithmetic concluded he was being short-paid. Every line must be on screen.
 *  2. The button that submits a pasted video link was an icon with no text and
 *     no accessible name. Nothing told the pandit it was the submit button, and
 *     it is the only way to deliver proof without uploading a file.
 */
describe('priestBreakdown', () => {
  it('names the platform fee so the lines add up to the booking amount', () => {
    const b = priestBreakdown({ priceAmount: 502, platformCommission: 90.2, priestPayout: 360.8 });
    expect(b.platformFee).toBe(51);
    expect(b.priceAmount - b.platformFee - b.commission).toBeCloseTo(b.payout, 2);
  });

  it('shows no fee line when the three figures already add up', () => {
    expect(priestBreakdown({ priceAmount: 500, platformCommission: 100, priestPayout: 400 }).platformFee).toBe(0);
  });

  it('never invents a negative or NaN fee from missing figures', () => {
    expect(priestBreakdown({ priceAmount: 500, platformCommission: 300, priestPayout: 300 }).platformFee).toBe(0);
    expect(priestBreakdown({ priceAmount: NaN, platformCommission: 10, priestPayout: 10 }).platformFee).toBe(0);
    expect(priestBreakdown({ priceAmount: '502' as unknown as number, platformCommission: '90.2' as unknown as number, priestPayout: '360.8' as unknown as number }).platformFee).toBe(51);
  });
});

describe('pandit booking page', () => {
  const page = readFileSync(join(__dirname, '..', 'app/priest/bookings/view/page.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('prints the platform fee line from the breakdown helper', () => {
    expect(page).toMatch(/priestBreakdown\(/);
    expect(page).toMatch(/Platform fee/);
  });
});

describe('video link submit button', () => {
  it('has a visible name', async () => {
    vi.mock('../lib/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 't' } }) }));
    const { default: VideoProofUpload } = await import('../components/provider/VideoProofUpload');
    render(<VideoProofUpload bookingId="bk-1" onUploaded={() => undefined} />);
    expect(screen.getByRole('button', { name: /submit link/i })).toBeInTheDocument();
  });
});
