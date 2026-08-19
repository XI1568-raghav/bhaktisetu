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
    expect(tx.commission.create).toHaveBeenCalledTimes(1);
    const data = (tx.commission.create.mock.calls[0]![0] as { data: any }).data;
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
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it('is idempotent — an existing commission on the booking blocks a second mint', async () => {
    const tx = makeTx({
      commission: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cm-existing' }),
        create: vi.fn(),
      },
    });
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);
    expect(outcome).toBe('already-on-unified-rail');
    expect(tx.commission.create).not.toHaveBeenCalled();
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
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it('never mints withdrawable balance on an unpaid booking', async () => {
    const tx = makeTx({ payment: { count: vi.fn().mockResolvedValue(0) } });
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);
    expect(outcome).toBe('no-captured-payment');
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it('never mints an orphan — a Priest with no linked User is not payable', async () => {
    const tx = makeTx({ priest: { findUnique: vi.fn().mockResolvedValue({ userId: null }) } });
    const outcome = await mintProviderEarningForBooking(tx, BOOKING);
    expect(outcome).toBe('provider-has-no-user');
    expect(tx.commission.create).not.toHaveBeenCalled();
  });
});
