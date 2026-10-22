import { describe, it, expect } from 'vitest';
import { __testing } from './donations.js';

const { createOrderSchema } = __testing;

// P0 #PBO-2 (2026-07-09): the donation create-order schema must accept BOTH
// temple and gaushala causes (with the correct id for each), and reject mixes.
// Previously the schema required gaushalaId — temple donations were rejected
// or forced through the gaushala path (temple_id never set, receipts named the
// wrong entity). Pure-Zod gate tests mirror store-admin.test.ts.

describe('donations createOrderSchema — polymorphic donee (PBO-2)', () => {
  const baseAmount = 101;

  it('accepts a gaushala cause with gaushalaId (legacy default)', () => {
    expect(
      createOrderSchema.safeParse({
        gaushalaId: 'gaushala-user-1',
        amountInr: baseAmount,
      }).success,
    ).toBe(true);
  });

  it('accepts an explicit gaushala causeKind with gaushalaId', () => {
    expect(
      createOrderSchema.safeParse({
        causeKind: 'gaushala',
        gaushalaId: 'gaushala-user-1',
        amountInr: baseAmount,
      }).success,
    ).toBe(true);
  });

  it('accepts a temple causeKind with a UUID templeId', () => {
    expect(
      createOrderSchema.safeParse({
        causeKind: 'temple',
        templeId: '11111111-1111-1111-1111-111111111111',
        amountInr: baseAmount,
      }).success,
    ).toBe(true);
  });

  it('rejects a temple cause without templeId', () => {
    const r = createOrderSchema.safeParse({
      causeKind: 'temple',
      amountInr: baseAmount,
    });
    expect(r.success).toBe(false);
  });

  it('rejects a temple cause that also passes gaushalaId', () => {
    const r = createOrderSchema.safeParse({
      causeKind: 'temple',
      templeId: '11111111-1111-1111-1111-111111111111',
      gaushalaId: 'gaushala-user-1',
      amountInr: baseAmount,
    });
    expect(r.success).toBe(false);
  });

  it('rejects a gaushala cause that also passes templeId', () => {
    const r = createOrderSchema.safeParse({
      causeKind: 'gaushala',
      gaushalaId: 'gaushala-user-1',
      templeId: '11111111-1111-1111-1111-111111111111',
      amountInr: baseAmount,
    });
    expect(r.success).toBe(false);
  });

  it('rejects legacy gaushala call with no gaushalaId', () => {
    const r = createOrderSchema.safeParse({
      amountInr: baseAmount,
    });
    expect(r.success).toBe(false);
  });

  it('enforces the ₹101 minimum regardless of cause', () => {
    expect(
      createOrderSchema.safeParse({
        causeKind: 'temple',
        templeId: '11111111-1111-1111-1111-111111111111',
        amountInr: 100,
      }).success,
    ).toBe(false);
  });
});

// QA 2026-10-22 (devotee report): Rs 1,100 + a valid phone was reported as
// "Minimum donation is Rs 101" / "Phone is required". The API side must agree
// with the web form on what a valid amount and phone look like.
describe('donations createOrderSchema — amount and phone agree with the web form', () => {
  const base = { gaushalaId: 'gaushala-user-1' };

  it('accepts 1100 as a number and as a numeric string, and a PAN-less donation of Rs 2,100', () => {
    expect(createOrderSchema.safeParse({ ...base, amountInr: 1100 }).success).toBe(true);
    const s = createOrderSchema.safeParse({ ...base, amountInr: '1,100' });
    expect(s.success && s.data.amountInr).toBe(1100);
    expect(createOrderSchema.safeParse({ ...base, amountInr: 2100 }).success).toBe(true);
  });

  it('still rejects 100, 101.5, junk and over-cap amounts', () => {
    for (const amountInr of [100, 101.5, 'abc', '', 1000001, '99']) {
      expect(createOrderSchema.safeParse({ ...base, amountInr }).success).toBe(false);
    }
  });

  it('accepts 8868912697 and +91 88689 12697, rejects letters and short numbers', () => {
    expect(createOrderSchema.safeParse({ ...base, amountInr: 1100, donorPhone: '8868912697' }).success).toBe(true);
    const p = createOrderSchema.safeParse({ ...base, amountInr: 1100, donorPhone: '+91 88689 12697' });
    expect(p.success && p.data.donorPhone).toBe('+918868912697');
    expect(createOrderSchema.safeParse({ ...base, amountInr: 1100, donorPhone: '12345' }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, amountInr: 1100, donorPhone: 'abcdefghij' }).success).toBe(false);
  });
});
