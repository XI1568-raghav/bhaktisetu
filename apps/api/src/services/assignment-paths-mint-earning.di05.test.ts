import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

// dispatch.service needs a `dispatchOffer` model the shared deep mock predates.
const dispatchOfferMock = {
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
};
(prismaMock as any).dispatchOffer = dispatchOfferMock;

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

import { DispatchService } from './dispatch.service.js';
import { PriestService } from './priest.service.js';

/**
 * DI-05, root cause — the TWO assignment paths that bypass the mint.
 *
 * The first DI-05 fix put a re-mint inside booking.service.updateBookingStatus,
 * gated on EARNING_ATTACH_STATUSES. `priest_assigned` is in that set, so the
 * mint was meant to fire whenever a pandit is attached to a paid booking.
 *
 * It could not, on either of these two paths, because neither one goes through
 * updateBookingStatus. Both write `priestId` + `status:'priest_assigned'` with a
 * raw `pujaBooking.update`:
 *
 *   - DispatchService.accept   — the pandit wins a broadcast offer
 *   - PriestService.acceptBooking — the pandit accepts in his own portal
 *
 * So a pandit who took either door held NO Commission and NO PriestPayout, and
 * GET /priest/payouts fell to its legacy-only branch and answered him Rs 0 —
 * the finding's exact screen, still reachable after the first fix shipped.
 *
 * These assertions FAIL against the pre-fix code: neither file contained a
 * single commission `findFirst`/insert call (grep-verified), so no commission
 * was ever written on either path.
 *
 * DI-06 (F367): the mint's insert is now
 * `createMany({ data: [...], skipDuplicates: true })` — Prisma's
 * INSERT ... ON CONFLICT DO NOTHING — so the UNIQUE index on
 * `commissions.booking_id` settles a two-rail race inside the statement rather
 * than raising P2002, which inside the caller's `$transaction` would abort the
 * pandit's assignment. The assertions below follow the write.
 */

const scheduledDate = new Date('2026-09-15T00:00:00.000Z');

/** The post-assignment booking both paths write. 770 to the pandit of 1000. */
const ASSIGNED_ROW = {
  id: 'booking-1',
  priestId: 'priest-1',
  status: 'priest_assigned',
  priceAmount: new Prisma.Decimal('1000.00'),
  priestPayout: new Prisma.Decimal('770.00'),
  temple: { id: 't1', name: 'Test Temple' },
  pujaType: { id: 'p1', name: 'Satyanarayan' },
  user: { id: 'user-1', fullName: 'Ram', phone: null },
  priest: { displayName: 'Pandit A' },
};

/** The mint's four guards, all armed to PASS. */
function armMintGuards() {
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
  prismaMock.priestPayout.findFirst.mockResolvedValue(null as never);
  prismaMock.payment.count.mockResolvedValue(1 as never);
  // userId is for the earning mint; isVerified/status are for the self-pick approval check.
  prismaMock.priest.findUnique.mockResolvedValue({ userId: 'user-pandit-1', isVerified: true, status: 'active' } as never);
  prismaMock.commission.create.mockResolvedValue({ id: 'cm-new' } as never);
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);
}

function expectMintedSeventySeventy() {
  expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
  // DI-06: a bare `create` must not be reachable on this path any more — inside
  // the assignment transaction its P2002 would roll the assignment back.
  expect(prismaMock.commission.create).not.toHaveBeenCalled();
  const args = prismaMock.commission.createMany.mock.calls[0]![0] as {
    data: any[];
    skipDuplicates?: boolean;
  };
  expect(args.skipDuplicates).toBe(true);
  const data = args.data[0];
  expect(data.bookingId).toBe('booking-1');
  expect(data.providerId).toBe('user-pandit-1');
  expect(new Prisma.Decimal(data.amount).toString()).toBe('770');
  expect(data.status).toBe('PENDING');
}

// ─── path 1: winning a dispatch broadcast ────────────────────────────────────

describe('DI-05 — DispatchService.accept mints the pandit his earning', () => {
  let service: DispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DispatchService();

    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      priestId: null,
      scheduledDate,
      scheduledTimeSlot: '09:00',
      pujaType: { name: 'Satyanarayan' },
      temple: { name: 'Test Temple' },
      user: { id: 'user-1', fullName: 'Ram', phone: null },
      priest: { displayName: 'Pandit A' },
    } as never);
    dispatchOfferMock.findFirst.mockResolvedValue({
      id: 'offer-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);
    dispatchOfferMock.update.mockResolvedValue({});
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 0 });
    dispatchOfferMock.findMany.mockResolvedValue([]);
    // The update RETURNS the post-write row — that is what the mint must read.
    prismaMock.pujaBooking.update.mockResolvedValue(ASSIGNED_ROW as never);
    armMintGuards();
  });

  it('mints a Commission for the winning pandit', async () => {
    await service.accept('booking-1', 'priest-1');
    expectMintedSeventySeventy();
  });

  it('reads the pandit AFTER the assignment write, never off the pre-update row', async () => {
    await service.accept('booking-1', 'priest-1');
    // Minting off the pre-update snapshot reads priestId: null and silently
    // does nothing — the exact shape of the original bug.
    const updateAt = prismaMock.pujaBooking.update.mock.invocationCallOrder[0]!;
    const mintAt = prismaMock.commission.createMany.mock.invocationCallOrder[0]!;
    expect(updateAt).toBeLessThan(mintAt);
  });

  it('does not mint a second payable when the unified rail already owns the booking', async () => {
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'cm-existing' } as never);
    await service.accept('booking-1', 'priest-1');
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('does not mint when the LEGACY PriestPayout rail already owns the booking', async () => {
    prismaMock.priestPayout.findFirst.mockResolvedValue({ id: 'pp-existing' } as never);
    await service.accept('booking-1', 'priest-1');
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('never mints withdrawable balance on a booking with no captured payment', async () => {
    prismaMock.payment.count.mockResolvedValue(0 as never);
    await service.accept('booking-1', 'priest-1');
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });
});

// ─── path 2: the pandit accepting in his own portal ──────────────────────────

describe('DI-05 — PriestService.acceptBooking mints the pandit his earning', () => {
  let service: PriestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PriestService();

    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      priestId: null,
      scheduledDate,
      scheduledTimeSlot: '09:00',
    } as never);
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);
    prismaMock.pujaBooking.update.mockResolvedValue(ASSIGNED_ROW as never);
    armMintGuards();
  });

  it('mints a Commission for the accepting pandit', async () => {
    await service.acceptBooking('booking-1', 'priest-1');
    expectMintedSeventySeventy();
  });

  it('does the assignment and the mint in ONE transaction', async () => {
    await service.acceptBooking('booking-1', 'priest-1');
    // A mint outside the assignment transaction can commit against a booking
    // whose assignment then rolls back — money owed to nobody.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('still returns the hydrated booking to its caller', async () => {
    const out = await service.acceptBooking('booking-1', 'priest-1');
    expect(out.id).toBe('booking-1');
    expect(out.status).toBe('priest_assigned');
  });

  it('does not mint when the LEGACY PriestPayout rail already owns the booking', async () => {
    prismaMock.priestPayout.findFirst.mockResolvedValue({ id: 'pp-existing' } as never);
    await service.acceptBooking('booking-1', 'priest-1');
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('never mints an orphan when the Priest has no linked User', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ userId: null, isVerified: true, status: 'active' } as never);
    await service.acceptBooking('booking-1', 'priest-1');
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });
});
