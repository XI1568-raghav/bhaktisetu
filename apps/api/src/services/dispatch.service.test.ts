import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

// The shared deep mock in lib/__mocks__/prisma.ts predates the dispatch engine,
// so it has no `dispatchOffer` model at all. Attached here rather than there:
// that file is shared by every suite, and vitest gives this file its own module
// registry so nothing leaks out of it.
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

// Notification fan-out is fire-and-forget and irrelevant to what is under test
// here; stub it so nothing reaches WhatsApp/push/email.
const notifyDevotee = vi.fn().mockResolvedValue(undefined);
const sendOfferToPriest = vi.fn().mockResolvedValue(undefined);
const priestContact = vi.fn().mockResolvedValue({ phone: null });
vi.mock('./booking-notify.service.js', () => ({
  notifyDevotee: (...a: unknown[]) => notifyDevotee(...a),
  sendOfferToPriest: (...a: unknown[]) => sendOfferToPriest(...a),
  buildBookingCtx: (b: unknown) => b,
  priestContact: (...a: unknown[]) => priestContact(...a),
}));

import { DispatchService } from './dispatch.service.js';
import { priestSlotKey } from '../lib/priest-slot.js';

let service: DispatchService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new DispatchService();
});

// ─── accept: the priest-slot advisory lock (S3-01) ───────────────────────────

describe('DispatchService.accept — priest-slot serialization', () => {
  const scheduledDate = new Date('2026-09-15T00:00:00.000Z');

  function armHappyPath() {
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
    prismaMock.pujaBooking.update.mockResolvedValue({} as never);
    dispatchOfferMock.findMany.mockResolvedValue([]);
  }

  it('takes pg_advisory_xact_lock on the shared priest-slot key', async () => {
    armHappyPath();

    await service.accept('booking-1', 'priest-1');

    const lockCalls = prismaMock.$queryRawUnsafe.mock.calls;
    expect(lockCalls.length).toBeGreaterThan(0);
    expect(String(lockCalls[0]![0])).toContain('pg_advisory_xact_lock');
    // The SAME key space routes/bookings.ts locks on. A lock derived any other
    // way is the same as no lock at all, so this asserts the shared derivation,
    // not just "some lock was taken".
    expect(lockCalls[0]![1]).toBe(priestSlotKey('priest-1', scheduledDate, '09:00'));
  });

  it('takes the lock BEFORE reading the conflict row', async () => {
    armHappyPath();

    await service.accept('booking-1', 'priest-1');

    // A lock acquired after the conflict read leaves the TOCTOU window wide
    // open — the whole point is that the racing writer has COMMITted by the time
    // we run the findFirst.
    const lockAt = prismaMock.$queryRawUnsafe.mock.invocationCallOrder[0]!;
    const conflictReadAt = prismaMock.pujaBooking.findFirst.mock.invocationCallOrder[0]!;
    expect(lockAt).toBeLessThan(conflictReadAt);
  });

  it('ignores an abandoned unpaid hold when checking for a double booking', async () => {
    armHappyPath();

    await service.accept('booking-1', 'priest-1');

    const where = prismaMock.pujaBooking.findFirst.mock.calls[0]![0]!.where as any;
    expect(where.priestId).toBe('priest-1');
    expect(where.AND[0]).toEqual({ status: { notIn: ['cancelled', 'refunded'] } });
    expect(where.AND[1].NOT.status).toBe('pending_payment');
    expect(where.AND[1].NOT.createdAt.lt).toBeInstanceOf(Date);
  });

  it('still refuses when a real conflicting booking exists', async () => {
    armHappyPath();
    prismaMock.pujaBooking.findFirst.mockResolvedValue({ id: 'other-booking' } as never);

    await expect(service.accept('booking-1', 'priest-1')).rejects.toThrow(
      /already have another booking/i,
    );
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });
});

// ─── selectCandidates: geo is a refinement, never a dead end (S3-12) ─────────

describe('DispatchService.selectCandidates — geo filtering', () => {
  const base = {
    displayName: 'Pandit',
    acceptanceRate: 1,
    lastSeenAt: new Date(),
    ratingAvg: 5,
    serviceRadiusKm: 15,
  };

  it('returns candidates when the booking has coordinates but no priest does', async () => {
    // The default state of the pool: nothing in onboarding writes Priest.lat/lng.
    // The old code replaced the pool with the (empty) radius-filtered list, so
    // broadcast sent 0 offers, never set offerExpiresAt, and the booking became
    // invisible to sweepExpiredOffers forever.
    prismaMock.priest.findMany.mockResolvedValue([
      { ...base, id: 'p1', userId: 'u1', lat: null, lng: null, city: 'Gurugram' },
      { ...base, id: 'p2', userId: 'u2', lat: null, lng: null, city: 'Delhi' },
    ] as never);

    const out = await service.selectCandidates({
      tier: 'instant',
      bookingLat: 28.4595,
      bookingLng: 77.0266,
      bookingCity: null,
    });

    expect(out.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('still narrows to the service radius when priests do have coordinates', async () => {
    prismaMock.priest.findMany.mockResolvedValue([
      // ~700km away (Mumbai) — outside a 15km radius.
      { ...base, id: 'far', userId: 'uf', lat: 19.076, lng: 72.8777, city: 'Mumbai' },
      // Same city block as the booking.
      { ...base, id: 'near', userId: 'un', lat: 28.46, lng: 77.03, city: 'Gurugram' },
    ] as never);

    const out = await service.selectCandidates({
      tier: 'instant',
      bookingLat: 28.4595,
      bookingLng: 77.0266,
      bookingCity: null,
    });

    expect(out.map((p) => p.id)).toEqual(['near']);
  });

  it('falls back to the city match when the radius excludes everyone', async () => {
    prismaMock.priest.findMany.mockResolvedValue([
      { ...base, id: 'far', userId: 'uf', lat: 19.076, lng: 72.8777, city: 'Mumbai' },
      { ...base, id: 'local', userId: 'ul', lat: null, lng: null, city: 'Gurugram' },
    ] as never);

    const out = await service.selectCandidates({
      tier: 'instant',
      bookingLat: 28.4595,
      bookingLng: 77.0266,
      bookingCity: 'Gurugram',
    });

    expect(out.map((p) => p.id)).toEqual(['local']);
  });
});

// ─── sweepExpiredOffers: per-booking escalation (S3-11) ──────────────────────

describe('DispatchService.sweepExpiredOffers', () => {
  beforeEach(() => {
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.pujaBooking.update.mockResolvedValue({} as never);
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'x',
      pujaType: { name: 'Satyanarayan' },
      temple: { name: 'T' },
      user: { id: 'u', fullName: 'Ram', phone: null },
    } as never);
  });

  it('does not escalate a booking that was just successfully rebroadcast', async () => {
    // `b-esc` is FIRST on purpose: with the old `|| escalated` counter test, its
    // escalation poisoned every later booking in the same sweep.
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      { id: 'b-esc', dispatchTier: 'instant' },
      { id: 'b-ok', dispatchTier: 'instant' },
    ] as never);
    // instant: maxRounds 2. b-esc has had both rounds; b-ok has had one.
    dispatchOfferMock.groupBy.mockImplementation(async (args: any) =>
      args.where.bookingId === 'b-esc'
        ? [{ expiresAt: new Date(1) }, { expiresAt: new Date(2) }]
        : [{ expiresAt: new Date(1) }],
    );
    const broadcastSpy = vi.spyOn(service, 'broadcast').mockResolvedValue(3);

    const res = await service.sweepExpiredOffers();

    expect(res).toEqual({ expired: 0, rebroadcast: 1, escalated: 1 });
    // broadcast() has already set a fresh offerExpiresAt for b-ok. Nulling it —
    // which the old code did — makes the booking invisible to every future sweep,
    // because the stale query requires `offerExpiresAt < now`.
    const clearedIds = prismaMock.pujaBooking.update.mock.calls
      .filter((c: any) => c[0].data?.offerExpiresAt === null)
      .map((c: any) => c[0].where.id);
    expect(clearedIds).toEqual(['b-esc']);
    // ...and the devotee of a booking that was just re-offered to 3 pandits is
    // not told we are re-matching / offering a refund.
    expect(notifyDevotee).toHaveBeenCalledTimes(1);
    // Round is no longer threaded through a parameter nothing read.
    expect(broadcastSpy).toHaveBeenCalledWith('b-ok', 'instant');
  });

  it('escalates when the rebroadcast finds no candidates', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      { id: 'b-empty', dispatchTier: 'instant' },
    ] as never);
    dispatchOfferMock.groupBy.mockResolvedValue([{ expiresAt: new Date(1) }]);
    vi.spyOn(service, 'broadcast').mockResolvedValue(0);

    const res = await service.sweepExpiredOffers();

    expect(res).toEqual({ expired: 0, rebroadcast: 0, escalated: 1 });
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith({
      where: { id: 'b-empty' },
      data: { offerExpiresAt: null },
    });
  });

  it('counts rounds by distinct offer batch, not by dividing the offer count', async () => {
    // Two thin rounds (2 offers each on a 6-candidate tier) are two rounds. The
    // old `Math.ceil(4 / 6)` read them as one and granted a third broadcast.
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      { id: 'b-thin', dispatchTier: 'instant' },
    ] as never);
    dispatchOfferMock.groupBy.mockResolvedValue([
      { expiresAt: new Date(1) },
      { expiresAt: new Date(2) },
    ]);
    const broadcastSpy = vi.spyOn(service, 'broadcast');

    const res = await service.sweepExpiredOffers();

    expect(dispatchOfferMock.groupBy).toHaveBeenCalledWith({
      by: ['expiresAt'],
      where: { bookingId: 'b-thin' },
    });
    expect(broadcastSpy).not.toHaveBeenCalled();
    expect(res.escalated).toBe(1);
  });
});
