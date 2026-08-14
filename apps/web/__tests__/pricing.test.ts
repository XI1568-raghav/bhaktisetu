import { describe, it, expect } from 'vitest';
import {
  PLANS,
  COMMISSION_RATES,
  getPlanById,
  getPlanFeatures,
  getCommissionRate,
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

describe('pricing — getCommissionRate', () => {
  it('returns role-specific rate for a plan', () => {
    expect(getCommissionRate('pandit', 'pro')).toBe(15);
    expect(getCommissionRate('temple', 'enterprise')).toBe(5);
  });

  it('throws for unknown role', () => {
    expect(() => getCommissionRate('alien' as never, 'pro')).toThrow();
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

  it('orders tiers from cheapest commission cut to richest', () => {
    expect(PLANS.map((p) => p.id)).toEqual(['free', 'basic', 'pro', 'enterprise']);
  });
});
