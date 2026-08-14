import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./booking-notify.service.js', () => ({
  notifyDevotee: vi.fn().mockResolvedValue(undefined),
  buildBookingCtx: (b: unknown) => b,
}));

const sweepBookingOffers = vi.fn();
vi.mock('./dispatch.service.js', () => ({
  dispatchService: { sweepBookingOffers: (...a: unknown[]) => sweepBookingOffers(...a) },
}));

import { cancellationService } from './cancellation.service.js';

/**
 * NOTIF-10 — "immediate" must mean immediate.
 *
 * panditCancel sets `offerExpiresAt: new Date()` with the comment "trigger
 * immediate re-broadcast on next sweep". The next sweep was tick 13 of an
 * 18-tick chain on a 30-minute cadence, so a pandit dropping a booking left the
 * devotee unassigned and unre-offered for up to half an hour before anyone else
 * was even asked. Re-broadcast now happens on the spot; the cron sweep stays as
 * the safety net if this call fails.
 */
beforeEach(() => {
  vi.clearAllMocks();
  sweepBookingOffers.mockResolvedValue({ expired: 0, rebroadcast: 1, escalated: 0 });
  prismaMock.pujaBooking.findUnique.mockResolvedValueOnce({
    id: 'bk-1',
    priestId: 'p-1',
    status: 'priest_assigned',
  } as never);
  prismaMock.pujaBooking.update.mockResolvedValue({} as never);
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: 'bk-1',
    pujaType: { name: 'Satyanarayan' },
    temple: { name: 'Kashi' },
    user: { id: 'u-1', fullName: 'Anita', phone: null },
  } as never);
});

describe('a pandit-cancelled booking is re-broadcast on the spot (NOTIF-10)', () => {
  it('drives the dispatch sweep for that booking immediately', async () => {
    const res = await cancellationService.panditCancel('bk-1', 'p-1', 'unwell');

    expect(res).toEqual({ requeued: true, bookingId: 'bk-1' });
    await vi.waitFor(() => expect(sweepBookingOffers).toHaveBeenCalledWith('bk-1'));
  });

  it('still requeues when the immediate sweep fails — the cron sweep is the net', async () => {
    sweepBookingOffers.mockRejectedValue(new Error('DB blip'));
    await expect(cancellationService.panditCancel('bk-1', 'p-1')).resolves.toEqual({
      requeued: true,
      bookingId: 'bk-1',
    });
  });
});
