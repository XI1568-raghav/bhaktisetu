import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  mintProviderEarningForBooking,
  type MintTxClient,
  type MintableBooking,
} from './provider-earning-mint.js';

/**
 * DI-05 — the shared mint's four guards, each proved to bail for its own reason.
 *
 * The guard triple used to be hand-copied into booking.service. This file is the
 * reason it is now imported instead: guard 2 (the legacy-rail check) did not
 * exist in the copy, which made the two payout rails only ONE-WAY exclusive and
 * left the same booking payable twice.
 */

function makeTx(overrides: Partial<Record<string, unknown>> = {}) {
  const tx = {
    commission: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'cm-new' }),
      // DI-06 (F367): the mint writes through createMany({ skipDuplicates }),
      // which Prisma compiles to INSERT ... ON CONFLICT DO NOTHING, so the
      // UNIQUE index on commissions.booking_id settles a race inside the
      // statement rather than raising P2002 and aborting the caller's
      // transaction. `count: 1` is "this call wrote the row".
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    priestPayout: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    payment: {
      count: vi.fn().mockResolvedValue(1),
    },
    priest: {
      findUnique: vi.fn().mockResolvedValue({ userId: 'user-pandit-1' }),
    },
    ...overrides,
  };
  return tx as unknown as MintTxClient & typeof tx;
}

const BOOKING: MintableBooking = {
  id: 'bk-1',
  priestId: 'priest-1',
  // Fee-INCLUSIVE price. 770 to the pandit, 230 platform => 23%.
  priceAmount: new Prisma.Decimal('1000.00'),
  priestPayout: new Prisma.Decimal('770.00'),
};

describe('DI-05 mintProviderEarningForBooking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mints the provider earning with amount = the provider payout column', async () => {
    const tx = makeTx();
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);

    expect(outcome).toBe('minted');
    expect(tx.commission.createMany).toHaveBeenCalledTimes(1);
    // DI-06: a bare `create` must not be reachable any more — inside the
    // caller's transaction its P2002 would abort a real payment capture.
    expect(tx.commission.create).not.toHaveBeenCalled();
    const args = tx.commission.createMany.mock.calls[0]![0] as {
      data: any[];
      skipDuplicates?: boolean;
    };
    expect(args.skipDuplicates).toBe(true);
    const data = args.data[0];
    expect(data.bookingId).toBe('bk-1');
    // providerId is the linked USER, never the Priest.id — that key mismatch is
    // RV-04, the orphan no payout read ever matched.
    expect(data.providerId).toBe('user-pandit-1');
    // amount is the PROVIDER's earning, read from the column, never recomputed.
    expect(new Prisma.Decimal(data.amount).toString()).toBe('770');
    // percentage is the PLATFORM's RATE (a fraction, per commission-math.ts)
    // against the fee-inclusive base: (1000 - 770) / 1000 = 0.2300.
    expect(new Prisma.Decimal(data.percentage).toFixed(4)).toBe('0.2300');
    expect(data.status).toBe('PENDING');
  });

  it('does not mint when the booking carries no pandit', async () => {
    const tx = makeTx();
    const outcome = await mintProviderEarningForBooking(tx, { ...BOOKING, priestId: null });
    expect(outcome).toBe('no-provider-on-booking');
    expect(tx.commission.createMany).not.toHaveBeenCalled();
  });

  it('is idempotent — an existing commission on the booking blocks a second mint', async () => {
    const tx = makeTx({
      commission: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cm-existing' }),
        create: vi.fn(),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);
    expect(outcome).toBe('already-on-unified-rail');
    expect(tx.commission.createMany).not.toHaveBeenCalled();
  });

  it('refuses to mint when the LEGACY PriestPayout rail already owns the booking', async () => {
    // The double-payable guard. payment.service already refuses the opposite
    // direction; without this one the exclusion is one-way and the pandit holds
    // rows on both rails for the same money.
    const tx = makeTx({
      priestPayout: { findFirst: vi.fn().mockResolvedValue({ id: 'pp-existing' }) },
    });
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);
    expect(outcome).toBe('already-on-legacy-rail');
    expect(tx.commission.createMany).not.toHaveBeenCalled();
  });

  it('never mints withdrawable balance on an unpaid booking', async () => {
    const tx = makeTx({ payment: { count: vi.fn().mockResolvedValue(0) } });
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);
    expect(outcome).toBe('no-captured-payment');
    expect(tx.commission.createMany).not.toHaveBeenCalled();
  });

  it('never mints an orphan — a Priest with no linked User is not payable', async () => {
    const tx = makeTx({ priest: { findUnique: vi.fn().mockResolvedValue({ userId: null }) } });
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);
    expect(outcome).toBe('provider-has-no-user');
    expect(tx.commission.createMany).not.toHaveBeenCalled();
  });

  /**
   * DI-06 (F367) — the race the UNIQUE index exists to settle, and the reason
   * the mint has to read `count` rather than assume it wrote.
   *
   * Guard 1 above (`findFirst` on bookingId) is a TOCTOU: a second confirm rail
   * can commit the row between that read and this INSERT. With
   * `commissions_booking_id_key` in place, ON CONFLICT DO NOTHING makes the
   * loser a no-op — `count: 0` — rather than a P2002 that would abort the
   * caller's payment transaction.
   *
   * The OUTCOME matters, not just the absence of a duplicate row. Callers act
   * on it: booking.service and the two assignment paths write an OPS-05
   * `provider_earning_minted` money event when this returns 'minted'. Returning
   * 'minted' for a row somebody else wrote puts a second audit entry on the
   * money trail for one earning — a ledger that says two pandits were paid.
   */
  it('reports the losing side of a concurrent mint as already-owned, not minted', async () => {
    const tx = makeTx({
      commission: {
        // Guard 1 sees nothing: the racer had not committed yet.
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        // ...but by the time the INSERT runs it had, so ON CONFLICT DO NOTHING
        // wrote no row.
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    });

    const outcome = await mintProviderEarningForBooking(tx, BOOKING);

    expect(tx.commission.createMany).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('already-on-unified-rail');
    expect(outcome).not.toBe('minted');
  });
});

describe('re-attaching a pandit after the first one released the booking', () => {
  it('re-points the REVERSED row at the replacement pandit (booking_id is unique)', async () => {
    const tx = makeTx();
    (tx.commission as any).update = vi.fn().mockResolvedValue({});
    tx.commission.findFirst.mockResolvedValue({ id: 'cm-old', status: 'REVERSED' });

    const outcome = await mintProviderEarningForBooking(tx, BOOKING);

    expect(outcome).toBe('minted');
    expect(tx.commission.createMany).not.toHaveBeenCalled();
    const args = (tx.commission as any).update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'cm-old' });
    expect(args.data.providerId).toBe('user-pandit-1');
    expect(args.data.status).toBe('PENDING');
    expect(new Prisma.Decimal(args.data.amount).toString()).toBe('770');
  });

  it('still refuses when a LIVE commission already owns the booking', async () => {
    const tx = makeTx();
    tx.commission.findFirst.mockResolvedValue({ id: 'cm-live', status: 'PENDING' });
    expect(await mintProviderEarningForBooking(tx, BOOKING)).toBe('already-on-unified-rail');
  });
});
