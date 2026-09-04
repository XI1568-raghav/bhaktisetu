import { describe, it, expect } from 'vitest';
import {
  PLANS,
  COMMISSION_RATES,
  getPlanById,
  getPlanFeatures,
  chargedCommissionRate,
  formatPrice,
  getUpgradePlan,
} from '../lib/pricing';

describe('pricing — getPlanById', () => {
  it('returns the requested plan', () => {
    expect(getPlanById('pro').id).toBe('pro');
  });

  it('throws for unknown plan ids', () => {
    expect(() => getPlanById('unknown' as never)).toThrow();
  });
});

describe('pricing — getPlanFeatures', () => {
  it('returns features list', () => {
    const features = getPlanFeatures('free');
    expect(features.length).toBeGreaterThan(0);
    expect(features.every((f) => typeof f.text === 'string')).toBe(true);
  });
});

/**
 * PM-01 (2026-08-28) — REWRITTEN DELIBERATELY, not weakened.
 *
 * This block used to assert `getCommissionRate('pandit', 'pro') === 15` and
 * `getCommissionRate('temple', 'enterprise') === 5`, certifying a tier-discount
 * ladder that no server code applies: `commissionOverride` appears nowhere in
 * apps/api and the five Commission writers each take a flat rate that never
 * reads a subscription. A pandit on Pro is charged 20%, not 15%, and a temple
 * is charged nothing at all on any tier. The helper and the ladder behind it
 * are deleted, so the contract this described no longer exists.
 *
 * What replaces it is the rate that IS charged — the single number /pricing
 * publishes, cross-checked against the apps/api constants by
 * __tests__/pricing-commission-truth.test.tsx.
 */
describe('pricing — chargedCommissionRate is the only rate helper left', () => {
  it('returns the flat platform take for a commissioned role', () => {
    expect(chargedCommissionRate('pandit')).toBe(20);
    expect(chargedCommissionRate('astrologer')).toBe(20);
  });

  it('returns null for the roles no Commission writer charges', () => {
    expect(chargedCommissionRate('temple')).toBeNull();
    expect(chargedCommissionRate('gaushala')).toBeNull();
  });

  it('throws for unknown role', () => {
    expect(() => chargedCommissionRate('alien' as never)).toThrow();
  });

  it('takes no plan tier — there is no per-tier rate to ask for', () => {
    expect(chargedCommissionRate.length).toBe(1);
  });
});

describe('pricing — formatPrice (renders API amounts only)', () => {
  it('returns "Free" for zero', () => {
    expect(formatPrice(0)).toBe('Free');
  });

  it('formats positive values with INR symbol', () => {
    const result = formatPrice(1499);
    expect(result).toMatch(/1,?499/);
  });
});

describe('pricing — getUpgradePlan', () => {
  it('returns next plan above free', () => {
    expect(getUpgradePlan('free')?.id).toBe('basic');
  });

  it('returns null for the top plan', () => {
    expect(getUpgradePlan('enterprise')).toBeNull();
  });

  it('returns null for unknown plans', () => {
    expect(getUpgradePlan('whatever' as never)).toBeNull();
  });
});

describe('pricing — PLANS data integrity', () => {
  it('has exactly 4 plans', () => {
    expect(PLANS).toHaveLength(4);
  });

  it('exposes commission rates for all roles', () => {
    expect(COMMISSION_RATES.length).toBeGreaterThanOrEqual(6);
  });

  // PM-02b: this used to assert `PLANS` was "ordered by price ascending",
  // which quietly certified a ₹0/₹499/₹1,499/₹4,999 ladder that nothing
  // charges. Plan tiers no longer carry a price at all; the ordering that
  // matters is now asserted against the API payload in
  // __tests__/subscription-price-source.test.ts.
  it('carries no price — prices live in the API, not here', () => {
    for (const plan of PLANS) {
      expect(plan).not.toHaveProperty('price');
    }
    expect(JSON.stringify(PLANS)).not.toMatch(/499|1499|4999/);
  });

  it('orders tiers from cheapest to richest', () => {
    expect(PLANS.map((p) => p.id)).toEqual(['free', 'basic', 'pro', 'enterprise']);
  });

  // PM-01: the tier copy carried "30% / 20% / 15% / 10% platform commission"
  // bullets and a matching `commissionOverride`. Nothing charges a tiered rate.
  it('no tier advertises a commission, because no tier changes one', () => {
    for (const plan of PLANS) {
      expect(plan, plan.id).not.toHaveProperty('commissionOverride');
      for (const f of plan.features) {
        expect(f.text, `${plan.id} bullet`).not.toMatch(/commission/i);
      }
    }
  });
});
