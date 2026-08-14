import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

import { reduceBookingLedgerForPartialRefund } from './ledger-reversal.service.js';

/**
 * DI-02, last gap — `clawedBackInr` only counted one of the three rails.
 *
 * The partial-refund unwind now scales three things: PENDING `Commission` rows,
 * PENDING `TemplePayout` rows, and — added for the temple booking path, which
 * mints no Commission at all (DI-05) — PENDING `PriestPayout` rows plus the
 * booking's own `priestPayout`/`platformCommission` split.
 *
 * `clawedBackInr` was computed before two of those three ran, so it reported
 * the commission delta alone. On the exact path this finding is about — a
 * temple-anchored booking, where `commissions` is empty — the unwind removes
 * real money from the temple and the pandit and then reports `0.00`.
 *
 * An operator reconciling a partial refund reads that as "the ledger was not
 * touched" and adjusts by hand, which is a double claw-back on money that was
 * already reversed. A reversal figure that omits two of the three rails it
 * reversed is worse than no figure.
 */

/** A minimal `tx` that records writes and answers the four reads in order. */
function makeTx(opts: {
  commissions?: Array<{ id: string; amount: string }>;
  temple?: Array<{ id: string; amount: string }>;
  priest?: Array<{ id: string; amount: string }>;
  booking?: { priestPayout: string; platformCommission: string } | null;
}) {
  const dec = (v: string) => new Prisma.Decimal(v);
  return {
    commission: {
      findMany: vi.fn().mockResolvedValue(
        (opts.commissions ?? []).map((c) => ({ id: c.id, amount: dec(c.amount) })),
      ),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    templePayout: {
      findMany: vi.fn().mockResolvedValue(
        (opts.temple ?? []).map((t) => ({ id: t.id, amount: dec(t.amount) })),
      ),
      update: vi.fn().mockResolvedValue({}),
    },
    priestPayout: {
      findMany: vi.fn().mockResolvedValue(
        (opts.priest ?? []).map((p) => ({ id: p.id, amount: dec(p.amount) })),
      ),
      update: vi.fn().mockResolvedValue({}),
    },
    pujaBooking: {
      findUnique: vi.fn().mockResolvedValue(
        opts.booking
          ? {
              priestPayout: dec(opts.booking.priestPayout),
              platformCommission: dec(opts.booking.platformCommission),
            }
          : null,
      ),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('DI-02 — clawedBackInr is the total actually reversed', () => {
  it('counts the temple payout it just scaled down', async () => {
    // 25% refunded → retain 0.75. Temple payout 55.00 → 41.25, i.e. 13.75 back.
    const tx = makeTx({ temple: [{ id: 'tp-1', amount: '55.00' }], booking: null });

    const r = await reduceBookingLedgerForPartialRefund(
      tx as never,
      'bk-1',
      {
        refundAmount: new Prisma.Decimal('275.00'),
        refundableBefore: new Prisma.Decimal('1100.00'),
        reason: 'tier 75%',
      },
    );

    expect(r.scaledTemplePayouts).toBe(1);
    expect(r.clawedBackInr, 'the temple share was reduced and reported as untouched').toBe('13.75');
  });

  it('counts the priest sidecar on a temple-path booking with no commission', async () => {
    // The DI-05 case: `commissions` is empty, PriestPayout is the only rail.
    const tx = makeTx({ priest: [{ id: 'pp-1', amount: '770.00' }], booking: null });

    const r = await reduceBookingLedgerForPartialRefund(
      tx as never,
      'bk-1',
      {
        refundAmount: new Prisma.Decimal('275.00'),
        refundableBefore: new Prisma.Decimal('1100.00'),
        reason: 'tier 75%',
      },
    );

    expect(r.scaledPriestPayouts).toBe(1);
    expect(r.clawedBackInr, 'the pandit rail was reduced and reported as untouched').toBe('192.50');
  });

  it('sums every rail it touched', async () => {
    const tx = makeTx({
      commissions: [{ id: 'c-1', amount: '770.00' }],
      temple: [{ id: 'tp-1', amount: '55.00' }],
      priest: [{ id: 'pp-1', amount: '100.00' }],
      booking: null,
    });

    const r = await reduceBookingLedgerForPartialRefund(
      tx as never,
      'bk-1',
      {
        refundAmount: new Prisma.Decimal('275.00'),
        refundableBefore: new Prisma.Decimal('1100.00'),
        reason: 'tier 75%',
      },
    );

    // 192.50 + 13.75 + 25.00
    expect(r.clawedBackInr).toBe('231.25');
  });

  it('reports 0.00 when nothing moved', async () => {
    const tx = makeTx({ booking: null });

    const r = await reduceBookingLedgerForPartialRefund(
      tx as never,
      'bk-1',
      {
        refundAmount: new Prisma.Decimal('0.00'),
        refundableBefore: new Prisma.Decimal('1100.00'),
        reason: 'noop',
      },
    );

    expect(r.clawedBackInr).toBe('0.00');
  });
});
