/**
 * QA pricing (server env QA_PAYER_EMAILS): a signed-in tester on the allowlist
 * pays about Rs 1 per flow. The server decides from the account email; the web
 * only mirrors the numbers once `GET /auth/me` says `user.qaPricing === true`.
 * Everyone else must see exactly the normal prices.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PLATFORM_FEE_INR,
  PRASAD_DELIVERY_FEE_INR,
  feeDisclosureLine,
  platformFeeInr,
  prasadFeeInr,
  pujaTotalInr,
} from '../lib/puja-pricing';
import { nriTotalInr } from '../lib/nri-pricing';
import { computeDeliveryFeeInr, computeStoreOrderTotals } from '../lib/store-pricing';
import { MIN_INR, validateDonation } from '../lib/donation-validation';

let mockToken: string | undefined;
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: mockToken ? { accessToken: mockToken } : null, user: null }),
}));

import {
  QA_PRICING_BANNER_TEXT,
  qaPricingFromMe,
  resetQaPricingCache,
  useQaPricing,
} from '../lib/qa-pricing';
import { QaPricingBanner } from '../components/QaPricingBanner';

const realFetch = globalThis.fetch;
function meReturns(body: unknown, ok = true) {
  globalThis.fetch = vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
}

beforeEach(() => {
  resetQaPricingCache();
  mockToken = undefined;
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

describe('puja totals', () => {
  it('normal customer: puja + Rs 51 (+ Rs 150 prasad)', () => {
    expect(pujaTotalInr(1, false)).toBe(1 + PLATFORM_FEE_INR);
    expect(pujaTotalInr(1, true)).toBe(1 + PLATFORM_FEE_INR + PRASAD_DELIVERY_FEE_INR);
    expect(pujaTotalInr(1, true, false)).toBe(202);
  });

  it('QA tester: the puja price alone, with or without prasad', () => {
    expect(pujaTotalInr(1, false, true)).toBe(1);
    expect(pujaTotalInr(1, true, true)).toBe(1);
    expect(nriTotalInr(1, true, true)).toBe(1);
    expect(platformFeeInr(true)).toBe(0);
    expect(prasadFeeInr(true)).toBe(0);
    expect(platformFeeInr()).toBe(PLATFORM_FEE_INR);
  });

  it('a zero base price is still shown as Rs 0, not as a fee', () => {
    expect(pujaTotalInr(0, true, true)).toBe(0);
  });

  it('the fee disclosure line follows the flag', () => {
    expect(feeDisclosureLine(1)).toContain('₹51 platform fee');
    expect(feeDisclosureLine(1, true)).toBe('+ ₹0 platform fee · ₹1 total');
  });
});

describe('store totals', () => {
  it('normal customer pays Rs 49 delivery under Rs 499; tester pays none', () => {
    const rs1 = [{ qty: 1, unitPriceInr: 1 }];
    expect(computeStoreOrderTotals(rs1).totalInr).toBe(50);
    expect(computeStoreOrderTotals(rs1, { waiveDelivery: true }).totalInr).toBe(1);
    expect(computeDeliveryFeeInr(1, true)).toBe(0);
    expect(computeDeliveryFeeInr(498)).toBe(49);
  });
});

describe('donation validation', () => {
  const ok = { name: 'A', email: 'a@b.co', phone: '9876543210', pan: '', hasTaxReceipt: false };

  it('normal customer: Rs 1 is below the Rs 101 minimum', () => {
    expect(validateDonation({ ...ok, amount: '1' }).amount).toBe(`Minimum donation is ₹${MIN_INR}`);
    expect(validateDonation({ ...ok, amount: '101' }).amount).toBeUndefined();
  });

  it('QA tester: Rs 1 passes, Rs 0 and a missing amount do not', () => {
    expect(validateDonation({ ...ok, amount: '1', minInr: 1 }).amount).toBeUndefined();
    expect(validateDonation({ ...ok, amount: '0', minInr: 1 }).amount).toBe('Minimum donation is ₹1');
    expect(validateDonation({ ...ok, amount: '', minInr: 1 }).amount).toBe('Minimum donation is ₹1');
  });
});

describe('qaPricingFromMe', () => {
  it('only a literal true counts', () => {
    expect(qaPricingFromMe({ user: { qaPricing: true } })).toBe(true);
    for (const v of [false, 'true', 1, null, undefined]) {
      expect(qaPricingFromMe({ user: { qaPricing: v } })).toBe(false);
    }
    expect(qaPricingFromMe(null)).toBe(false);
    expect(qaPricingFromMe({})).toBe(false);
  });
});

function Probe() {
  return <span data-testid="qa">{String(useQaPricing())}</span>;
}

describe('useQaPricing / QaPricingBanner', () => {
  it('signed out: false, and /auth/me is never called', async () => {
    meReturns({ user: { qaPricing: true } });
    render(<Probe />);
    expect(screen.getByTestId('qa').textContent).toBe('false');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('signed in as a tester: true, and the banner shows the QA text', async () => {
    mockToken = 'tok-tester';
    meReturns({ user: { qaPricing: true } });
    render(
      <>
        <Probe />
        <QaPricingBanner />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('qa').textContent).toBe('true'));
    expect(screen.getByTestId('qa-pricing-banner').textContent).toBe(QA_PRICING_BANNER_TEXT);
    expect(QA_PRICING_BANNER_TEXT).toBe('QA pricing active: fees waived for this tester account');
  });

  it('signed in as a normal customer: false and no banner', async () => {
    mockToken = 'tok-customer';
    meReturns({ user: { qaPricing: false } });
    render(
      <>
        <Probe />
        <QaPricingBanner />
      </>,
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(screen.getByTestId('qa').textContent).toBe('false');
    expect(screen.queryByTestId('qa-pricing-banner')).toBeNull();
  });

  it('a failing or non-OK /auth/me never turns the flag on', async () => {
    mockToken = 'tok-err';
    meReturns({ user: { qaPricing: true } }, false);
    render(<Probe />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(screen.getByTestId('qa').textContent).toBe('false');

    cleanup();
    resetQaPricingCache();
    globalThis.fetch = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    render(<Probe />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(screen.getByTestId('qa').textContent).toBe('false');
  });

  it('asks /auth/me once per token however many components use the hook', async () => {
    mockToken = 'tok-once';
    meReturns({ user: { qaPricing: true } });
    render(
      <>
        <Probe />
        <Probe />
        <QaPricingBanner />
      </>,
    );
    await waitFor(() => expect(screen.getAllByTestId('qa')[0]!.textContent).toBe('true'));
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});

describe('the pages use the flag (and only the flag)', () => {
  const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  it('wizard, offering checkout, donation form, consultation booking and cart all read useQaPricing', () => {
    for (const rel of [
      'app/pujas/book/page.tsx',
      'app/checkout/offering/page.tsx',
      'components/DonationForm.tsx',
      'app/astrology/[id]/book/page.tsx',
      'components/CartContext.tsx',
    ]) {
      expect(read(rel), rel).toContain('useQaPricing()');
    }
  });

  it('the root layout mounts the banner', () => {
    expect(read('app/layout.tsx')).toContain('<QaPricingBanner />');
  });

  it('nothing reads the flag from the URL or browser storage', () => {
    const src = read('lib/qa-pricing.ts');
    expect(src).not.toMatch(/localStorage|sessionStorage|location\.search|URLSearchParams/);
  });
});
