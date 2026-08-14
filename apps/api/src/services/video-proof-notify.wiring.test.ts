import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * NOTIF-05 (P0) — the video-proof delivery promised IN WRITING has no email and
 * no WhatsApp implementation.
 *
 * The written promises:
 *   apps/api/src/lib/email.ts:146 (bookingConfirmationEmail body)
 *     "The priest will perform the puja and upload a video proof. You'll
 *      receive an email when the recording is ready."
 *   apps/web/app/nri-pujas/page.tsx:66
 *     "You receive a WhatsApp link within 24 hours of completion."
 *   apps/web/app/nri-pujas/page.tsx:131
 *     "Within 24 hours, a 3-7 minute video clip arrives on WhatsApp..."
 *
 * What actually shipped: no videoReadyEmail template existed at all, and the
 * BookingEvent 'video_ready' + its WhatsApp template 'puja_video_ready' were
 * declared at booking-notify.service.ts:114,127 and passed to notifyDevotee
 * from nowhere. The only thing that fired on video_uploaded was
 * pushMessageFor -> notifyUser — web-push only, which needs a desktop browser
 * with granted permission, i.e. essentially nobody in the NRI cohort paying
 * 9-10x for exactly this artefact.
 *
 * There are TWO paths that set `video_uploaded` and both must announce:
 *   booking.service.uploadVideoProof   (the pandit portal's upload — also
 *                                       mints the pandit payout, PF-02)
 *   booking.service.updateBookingStatus (the admin/status-PATCH transition)
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { notifyVideoReadyMock, createPriestPayoutMock, notifyUserMock } = vi.hoisted(() => ({
  notifyVideoReadyMock: vi.fn(),
  createPriestPayoutMock: vi.fn(),
  notifyUserMock: vi.fn(),
}));

vi.mock('./booking-notify.service.js', () => ({
  notifyVideoReady: notifyVideoReadyMock,
}));

vi.mock('./payment.service.js', () => ({
  paymentService: { createPriestPayout: createPriestPayoutMock },
}));

vi.mock('../routes/notifications.js', () => ({ notifyUser: notifyUserMock }));

import { BookingService } from './booking.service.js';

let service: BookingService;

/** Flush the fire-and-forget notify promise. */
const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  vi.clearAllMocks();
  notifyVideoReadyMock.mockResolvedValue(undefined);
  createPriestPayoutMock.mockResolvedValue(undefined);
  notifyUserMock.mockResolvedValue(0);
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  service = new BookingService();
});

// ── Path 1: the pandit portal's proof upload ─────────────────────────────────

describe('NOTIF-05 — uploadVideoProof announces the video', () => {
  beforeEach(() => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'completed',
      priestId: 'pr-1',
    } as never);
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20260812-ABCDE',
      status: 'video_uploaded',
      videoProofUrl: 'https://r2.example.com/proof.mp4',
      videoUploadedAt: new Date('2026-08-12T10:00:00Z'),
    } as never);
  });

  it('dispatches the video-ready notification — the pandit portal path was silent', async () => {
    await service.uploadVideoProof('booking-1', 'pr-1', 'https://r2.example.com/proof.mp4');
    await flush();

    expect(notifyVideoReadyMock).toHaveBeenCalledTimes(1);
    expect(notifyVideoReadyMock).toHaveBeenCalledWith('booking-1');
  });

  it('still mints the pandit payout — the notification is additive (PF-02 stays green)', async () => {
    await service.uploadVideoProof('booking-1', 'pr-1', 'https://r2.example.com/proof.mp4');
    await flush();

    expect(createPriestPayoutMock).toHaveBeenCalledWith('booking-1');
  });

  it('a notification failure never fails the upload the pandit just completed', async () => {
    notifyVideoReadyMock.mockRejectedValue(new Error('bsp down'));
    await expect(
      service.uploadVideoProof('booking-1', 'pr-1', 'https://r2.example.com/proof.mp4'),
    ).resolves.toMatchObject({ status: 'video_uploaded' });
    await flush();
  });

  it('does not announce when the upload was rejected', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed', // not 'completed' — upload refused
      priestId: 'pr-1',
    } as never);

    await expect(
      service.uploadVideoProof('booking-1', 'pr-1', 'https://r2.example.com/proof.mp4'),
    ).rejects.toThrow(/completed/);
    await flush();

    expect(notifyVideoReadyMock).not.toHaveBeenCalled();
  });
});

// ── Path 2: the status transition ────────────────────────────────────────────

describe('NOTIF-05 — updateBookingStatus(video_uploaded) announces the video', () => {
  beforeEach(() => {
    prismaMock.pujaBooking.findUnique
      .mockResolvedValueOnce({ id: 'booking-1', status: 'completed' } as never)
      .mockResolvedValue({
        id: 'booking-1',
        status: 'video_uploaded',
        priestId: 'pr-1',
        priestPayout: 700,
        currency: 'INR',
        bookingNumber: 'BS-20260812-ABCDE',
      } as never);
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'video_uploaded',
      priceAmount: 1000,
      platformCommission: 300,
      priestId: 'pr-1',
      priestPayout: 700,
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    } as never);
  });

  it('dispatches the full fan-out, not just the browser push', async () => {
    await service.updateBookingStatus('booking-1', 'video_uploaded' as never);
    await flush();

    expect(notifyVideoReadyMock).toHaveBeenCalledWith('booking-1');
  });

  it('does not ALSO fire the bare push — one video, one notification', async () => {
    // pushMessageFor already had 'video_ready' copy and fired notifyUser
    // directly. notifyVideoReady owns the whole fan-out (push + WhatsApp +
    // email) now, so leaving the old leg in place would double-push.
    await service.updateBookingStatus('booking-1', 'video_uploaded' as never);
    await flush();

    expect(notifyUserMock).not.toHaveBeenCalled();
  });

  it('leaves other transitions on the existing push path untouched', async () => {
    prismaMock.pujaBooking.findUnique.mockReset();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
    } as never);
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'cancelled',
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: null,
    } as never);

    await service.updateBookingStatus('booking-1', 'cancelled' as never);
    await flush();

    expect(notifyVideoReadyMock).not.toHaveBeenCalled();
    expect(notifyUserMock).toHaveBeenCalledTimes(1);
  });
});
