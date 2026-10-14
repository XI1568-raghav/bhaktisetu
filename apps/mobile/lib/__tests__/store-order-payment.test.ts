import { describe, it, expect } from 'vitest';
import { storeOrderTotalLabel } from '../store-order-payment';

describe('storeOrderTotalLabel', () => {
  it.each([
    ['CONFIRMED', 'captured', 'Total paid'],
    ['SHIPPED', 'partially_refunded', 'Total paid'],
    ['REFUNDED', 'refunded', 'Total (refunded)'],
    ['CANCELLED', null, 'Total'],
    ['PENDING', null, 'Total (not paid online)'],
    ['PENDING', 'initiated', 'Total (payment pending)'],
    ['PENDING', 'unknown', 'Total (payment pending)'],
  ])('%s + %s -> %s', (status, ps, label) => {
    expect(storeOrderTotalLabel(status, ps)).toBe(label);
  });
});
