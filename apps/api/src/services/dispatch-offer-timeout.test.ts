import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * NOTIF-06 + NOTIF-10 — the two halves of an expired dispatch offer.
 *
 * NOTIF-06: `notifyPriest` had ZERO call sites, and `offer_timeout` was one of
 *   six declared BookingEvents that fired from nowhere. A pandit was never told
 *   his offer expired or that the booking had been reassigned away from him —
 *   the `pandit_offer_timeout` WhatsApp template and its push copy were written
 *   and unreachable.
 *
 * NOTIF-10: TIER_CONFIG.instant promises a 60-SECOND accept window, but the only
 *   thing that acted on an expired offer was sweepExpiredOffers, running as tick
 *   13 of an 18-tick chain on a 30-minute cadence. So round 2 of a 60-second
 *   offer landed up to 30 minutes late and the devotee's "we're re-matching"
 *   notice up to an hour late — on the tier sold as the paid differentiator.
 *   broadcast() now arms a timer for the actual accept window; the cron sweep
 *   stays as the safety net for a restart.
 */

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
const notifyPriest = vi.fn().mockResolvedValue(undefined);
const sendOfferToPriest = vi.fn().mockResolvedValue(undefined);
const priestContact = vi.fn();
vi.mock('./booking-notify.service.js', () => ({
  notifyDevotee: (...a: unknown[]) => notifyDevotee(...a),
  notifyPriest: (...a: unknown[]) => notifyPriest(...a),
  sendOfferToPriest: (...a: unknown[]) => sendOfferToPriest(...a),
  buildBookingCtx: (b: unknown) => b,
  priestContact: (...a: unknown[]) => priestContact(...a),
}));

import { DispatchService, __clearOfferTimersForTests } from './dispatch.service.js';

let service: DispatchService;

beforeEach(() => {
  vi.clearAllMocks();
  __clearOfferTimersForTests();
  service = new DispatchService();
  dispatchOfferMock.updateMany.mockResolvedValue({ count: 0 });
  dispatchOfferMock.findMany.mockResolvedValue([]);
  dispatchOfferMock.groupBy.mockResolvedValue([{ expiresAt: new Date(1) }]);
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.pujaBooking.update.mockResolvedValue({} as never);
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: 'bk-1',
    status: 'confirmed',
    priestId: null,
    dispatchTier: 'instant',
    offerExpiresAt: new Date(Date.now() - 1000),
    pujaType: { name: 'Satyanarayan' },
    temple: { name: 'Kashi Vishwanath' },
    user: { id: 'u-1', fullName: 'Anita', phone: '+919000000001' },
  } as never);
  priestContact.mockResolvedValue({ userId: 'priest-user-1', name: 'Pandit A', phone: '+91900000002' });
});

afterEach(() => {
  __clearOfferTimersForTests();
});

// ── NOTIF-06 ────────────────────────────────────────────────────────────────

describe('an expired offer tells the pandit (NOTIF-06)', () => {
  it('fires offer_timeout to every pandit whose offer just expired', async () => {
    dispatchOfferMock.findMany.mockResolvedValue([
      { id: 'o-1', bookingId: 'bk-1', priestId: 'p-1' },
      { id: 'o-2', bookingId: 'bk-1', priestId: 'p-2' },
    ]);
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 2 });

    await service.sweepExpiredOffers();
    await vi.waitFor(() => expect(notifyPriest).toHaveBeenCalledTimes(2));

    const events = notifyPriest.mock.calls.map((c) => c[2]);
    expect(events).toEqual(['offer_timeout', 'offer_timeout']);
    // Addressed to the pandit's own user + phone, not the devotee's.
    expect(notifyPriest.mock.calls[0]![0]).toBe('priest-user-1');
    expect(notifyPriest.mock.calls[0]![1]).toBe('+91900000002');
  });

  it('notifies nobody when no offer expired', async () => {
    dispatchOfferMock.findMany.mockResolvedValue([]);
    await service.sweepExpiredOffers();
    expect(notifyPriest).not.toHaveBeenCalled();
  });

  it('a pandit notification failure never breaks the sweep', async () => {
    dispatchOfferMock.findMany.mockResolvedValue([{ id: 'o-1', bookingId: 'bk-1', priestId: 'p-1' }]);
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 1 });
    notifyPriest.mockRejectedValue(new Error('bsp down'));

    await expect(service.sweepExpiredOffers()).resolves.toMatchObject({ expired: 1 });
  });

  it('still marks the offers expired', async () => {
    dispatchOfferMock.findMany.mockResolvedValue([{ id: 'o-1', bookingId: 'bk-1', priestId: 'p-1' }]);
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.sweepExpiredOffers();

    expect(res.expired).toBe(1);
    expect(dispatchOfferMock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'expired' }) }),
    );
  });
});

// ── NOTIF-10 ────────────────────────────────────────────────────────────────

describe('the 60-second instant window is acted on in 60 seconds (NOTIF-10)', () => {
  it('arms a timeout for the tier accept window when a broadcast goes out', async () => {
    vi.useFakeTimers();
    try {
      prismaMock.pujaBooking.findUnique.mockResolvedValue({
        id: 'bk-1',
        status: 'confirmed',
        priestId: null,
        pujaType: { name: 'Satyanarayan' },
        temple: { name: 'Kashi Vishwanath' },
        user: { id: 'u-1', fullName: 'Anita', phone: null },
        prasadAddress: null,
      } as never);
      dispatchOfferMock.findMany.mockResolvedValue([]);
      prismaMock.priest.findMany.mockResolvedValue([
        { id: 'p-1', displayName: 'Pandit A', userId: 'pu-1', lat: null, lng: null, city: null, serviceRadiusKm: 15, acceptanceRate: 1, lastSeenAt: new Date(), ratingAvg: 5 },
      ] as never);
      prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
      dispatchOfferMock.create.mockResolvedValue({});

      const sweepOne = vi.spyOn(service, 'sweepBookingOffers').mockResolvedValue({
        expired: 0,
        rebroadcast: 0,
        escalated: 0,
      });

      await service.broadcast('bk-1', 'instant');
      expect(sweepOne).not.toHaveBeenCalled();

      // instant acceptWindowSec = 60. Nothing must happen before it elapses...
      await vi.advanceTimersByTimeAsync(50_000);
      expect(sweepOne).not.toHaveBeenCalled();

      // ...and the booking must be resolved within seconds of it, not 30 minutes.
      await vi.advanceTimersByTimeAsync(20_000);
      expect(sweepOne).toHaveBeenCalledWith('bk-1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('sweepBookingOffers resolves exactly one booking and leaves the rest alone', async () => {
    dispatchOfferMock.findMany.mockResolvedValue([{ id: 'o-1', bookingId: 'bk-1', priestId: 'p-1' }]);
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 1 });
    const broadcastSpy = vi.spyOn(service, 'broadcast').mockResolvedValue(4);

    const res = await service.sweepBookingOffers('bk-1');

    expect(res.expired).toBe(1);
    expect(res.rebroadcast).toBe(1);
    expect(broadcastSpy).toHaveBeenCalledWith('bk-1', 'instant');
    // Scoped: it must never scan the whole stale-booking table.
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });

  it('does nothing when the pandit accepted inside the window', async () => {
    dispatchOfferMock.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'priest_assigned',
      priestId: 'p-9',
      dispatchTier: 'instant',
      offerExpiresAt: null,
    } as never);
    const broadcastSpy = vi.spyOn(service, 'broadcast');

    const res = await service.sweepBookingOffers('bk-1');

    expect(res).toEqual({ expired: 0, rebroadcast: 0, escalated: 0 });
    expect(broadcastSpy).not.toHaveBeenCalled();
    expect(notifyDevotee).not.toHaveBeenCalled();
  });

  it('escalates to the devotee once the rounds are used up', async () => {
    dispatchOfferMock.findMany.mockResolvedValue([]);
    dispatchOfferMock.groupBy.mockResolvedValue([
      { expiresAt: new Date(1) },
      { expiresAt: new Date(2) },
    ]);

    const res = await service.sweepBookingOffers('bk-1');

    expect(res.escalated).toBe(1);
    expect(notifyDevotee).toHaveBeenCalledWith('reassigned', expect.anything());
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith({
      where: { id: 'bk-1' },
      data: { offerExpiresAt: null },
    });
  });
});
