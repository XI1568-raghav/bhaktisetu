import { describe, it, expect } from 'vitest';
import { computeStoreOrderTotals, computeDeliveryFeeInr } from './store-pricing.js';

describe('store totals: delivery waiver (QA payer)', () => {
  const rs1 = [{ qty: 1, unitPriceInr: 1 }];

  it('a normal customer pays Rs 49 delivery under Rs 499', () => {
    expect(computeStoreOrderTotals(rs1)).toEqual({ subtotalInr: 1, deliveryFeeInr: 49, totalInr: 50 });
    expect(computeStoreOrderTotals(rs1, { waiveDelivery: false }).totalInr).toBe(50);
  });

  it('a QA payer pays exactly the product price', () => {
    expect(computeStoreOrderTotals(rs1, { waiveDelivery: true })).toEqual({
      subtotalInr: 1,
      deliveryFeeInr: 0,
      totalInr: 1,
    });
  });

  it('the free-delivery threshold is unchanged for everyone else', () => {
    expect(computeDeliveryFeeInr(498)).toBe(49);
    expect(computeDeliveryFeeInr(499)).toBe(0);
    expect(computeDeliveryFeeInr(1, true)).toBe(0);
  });
});
