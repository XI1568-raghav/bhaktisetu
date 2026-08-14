import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * NOTIF-06 (P1) — the remaining half: `in_progress` and `completed`.
 *
 * The sweep found 6 of 11 declared BookingEvents with no producer anywhere in
 * the repo. The first pass wired `offer_timeout` (dispatch.service's sweep, so
 * `notifyPriest` finally has a caller) and `video_ready` (NOTIF-05), and
 * deleted `eta` outright rather than leave a promise the product does not keep.
 *
 * What was left is the middle of the lifecycle. `updateBookingStatus` is the
 * ONLY writer of `in_progress` and `completed`, and `pushMessageFor` returns
 * `null` for both — so a devotee whose puja starts and finishes is told
 * literally nothing on any channel, while `puja_started` / `puja_completed`
 * sit written and unreachable in TEMPLATE and pushTextFor.
 *
 * `cancelled` is the third: the devotee-initiated route
 * (POST /bookings/:id/cancel) does fan out, but the two paths that reach
 * `cancelled` through this service — the admin PATCH and the unpaid-hold expiry
 * sweep — only ever fired a bare web push, which is the "anything beyond a
 * browser push" the finding names. cancelBooking uses a raw `pujaBooking.update`
 * and never enters this method, so wiring it here cannot double-send.
 *
 * These tests bind to the FAN-OUT, not the push: asserting `notifyUser` was
 * called would pass against the old code for `cancelled` and could never pass
 * for the other two.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { notifyVideoReadyMock, notifyBookingEventMock, createPriestPayoutMock, notifyUserMock } =
  vi.hoisted(() => ({
    notifyVideoReadyMock: vi.fn(),
    notifyBookingEventMock: vi.fn(),
    createPriestPayoutMock: vi.fn(),
    notifyUserMock: vi.fn(),
  }));

vi.mock('./booking-notify.service.js', () => ({
  notifyVideoReady: notifyVideoReadyMock,
  notifyBookingEvent: notifyBookingEventMock,
}));

vi.mock('./payment.service.js', () => ({
  paymentService: { createPriestPayout: createPriestPayoutMock },
}));

vi.mock('../routes/notifications.js', () => ({ notifyUser: notifyUserMock }));

import { BookingService } from './booking.service.js';

let service: BookingService;

/** Flush the fire-and-forget notify promise. */
const flush = () => new Promise((r) => setImmediate(r));

function updatedRow(status: string) {
  return {
    id: 'booking-1',
    status,
    priceAmount: 1000,
    platformCommission: 300,
    priestId: 'pr-1',
    priestPayout: 700,
    bookingNumber: 'BS-20260814-ABCDE',
    pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
    temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
    user: { id: 'u-1' },
    priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  notifyVideoReadyMock.mockResolvedValue(undefined);
  notifyBookingEventMock.mockResolvedValue(undefined);
  createPriestPayoutMock.mockResolvedValue(undefined);
  notifyUserMock.mockResolvedValue(0);
  prismaMock.$transaction.mockImplementation(async (fn: unknown) =>
    (fn as (tx: unknown) => unknown)(prismaMock),
  );
  service = new BookingService();
});

describe('NOTIF-06 — the puja-started transition tells the devotee', () => {
  beforeEach(() => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'priest_assigned',
    } as never);
    prismaMock.pujaBooking.update.mockResolvedValue(updatedRow('in_progress'));
  });

  it('fans out `in_progress` — it produced nothing at all before', async () => {
    await service.updateBookingStatus('booking-1', 'in_progress' as never);
    await flush();

    expect(notifyBookingEventMock).toHaveBeenCalledTimes(1);
    expect(notifyBookingEventMock).toHaveBeenCalledWith('booking-1', 'in_progress');
  });

  it('a notification failure never fails the status flip', async () => {
    notifyBookingEventMock.mockRejectedValue(new Error('bsp down'));
    await expect(
      service.updateBookingStatus('booking-1', 'in_progress' as never),
    ).resolves.toMatchObject({ status: 'in_progress' });
    await flush();
  });
});

describe('NOTIF-06 — the puja-completed transition tells the devotee', () => {
  beforeEach(() => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'in_progress',
    } as never);
    prismaMock.pujaBooking.update.mockResolvedValue(updatedRow('completed'));
  });

  it('fans out `completed` — the puja_completed template had no producer', async () => {
    await service.updateBookingStatus('booking-1', 'completed' as never);
    await flush();

    expect(notifyBookingEventMock).toHaveBeenCalledWith('booking-1', 'completed');
  });
});

describe('NOTIF-06 — the service-side cancellation path', () => {
  beforeEach(() => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
    } as never);
    prismaMock.pujaBooking.update.mockResolvedValue(updatedRow('cancelled'));
  });

  it('fans out `cancelled` instead of only pushing to a browser', async () => {
    await service.updateBookingStatus('booking-1', 'cancelled' as never);
    await flush();

    expect(notifyBookingEventMock).toHaveBeenCalledWith('booking-1', 'cancelled');
  });

  it('does not ALSO fire the bare push — one cancellation, one notification', async () => {
    // notifyBookingEvent owns the push leg. Leaving pushMessageFor's
    // `cancelled` branch in place would send the devotee two identical pushes.
    await service.updateBookingStatus('booking-1', 'cancelled' as never);
    await flush();

    expect(notifyUserMock).not.toHaveBeenCalled();
  });
});

describe('NOTIF-06 — the transitions that already had a producer are untouched', () => {
  it('priest_assigned still uses the existing push leg and does not double-fan-out', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
    } as never);
    prismaMock.pujaBooking.update.mockResolvedValue(updatedRow('priest_assigned'));
    prismaMock.priest.findUnique.mockResolvedValue({
      userId: 'u-priest',
      displayName: 'Pandit Joshi',
    } as never);

    await service.updateBookingStatus('booking-1', 'priest_assigned' as never);
    await flush();

    // priest.service / dispatch.service own the 'assigned' fan-out; this method
    // must not add a second one.
    expect(notifyBookingEventMock).not.toHaveBeenCalled();
    expect(notifyUserMock).toHaveBeenCalledTimes(1);
  });

  it('video_uploaded still routes through notifyVideoReady, not the generic fan-out', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'completed',
    } as never);
    prismaMock.pujaBooking.update.mockResolvedValue(updatedRow('video_uploaded'));

    await service.updateBookingStatus('booking-1', 'video_uploaded' as never);
    await flush();

    expect(notifyVideoReadyMock).toHaveBeenCalledWith('booking-1');
    expect(notifyBookingEventMock).not.toHaveBeenCalled();
  });
});
