import { describe, it, expect } from 'vitest';
import { __testing } from './payouts.js';

const { panditPayoutsListSchema } = __testing;

describe('payouts panditPayoutsListSchema', () => {
  it('accepts empty query and applies defaults (limit=50, offset=0)', () => {
    const r = panditPayoutsListSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(50);
      expect(r.data.offset).toBe(0);
      expect(r.data.status).toBeUndefined();
    }
  });

  it('coerces string limit/offset (URL query params arrive as strings)', () => {
    const r = panditPayoutsListSchema.safeParse({ limit: '25', offset: '10' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(25);
      expect(r.data.offset).toBe(10);
    }
  });

  it('accepts all 4 valid PayoutStatus enum values', () => {
    for (const status of ['pending', 'processing', 'completed', 'failed']) {
      expect(panditPayoutsListSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects unknown status value', () => {
    expect(panditPayoutsListSchema.safeParse({ status: 'cancelled' }).success).toBe(false);
    expect(panditPayoutsListSchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });

  it('caps limit at 200 (rejects 201)', () => {
    expect(panditPayoutsListSchema.safeParse({ limit: 200 }).success).toBe(true);
    expect(panditPayoutsListSchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it('rejects limit below 1', () => {
    expect(panditPayoutsListSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(panditPayoutsListSchema.safeParse({ limit: -5 }).success).toBe(false);
  });

  it('rejects negative offset', () => {
    expect(panditPayoutsListSchema.safeParse({ offset: -1 }).success).toBe(false);
  });

  it('rejects non-integer limit (fractional)', () => {
    expect(panditPayoutsListSchema.safeParse({ limit: 10.5 }).success).toBe(false);
  });
});
