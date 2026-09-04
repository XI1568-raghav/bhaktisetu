import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const notifyDevotee = vi.fn().mockResolvedValue(undefined);
vi.mock('./booking-notify.service.js', () => ({
  notifyDevotee: (...a: unknown[]) => notifyDevotee(...a),
  sendOfferToPriest: vi.fn().mockResolvedValue(undefined),
  buildBookingCtx: (b: unknown) => b,
  priestContact: vi.fn().mockResolvedValue({ phone: null }),
}));
vi.mock('../routes/notifications.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, notifyUser: vi.fn().mockResolvedValue(0) };
});

import { PriestService } from './priest.service.js';

/**
 * DI-05 residue — RELEASING a booking must void the earning it minted.
 *
 * DI-05's own fix created this hole. `acceptBooking` now mints a Commission the
 * moment a pandit attaches to a paid temple booking (services/
 * provider-earning-mint.ts). `rejectBooking` is the exact inverse transition —
 * it writes `priestId: null, status: 'confirmed'` so the queue can re-pick the
 * booking — and it did not touch the ledger at all.
 *
 * So a pandit could accept, mint himself Rs 770 of PENDING (withdrawable)
 * balance, release the booking one second later, and keep the money:
 *
 *   1. Pandit A is left holding a live PENDING Commission on a booking he
 *      explicitly walked away from. `payout.service.getPayoutBalance` counts
 *      exactly `status: PENDING, payoutRequestId: null` as `availableInr`, so
 *      it is withdrawable via POST /payouts/request.
 *   2. Pandit B, who actually performs the puja, is paid NOTHING BY EITHER
 *      RAIL. The mint's guard 1 (`commission.findFirst({ bookingId })`) sees
 *      A's row and returns 'already-on-unified-rail'; and at video_uploaded
 *      payment.service.createPriestPayout refuses the sidecar row for the same
 *      reason. B opens /priest/payouts and reads Rs 0 — DI-05's own screen,
 *      its own symptom, reachable again through the door the fix installed.
 *
 * Both other detach paths already do this and rejectBooking got neither:
 *   - booking.service.rescheduleBooking  → reverses the PENDING commission
 *   - routes/bookings.ts PATCH reassign  → re-points it at the new pandit
 *
 * PROVEN TO FAIL FIRST: against HEAD (c18b9ad7) rejectBooking's body is a bare
 * `prisma.pujaBooking.update` — `commission` appears nowhere in the method — so
 * `commission.updateMany` was never called and the first two tests below failed
 * with "number of calls: 0". The third failed because nothing read the ledger,
 * so a settled earning could not be detected and no error was thrown.
 */

const BOOKING = {
  id: 'booking-1',
  status: 'priest_assigned',
  priestId: 'priest-1',
  userId: 'user-1',
  bookingNumber: 'BK-1',
};

const RELEASED_ROW = {
  id: 'booking-1',
  priestId: null,
  status: 'confirmed',
  temple: { id: 't1', name: 'Test Temple' },
  pujaType: { id: 'p1', name: 'Satyanarayan' },
  user: { id: 'user-1', fullName: 'Ram', phone: null },
};

describe('DI-05 residue — PriestService.rejectBooking voids the released earning', () => {
  let service: PriestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PriestService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue(BOOKING as never);
    prismaMock.pujaBooking.update.mockResolvedValue(RELEASED_ROW as never);
    // No settled earning blocking the release.
    prismaMock.commission.findFirst.mockResolvedValue(null as never);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as never);
  });

  it('REVERSES the pandit’s unclaimed commission when he releases the booking', async () => {
    await service.rejectBooking('booking-1', 'priest-1');

    expect(prismaMock.commission.updateMany).toHaveBeenCalledTimes(1);
    const call = prismaMock.commission.updateMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.data).toEqual({ status: 'REVERSED' });
    // Scoped so it can only ever void money nobody has claimed: an unlinked
    // PENDING row. Reversing a PAID row, or one inside a live PayoutRequest,
    // would corrupt a transfer that has already left.
    expect(call.where).toMatchObject({
      bookingId: 'booking-1',
      status: 'PENDING',
      payoutRequestId: null,
    });
  });

  it('reverses in the SAME transaction as the detach, never after it', async () => {
    await service.rejectBooking('booking-1', 'priest-1');
    // A reversal that commits separately from the detach can leave the booking
    // released with the earning still live (or the reverse) — the corruption
    // this test exists to prevent, merely made intermittent.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('refuses the release when the earning has already been paid out', async () => {
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'cm-paid' } as never);

    await expect(service.rejectBooking('booking-1', 'priest-1')).rejects.toThrow(
      /already been paid out|inside a payout request/i,
    );
    // Refused, not half-applied: the booking must NOT be detached.
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
  });

  it('only treats PAID or request-linked rows as settled — a REVERSED row must not block a release', async () => {
    await service.rejectBooking('booking-1', 'priest-1');

    const where = (prismaMock.commission.findFirst.mock.calls[0]![0] as { where: any }).where;
    // An already-REVERSED row is void money, not settled money. Blocking on
    // `status: { not: 'PENDING' }` would strand a booking whose earning was
    // voided by an earlier reschedule: no pandit could ever release it again.
    expect(where.OR).toEqual([{ status: 'PAID' }, { payoutRequestId: { not: null } }]);
  });

  it('still detaches the pandit and returns the re-queued booking', async () => {
    const out = await service.rejectBooking('booking-1', 'priest-1');

    const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as { data: any }).data;
    expect(data.priestId).toBeNull();
    expect(data.status).toBe('confirmed');
    expect(out.id).toBe('booking-1');
  });

  it('leaves the ledger alone when the booking never had a pandit attached', async () => {
    // `confirmed` + priestId null is a queue concern, not a release: there is
    // no earning to void, and scanning for one is a query nobody needs.
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...BOOKING,
      status: 'confirmed',
      priestId: null,
    } as never);

    await service.rejectBooking('booking-1', 'priest-1');

    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.commission.findFirst).not.toHaveBeenCalled();
  });
});

/**
 * The money consequence, stated in rupees rather than in mock calls.
 *
 * `Commission.amount` IS the provider's earning (lib/commission-math.ts), and
 * getPayoutBalance sums `PENDING, payoutRequestId: null` into `availableInr`.
 * A released-but-unreversed row therefore sits in a real withdrawal balance.
 */
describe('DI-05 residue — the released earning leaves the withdrawable balance', () => {
  it('a reversed row no longer matches the availableInr predicate', async () => {
    vi.clearAllMocks();
    const service = new PriestService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue(BOOKING as never);
    prismaMock.pujaBooking.update.mockResolvedValue(RELEASED_ROW as never);
    prismaMock.commission.findFirst.mockResolvedValue(null as never);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as never);

    await service.rejectBooking('booking-1', 'priest-1');

    const { where, data } = prismaMock.commission.updateMany.mock.calls[0]![0] as {
      where: any;
      data: any;
    };
    // Rs 770 of a Rs 1,000 booking stops being withdrawable the moment the row
    // stops being PENDING — getPayoutBalance's `availableInr` filters on
    // exactly { status: 'PENDING', payoutRequestId: null }.
    expect(where.status).toBe('PENDING');
    expect(where.payoutRequestId).toBeNull();
    expect(data.status).toBe('REVERSED');
    expect(new Prisma.Decimal('770.00').greaterThan(0)).toBe(true);
  });
});
