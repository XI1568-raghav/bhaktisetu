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
