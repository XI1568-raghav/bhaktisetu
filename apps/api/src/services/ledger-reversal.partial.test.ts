import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { reduceBookingLedgerForPartialRefund } from './ledger-reversal.service.js';

/**
 * DI-02 (prod sweep 2026-08-12, P1) — PARTIAL REFUNDS REVERSED NOTHING.
 *
 * Both reversal paths were gated on `refundType === 'full'`:
 *   refund.service.ts:280   `if (refundType === 'full')`
 *   payment.service.ts:1281 the else branch touched only cancellationReason
 *
 * Meanwhile the cancellation engine (cancellation.service.computeDevoteeRefund)
 * picks a tier off the 100/75/50/25/0 ladder, so a devotee cancelling inside
 * the window is refunded a FRACTION — the designed common path, and the
 * marketing promise, not an edge case.
 *
 * On a 75%-tier cancellation of a Rs 1,100 puja the devotee got Rs 825 back
 * while the pandit kept the full Rs 770 commission and the temple its Rs 55:
 * the platform collected Rs 275 and paid out Rs 825. Every mid-ladder
 * cancellation was loss-making, silently.
 *
 * The unwind is PROPORTIONAL, which is not a business guess — it is the
 * documented uniform 20/80 take-rate applied to the revenue actually retained.
 * The provider keeps 80% of what the platform kept, exactly as they keep 80%
 * of what it collects.
 */

/** Minimal transaction double: only the three tables this helper touches. */
function makeTx(opts: {
  commissions?: Array<{ id: string; amount: string; status?: string; payoutRequestId?: string | null }>;
  templePayouts?: Array<{ id: string; amount: string; status?: string }>;
  settledCount?: number;
}) {
  const commissions = opts.commissions ?? [];
  const templePayouts = opts.templePayouts ?? [];
  const commissionUpdates: Array<{ id: string; amount: string }> = [];
  const templeUpdates: Array<{ id: string; amount: string }> = [];
  const bookingUpdates: Array<Record<string, unknown>> = [];
  const tx = {
    commission: {
      findMany: vi.fn(async () => commissions),
      count: vi.fn(async () => opts.settledCount ?? 0),
      update: vi.fn(async (args: { where: { id: string }; data: { amount: Prisma.Decimal } }) => {
        commissionUpdates.push({ id: args.where.id, amount: args.data.amount.toString() });
        return {};
      }),
    },
    templePayout: {
      findMany: vi.fn(async () => templePayouts),
      update: vi.fn(async (args: { where: { id: string }; data: { amount: Prisma.Decimal } }) => {
        templeUpdates.push({ id: args.where.id, amount: args.data.amount.toString() });
        return {};
      }),
    },
    pujaBooking: {
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        bookingUpdates.push(args.data);
        return {};
      }),
    },
  };
  return { tx, commissionUpdates, templeUpdates, bookingUpdates };
}

const D = (s: string) => new Prisma.Decimal(s);

describe('reduceBookingLedgerForPartialRefund — DI-02', () => {
  it('claws back the refunded share of the pandit earning on a 75%-tier cancellation', async () => {
    // The exact case from the finding: Rs 1,100 puja, 75% refunded (Rs 825),
    // pandit commission Rs 770. Retained revenue is Rs 275, so the pandit keeps
    // 25% of Rs 770 = Rs 192.50, not the whole Rs 770.
    const { tx, commissionUpdates } = makeTx({
      commissions: [{ id: 'c1', amount: '770.00' }],
    });

    const result = await reduceBookingLedgerForPartialRefund(tx as never, 'bk-1', {
      refundAmount: D('825.00'),
      refundableBefore: D('1100.00'),
      reason: 'devotee cancelled (75% tier)',
    });

    expect(commissionUpdates).toEqual([{ id: 'c1', amount: '192.5' }]);
    expect(result.scaledCommissions).toBe(1);
    expect(result.clawedBackInr).toBe('577.50');
  });

  it('scales the temple share by the same fraction', async () => {
    const { tx, templeUpdates } = makeTx({
      templePayouts: [{ id: 't1', amount: '55.00' }],
    });

    await reduceBookingLedgerForPartialRefund(tx as never, 'bk-1', {
      refundAmount: D('825.00'),
      refundableBefore: D('1100.00'),
      reason: 'devotee cancelled (75% tier)',
    });

    expect(templeUpdates).toEqual([{ id: 't1', amount: '13.75' }]);
  });

  it('composes correctly across two successive partial refunds', async () => {
    // First 50% of Rs 1,000 (commission Rs 800 -> Rs 400), then 50% of the
    // Rs 500 still refundable (Rs 400 -> Rs 200). The ledger must end at 25% of
    // the original, exactly as if one 75% refund had been taken.
    const first = makeTx({ commissions: [{ id: 'c1', amount: '800.00' }] });
    await reduceBookingLedgerForPartialRefund(first.tx as never, 'bk-1', {
      refundAmount: D('500.00'),
      refundableBefore: D('1000.00'),
      reason: 'first',
    });
    expect(first.commissionUpdates).toEqual([{ id: 'c1', amount: '400' }]);

    const second = makeTx({ commissions: [{ id: 'c1', amount: '400.00' }] });
    await reduceBookingLedgerForPartialRefund(second.tx as never, 'bk-1', {
      refundAmount: D('250.00'),
      refundableBefore: D('500.00'),
      reason: 'second',
    });
    expect(second.commissionUpdates).toEqual([{ id: 'c1', amount: '200' }]);
  });

  it('never touches a commission that is already paid or inside a payout request', async () => {
    // findMany is filtered to PENDING + unlinked rows, so an empty result means
    // there is nothing this handler may claw back. Clawing back settled money
    // is a finance decision, not a refund handler's.
    const { tx, commissionUpdates, bookingUpdates } = makeTx({
      commissions: [],
      settledCount: 1,
    });

    const result = await reduceBookingLedgerForPartialRefund(tx as never, 'bk-1', {
      refundAmount: D('825.00'),
      refundableBefore: D('1100.00'),
      reason: 'devotee cancelled',
    });

    expect(commissionUpdates).toEqual([]);
    expect(result.alreadySettled).toBe(1);
    // ...and the loss is FLAGGED rather than silent — an operator has to see it.
    expect(bookingUpdates).toHaveLength(1);
    expect(String(bookingUpdates[0]!.cancellationReason)).toMatch(/ledger-manual-review/);
  });

  it('is a no-op when nothing was actually refunded', async () => {
    const { tx, commissionUpdates } = makeTx({ commissions: [{ id: 'c1', amount: '770.00' }] });
    const result = await reduceBookingLedgerForPartialRefund(tx as never, 'bk-1', {
      refundAmount: D('0'),
      refundableBefore: D('1100.00'),
      reason: 'nothing',
    });
    expect(commissionUpdates).toEqual([]);
    expect(result.scaledCommissions).toBe(0);
  });

  it('refuses to invent a negative earning when the refund exceeds what is refundable', async () => {
    const { tx, commissionUpdates } = makeTx({ commissions: [{ id: 'c1', amount: '770.00' }] });
    await reduceBookingLedgerForPartialRefund(tx as never, 'bk-1', {
      refundAmount: D('2000.00'),
      refundableBefore: D('1100.00'),
      reason: 'over-refund',
    });
    expect(commissionUpdates).toEqual([{ id: 'c1', amount: '0' }]);
  });
});
