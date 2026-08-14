/**
 * PM-03b / PM-06b / PM-08b (prod sweep 2026-08-12) — /pricing must publish only
 * numbers and promises the server actually honours.
 *
 * Three separate defects, all on apps/web/app/pricing:
 *
 *  PM-03b  The published free-tier commission was wrong for EVERY role.
 *          Advertised (lib/pricing.ts COMMISSION_RATES.rates.free):
 *            pandit 30 · store 25 · astrologer 35 · wellness 30 · temple 15 ·
 *            gaushala 10
 *          Actually charged, read off the server on 2026-08-13:
 *            pandit     20  apps/api/prisma/schema.prisma Priest.commissionRate
 *                           @default(0.80) → platform keeps 1 - 0.80
 *            store      20  apps/api/prisma/schema.prisma StoreProfile.commission
 *                           @default(0.20)
 *            astrologer 20  apps/api/src/services/astrologer.service.ts
 *                           ASTROLOGER_PLATFORM_RATE
 *            wellness   20  apps/api/src/routes/wellness-sessions.ts
 *                           WELLNESS_PLATFORM_COMMISSION
 *            temple      —  there is NO commission writer keyed to a temple
 *                           manager. The five writers (consultation.ts,
 *                           wellness-sessions.ts, booking.service.ts,
 *                           payment.service.ts, store-commission.service.ts)
 *                           credit a priest, astrologer, instructor or store
 *                           owner. Temples are net RECEIVERS —
 *                           temple-payout.service.ts pays them
 *                           DEFAULT_TEMPLE_SHARE_RATE of each confirmed puja.
 *            gaushala    —  same: no writer, donations pass through in full.
 *          (The sweep guessed temples were over-charged at 20% + 5%. They are
 *          not charged at all; the 5% is money moving toward the temple.)
 *
 *  PM-06b  The FAQ published a dated bank SLA — "processed every Monday …
 *          reach your bank account within 2-3 business days" — on top of a rail
 *          that does not exist. admin-bookings.ts:622 states it plainly: "The
 *          actual bank transfer stays owner-gated on RazorpayX/Cashfree."
 *          payout.service additionally gates every withdrawal on an admin
 *          verifying provider_kyc.
 *
 *  PM-08b  CommissionRate.baseRate was documented as "free-tier commission" and
 *          disagreed with rates.free on all six rows — dead AND wrong, in the
 *          file whose header calls itself the single source of truth.
 *
 * Also corrected here: the billing FAQ promised a "prorated difference" on
 * upgrade. A repo-wide search for prorat* returns one unrelated hit in
 * lib/dasha-vimshottari.ts — subscription.service.subscribe() cancels the old
 * row and creates the new one at full price. No proration exists.
 *
 * The tier ladder itself (rates.basic/pro/enterprise) is DELIBERATELY NOT
 * asserted as correct here — whether Darshya sells a tier-based commission
 * discount at all is PM-01, an owner decision. What these tests forbid is
 * PUBLISHING those numbers while no server code applies them.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COMMISSION_RATES,
  chargedCommissionRate,
  type ProviderRole,
} from '../lib/pricing';
import { PRICING_FAQS } from '../app/pricing/faqs';

const apiSource = (rel: string): string =>
  readFileSync(join(process.cwd(), '..', 'api', rel), 'utf8');

/** 0.2 → 20. Percent, one decimal, so a 0.185 rate can never silently round. */
const asPercent = (fraction: number): number => Math.round(fraction * 1000) / 10;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PM-08b — the dead-and-wrong baseRate field is gone', () => {
  it('no COMMISSION_RATES row carries baseRate', () => {
    for (const row of COMMISSION_RATES) {
      expect(row).not.toHaveProperty('baseRate');
    }
  });

  it('every row names the server constant its published rate came from', () => {
    for (const row of COMMISSION_RATES) {
      expect(typeof row.chargedRateSource).toBe('string');
      expect(row.chargedRateSource.length).toBeGreaterThan(10);
    }
  });
});

describe('PM-03b — the published rate equals the rate the server charges', () => {
  it('pandit: 1 - Priest.commissionRate default', () => {
    const m = /commissionRate\s+Float\s+@default\(([\d.]+)\)/.exec(
      apiSource('prisma/schema.prisma'),
    );
    expect(m, 'Priest.commissionRate default not found in schema.prisma').toBeTruthy();
    expect(chargedCommissionRate('pandit')).toBe(asPercent(1 - Number(m![1])));
  });

  it('store owner: StoreProfile.commission default', () => {
    const m = /commission\s+Decimal\s+@default\(([\d.]+)\)\s+@db\.Decimal/.exec(
      apiSource('prisma/schema.prisma'),
    );
    expect(m, 'StoreProfile.commission default not found in schema.prisma').toBeTruthy();
    expect(chargedCommissionRate('store_owner')).toBe(asPercent(Number(m![1])));
  });

  it('astrologer: ASTROLOGER_PLATFORM_RATE', () => {
    const m = /ASTROLOGER_PLATFORM_RATE\s*=\s*([\d.]+)/.exec(
      apiSource('src/services/astrologer.service.ts'),
    );
    expect(m, 'ASTROLOGER_PLATFORM_RATE not found').toBeTruthy();
    expect(chargedCommissionRate('astrologer')).toBe(asPercent(Number(m![1])));
  });

  it('wellness: WELLNESS_PLATFORM_COMMISSION default', () => {
    const m = /WELLNESS_PLATFORM_COMMISSION\s*=\s*Number\(\s*process\.env\.WELLNESS_PLATFORM_COMMISSION\s*\?\?\s*'([\d.]+)'/.exec(
      apiSource('src/routes/wellness-sessions.ts'),
    );
    expect(m, 'WELLNESS_PLATFORM_COMMISSION default not found').toBeTruthy();
    expect(chargedCommissionRate('wellness')).toBe(asPercent(Number(m![1])));
  });

  it('temple and gaushala publish NO rate, because no writer charges them one', () => {
    expect(chargedCommissionRate('temple')).toBeNull();
    expect(chargedCommissionRate('gaushala')).toBeNull();
  });

  it('the temple note quotes DEFAULT_TEMPLE_SHARE_RATE, the share temples RECEIVE', () => {
    const m = /DEFAULT_TEMPLE_SHARE_RATE\s*=\s*([\d.]+)/.exec(
      apiSource('src/services/temple-payout.service.ts'),
    );
    expect(m, 'DEFAULT_TEMPLE_SHARE_RATE not found').toBeTruthy();
    const temple = COMMISSION_RATES.find((r) => r.role === 'temple');
    expect(temple?.note).toContain(`${asPercent(Number(m![1]))}%`);
  });

  it('no published rate is one of the six overstated free-tier numbers', () => {
    const overstated: Record<ProviderRole, number> = {
      pandit: 30,
      store_owner: 25,
      astrologer: 35,
      wellness: 30,
      temple: 15,
      gaushala: 10,
    };
    for (const row of COMMISSION_RATES) {
      expect(chargedCommissionRate(row.role)).not.toBe(overstated[row.role]);
    }
  });
});

describe('PM-06b / billing FAQ — no promise the platform cannot keep', () => {
  const faq = (needle: RegExp) => {
    const hit = PRICING_FAQS.find((f) => needle.test(f.question));
    expect(hit, `no FAQ matching ${needle}`).toBeTruthy();
    return hit!.answer;
  };

  it('the payout answer makes no dated bank-transfer promise', () => {
    const answer = faq(/when do i get paid/i);
    expect(answer).not.toMatch(/every monday/i);
    expect(answer).not.toMatch(/2-3 business days/i);
    expect(answer).not.toMatch(/business days after processing/i);
    expect(answer).not.toMatch(/reach your bank account within/i);
  });

  it('the payout answer names the two gates that actually exist', () => {
    const answer = faq(/when do i get paid/i);
    expect(answer).toMatch(/kyc/i);
    expect(answer).toMatch(/request/i);
  });

  it('the plan-change answer does not promise proration nobody implements', () => {
    const answer = faq(/change plans/i);
    expect(answer).not.toMatch(/prorat/i);
  });
});

describe('PM-03b/PM-01 — the rendered table publishes only the charged rate', () => {
  async function renderPricing() {
    // API unreachable: the plan cards fall back to "prices unavailable", which
    // keeps this test about the commission table only.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const PricingPage = (await import('../app/pricing/page')).default;
    return render(await PricingPage());
  }

  it('shows 20% for the four roles that are charged, and no tier-ladder number', async () => {
    await renderPricing();
    const text = screen.getByRole('table').textContent ?? '';
    expect(text).toContain('20%');
    // Every number the unimplemented ladder used to print.
    for (const fiction of ['30%', '35%', '25%', '18%', '15%', '12%', '10%', '8%', '5%', '4%', '3%']) {
      expect(text, `tier-ladder rate ${fiction} is still published`).not.toContain(fiction);
    }
  });

  it('renders the honest payout answer, not the Monday SLA', async () => {
    await renderPricing();
    expect(screen.queryByText(/every Monday/i)).toBeNull();
    expect(screen.queryByText(/2-3 business days/i)).toBeNull();
    expect(screen.getAllByText(/KYC/i).length).toBeGreaterThan(0);
  });
});
