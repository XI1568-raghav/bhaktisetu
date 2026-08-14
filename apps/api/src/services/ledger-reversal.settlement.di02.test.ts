import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { reduceBookingLedgerForPartialRefund } from './ledger-reversal.service.js';

/**
 * DI-02 (P1) — the remaining half: THE SCREEN THE MONEY ACTUALLY LEAVES FROM.
 *
 * The proportional unwind landed on the Commission ledger and the TemplePayout
 * rows, and both refund rails call it. What it never touched is the PERSISTED
 * SPLIT on the booking itself — `PujaBooking.priestPayout` and
 * `PujaBooking.platformCommission` — or the PriestPayout sidecar rail.
 *
 * That matters because a partial refund deliberately does NOT flip the booking
 * out of a paid status (payment.service, RV-12: "a partial does NOT flip the
 * booking to 'refunded'"). So the booking stays `completed`/`video_uploaded`/
 * `delivered`, and GET /admin/bookings/payouts/pending — which since DI-03 sums
 * `priestPayout` as "the authoritative, fee-exclusive split that must be
 * settled" (routes/admin-bookings.ts:152-156, :250) — keeps quoting the FULL
 * pre-refund figure. Settlement there is a manual bank/UPI transfer, so that is
 * what an admin actually pays out.
 *
 * Concretely, on the finding's own case (Rs 1,100 puja, 75% tier, Rs 825 back):
 *   Commission.amount  770.00 -> 192.50   (fixed 2026-08-12)
 *   TemplePayout       55.00  -> 13.75    (fixed 2026-08-12)
 *   PujaBooking.priestPayout  770.00 -> 770.00  <-- still the whole amount
 * so the ledger says Rs 192.50 and the settlement queue says Rs 770.00 for the
 * same pandit on the same booking, and the queue wins because that is where the
 * transfer is keyed.
 *
 * It also covers the OTHER rail literally: on the temple booking path no
 * Commission is ever minted (DI-05), so the Commission scaling above finds zero
 * rows and a partial refund on that path used to reverse absolutely nothing.
 */

type Row = { id: string; amount: string };

/** Minimal transaction double covering every table the helper touches. */
function makeTx(opts: {
  commissions?: Array<{ id: string; amount: string }>;
  templePayouts?: Array<{ id: string; amount: string }>;
  priestPayouts?: Array<{ id: string; amount: string }>;
  booking?: { priestPayout: string; platformCommission: string } | null;
  settledCount?: number;
}) {
  const commissionUpdates: Row[] = [];
  const templeUpdates: Row[] = [];
  const priestPayoutUpdates: Row[] = [];
  const bookingUpdates: Array<Record<string, unknown>> = [];
  const tx = {
    commission: {
      findMany: vi.fn(async () => opts.commissions ?? []),
      count: vi.fn(async () => opts.settledCount ?? 0),
      update: vi.fn(async (args: { where: { id: string }; data: { amount: Prisma.Decimal } }) => {
        commissionUpdates.push({ id: args.where.id, amount: args.data.amount.toString() });
        return {};
      }),
    },
    templePayout: {
      findMany: vi.fn(async () => opts.templePayouts ?? []),
      update: vi.fn(async (args: { where: { id: string }; data: { amount: Prisma.Decimal } }) => {
        templeUpdates.push({ id: args.where.id, amount: args.data.amount.toString() });
        return {};
      }),
    },
    priestPayout: {
      findMany: vi.fn(async () => opts.priestPayouts ?? []),
      update: vi.fn(async (args: { where: { id: string }; data: { amount: Prisma.Decimal } }) => {
        priestPayoutUpdates.push({ id: args.where.id, amount: args.data.amount.toString() });
        return {};
      }),
    },
    pujaBooking: {
      findUnique: vi.fn(async () =>
        opts.booking === undefined
          ? { priestPayout: new Prisma.Decimal('770.00'), platformCommission: new Prisma.Decimal('330.00') }
          : opts.booking,
      ),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        bookingUpdates.push(args.data);
        return {};
      }),
    },
  };
  return { tx, commissionUpdates, templeUpdates, priestPayoutUpdates, bookingUpdates };
}

const D = (s: string) => new Prisma.Decimal(s);

/** The last booking.update payload carrying a money column, if any. */
function splitWrite(bookingUpdates: Array<Record<string, unknown>>) {
  const hit = bookingUpdates.find((d) => 'priestPayout' in d || 'platformCommission' in d);
  if (!hit) return null;
  return {
    priestPayout: String(hit.priestPayout),
    platformCommission: String(hit.platformCommission),
  };
}

describe('DI-02 — the persisted split on the booking follows the refund', () => {
  it('scales PujaBooking.priestPayout so the settlement queue stops quoting the pre-refund figure', async () => {
    // The finding's case: Rs 1,100 refundable, Rs 825 refunded (75% tier).
    // Retained = Rs 275 => retain factor 0.25.
    const { tx, bookingUpdates } = makeTx({
      commissions: [{ id: 'c1', amount: '770.00' }],
      booking: { priestPayout: '770.00', platformCommission: '330.00' },
    });

    await reduceBookingLedgerForPartialRefund(tx as never, 'booking-1', {
      refundAmount: D('825.00'),
      refundableBefore: D('1100.00'),
      reason: 'devotee cancelled — 75% tier',
    });

    const written = splitWrite(bookingUpdates);
    expect(written, 'the persisted split was never rewritten').not.toBeNull();
    expect(written!.priestPayout).toBe('192.5');
  });

  it('scales platformCommission by the same factor — the split must stay coherent', async () => {
    const { tx, bookingUpdates } = makeTx({
      commissions: [{ id: 'c1', amount: '770.00' }],
      booking: { priestPayout: '770.00', platformCommission: '330.00' },
    });

    await reduceBookingLedgerForPartialRefund(tx as never, 'booking-1', {
      refundAmount: D('825.00'),
      refundableBefore: D('1100.00'),
      reason: 'devotee cancelled — 75% tier',
    });

    const written = splitWrite(bookingUpdates);
    expect(written!.platformCommission).toBe('82.5');
  });

  it('scales the PriestPayout sidecar rail — the temple path has no Commission to scale', async () => {
    // DI-05: a booking made through the temple path never mints a Commission,
    // so `claimable` is empty and the 2026-08-12 fix reversed literally nothing
    // on that path. PriestPayout is the only provider rail it has.
    const { tx, priestPayoutUpdates, commissionUpdates } = makeTx({
      commissions: [],
      priestPayouts: [{ id: 'pp1', amount: '770.00' }],
      booking: { priestPayout: '770.00', platformCommission: '330.00' },
    });

    await reduceBookingLedgerForPartialRefund(tx as never, 'booking-1', {
      refundAmount: D('825.00'),
      refundableBefore: D('1100.00'),
      reason: 'devotee cancelled — 75% tier',
    });

    expect(commissionUpdates, 'no Commission exists on the temple path').toEqual([]);
    expect(priestPayoutUpdates).toEqual([{ id: 'pp1', amount: '192.5' }]);
  });

  it('a full-value refund zeroes the persisted split rather than leaving it payable', async () => {
    const { tx, bookingUpdates } = makeTx({
      commissions: [{ id: 'c1', amount: '770.00' }],
      booking: { priestPayout: '770.00', platformCommission: '330.00' },
    });

    await reduceBookingLedgerForPartialRefund(tx as never, 'booking-1', {
      refundAmount: D('1100.00'),
      refundableBefore: D('1100.00'),
      reason: 'refunded in full through the partial rail',
    });

    const written = splitWrite(bookingUpdates);
    expect(written!.priestPayout).toBe('0');
  });

  it('does nothing when there is no refund to apply', async () => {
    const { tx, bookingUpdates } = makeTx({
      commissions: [{ id: 'c1', amount: '770.00' }],
      booking: { priestPayout: '770.00', platformCommission: '330.00' },
    });

    await reduceBookingLedgerForPartialRefund(tx as never, 'booking-1', {
      refundAmount: D('0'),
      refundableBefore: D('1100.00'),
      reason: 'no-op',
    });

    expect(splitWrite(bookingUpdates)).toBeNull();
  });

  it('survives a booking row that is not a puja booking — Commission.bookingId is not an FK', async () => {
    // AW-06: `Commission.bookingId` also carries consultation ids, so the
    // PujaBooking lookup can miss. That must not abort the caller's
    // transaction and lose the scaling writes that already landed.
    const { tx, commissionUpdates } = makeTx({
      commissions: [{ id: 'c1', amount: '770.00' }],
      booking: null,
    });

    await expect(
      reduceBookingLedgerForPartialRefund(tx as never, 'consultation-1', {
        refundAmount: D('825.00'),
        refundableBefore: D('1100.00'),
        reason: 'consultation partial refund',
      }),
    ).resolves.toMatchObject({ scaledCommissions: 1 });
    expect(commissionUpdates).toEqual([{ id: 'c1', amount: '192.5' }]);
  });
});
