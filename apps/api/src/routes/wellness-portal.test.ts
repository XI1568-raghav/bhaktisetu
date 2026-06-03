import { describe, it, expect } from 'vitest';
import { __testing } from './wellness-portal.js';

const { mineQuerySchema } = __testing;

describe('wellness-portal mineQuerySchema', () => {
  it('accepts empty query and applies defaults', () => {
    const r = mineQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(50);
      expect(r.data.offset).toBe(0);
      expect(r.data.status).toBeUndefined();
    }
  });

  it('coerces string limit/offset to numbers (URL query params arrive as strings)', () => {
    const r = mineQuerySchema.safeParse({ limit: '120', offset: '40' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(120);
      expect(r.data.offset).toBe(40);
    }
  });

  it('rejects status outside the WellnessSessionStatus enum', () => {
    expect(mineQuerySchema.safeParse({ status: 'pending_payment' }).success).toBe(false);
    expect(mineQuerySchema.safeParse({ status: 'in_progress' }).success).toBe(false);
  });

  it('accepts all 4 valid status values from WellnessSessionStatus', () => {
    for (const status of ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] as const) {
      expect(mineQuerySchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('caps limit at 200 to prevent unbounded instructor-side pulls', () => {
    expect(mineQuerySchema.safeParse({ limit: 200 }).success).toBe(true);
    expect(mineQuerySchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it('rejects negative offset', () => {
    expect(mineQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
  });

  it('rejects limit below 1', () => {
    expect(mineQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('rejects fractional limit/offset', () => {
    expect(mineQuerySchema.safeParse({ limit: 10.5 }).success).toBe(false);
    expect(mineQuerySchema.safeParse({ offset: 1.7 }).success).toBe(false);
  });
});
