import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { updateBookingStatusMock, uploadVideoProofMock } = vi.hoisted(() => ({
  updateBookingStatusMock: vi.fn(),
  uploadVideoProofMock: vi.fn(),
}));
vi.mock('./booking.service.js', () => ({
  BookingService: vi.fn().mockImplementation(() => ({
    updateBookingStatus: updateBookingStatusMock,
    uploadVideoProof: uploadVideoProofMock,
  })),
}));

import { PriestService } from './priest.service.js';

let service: PriestService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new PriestService();
});

describe('PriestService.acceptBooking', () => {
  it('throws when booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    await expect(service.acceptBooking('bk-x', 'priest-1')).rejects.toThrow(/Booking not found/);
  });

  it('throws when booking already assigned to another priest', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'priest_assigned',
      priestId: 'priest-2',
    });
    await expect(service.acceptBooking('bk-1', 'priest-1')).rejects.toThrow(/different priest/);
  });

  it('throws when booking status is not confirmed/priest_assigned', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'pending_payment',
      priestId: null,
    });
    await expect(service.acceptBooking('bk-1', 'priest-1')).rejects.toThrow(/Cannot accept booking/);
  });

  it('updates booking to priest_assigned on success', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ isVerified: true, status: 'active' });
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'confirmed',
      priestId: null,
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
    });
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null);
    prismaMock.pujaBooking.update.mockResolvedValue({ id: 'bk-1', status: 'priest_assigned' });

    const out = await service.acceptBooking('bk-1', 'priest-1');

    expect(out.status).toBe('priest_assigned');
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk-1' },
        data: expect.objectContaining({ priestId: 'priest-1', status: 'priest_assigned' }),
      })
    );
  });

  it('throws when priest already has another booking at same date/time', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ isVerified: true, status: 'active' });
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'confirmed',
      priestId: null,
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
    });
    // Conflict: another non-cancelled booking for this priest at same slot
    prismaMock.pujaBooking.findFirst.mockResolvedValue({
      id: 'bk-other',
      bookingNumber: 'BS-20261225-OTHER',
    });

    await expect(service.acceptBooking('bk-1', 'priest-1')).rejects.toThrow(
      /already.*booking|double.book|conflict/i
    );

    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });
});

describe('PriestService.startPuja', () => {
  it('throws when booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    await expect(service.startPuja('bk-1', 'priest-1')).rejects.toThrow(/Booking not found/);
  });

  it('throws when priest is not the assigned one', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'priest_assigned',
      priestId: 'priest-2',
    });
    await expect(service.startPuja('bk-1', 'priest-1')).rejects.toThrow(/not assigned/);
  });

  it('delegates to BookingService.updateBookingStatus on success', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'priest_assigned',
      priestId: 'priest-1',
      scheduledDate: new Date('2020-01-01'),
      scheduledTimeSlot: '10:00',
    });
    updateBookingStatusMock.mockResolvedValue({ id: 'bk-1', status: 'in_progress' });

    await service.startPuja('bk-1', 'priest-1');

    expect(updateBookingStatusMock).toHaveBeenCalledWith('bk-1', 'in_progress');
  });

  it('refuses to start days before the scheduled date, with a 409 naming when it unlocks', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'priest_assigned',
      priestId: 'priest-1',
      scheduledDate: new Date('2999-01-01'),
      scheduledTimeSlot: '18:00',
    });
    const err = await service.startPuja('bk-1', 'priest-1').catch((e) => e);
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/can start this puja from 4:00 PM IST on 1 Jan 2999/);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });
});

describe('PriestService.completePuja', () => {
  it('throws when priest not assigned', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'in_progress',
      priestId: 'priest-other',
    });
    await expect(service.completePuja('bk-1', 'priest-1')).rejects.toThrow(/not assigned/);
  });

  it('refuses to complete a puja that was never started, with a 409', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'priest_assigned',
      priestId: 'priest-1',
    });
    const err = await service.completePuja('bk-1', 'priest-1').catch((e) => e);
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/start the puja before marking it complete/i);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it('refuses to complete without video proof, with a 409 in plain English', async () => {
    for (const videoProofUrl of [null, '', '   ']) {
      prismaMock.pujaBooking.findUnique.mockResolvedValue({
        id: 'bk-1',
        status: 'in_progress',
        priestId: 'priest-1',
        videoProofUrl,
      });
      const err = await service.completePuja('bk-1', 'priest-1').catch((e) => e);
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Upload the video proof before marking this puja complete.');
    }
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it('with proof on file: completes, then moves on to video_uploaded so the earning is released', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'in_progress',
      priestId: 'priest-1',
      videoProofUrl: 'https://r2/video.mp4',
    });
    updateBookingStatusMock
      .mockResolvedValueOnce({ id: 'bk-1', status: 'completed' })
      .mockResolvedValueOnce({ id: 'bk-1', status: 'video_uploaded' });

    const res = await service.completePuja('bk-1', 'priest-1');

    expect(updateBookingStatusMock).toHaveBeenNthCalledWith(1, 'bk-1', 'completed');
    expect(updateBookingStatusMock).toHaveBeenNthCalledWith(2, 'bk-1', 'video_uploaded');
    expect(res.status).toBe('video_uploaded');
  });

  it('refuses to complete before the slot has started, with 409 too_early_to_complete (video proof or not)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'in_progress',
      priestId: 'priest-1',
      videoProofUrl: 'https://r2/video.mp4',
      scheduledDate: new Date('2999-01-01T00:00:00Z'),
      scheduledTimeSlot: '18:00',
    });
    const err = await service.completePuja('bk-1', 'priest-1').catch((e) => e);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('too_early_to_complete');
    expect(err.message).toMatch(/cannot be marked complete before it starts, at 6:00 PM IST/);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it('completes once the slot (IST) has passed, and still needs the video proof', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'in_progress',
      priestId: 'priest-1',
      videoProofUrl: '',
      scheduledDate: new Date('2020-01-01T00:00:00Z'),
      scheduledTimeSlot: '18:00',
    });
    const noProof = await service.completePuja('bk-1', 'priest-1').catch((e) => e);
    expect(noProof.message).toBe('Upload the video proof before marking this puja complete.');

    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'in_progress',
      priestId: 'priest-1',
      videoProofUrl: 'https://r2/video.mp4',
      scheduledDate: new Date('2020-01-01T00:00:00Z'),
      scheduledTimeSlot: '18:00',
    });
    updateBookingStatusMock
      .mockResolvedValueOnce({ id: 'bk-1', status: 'completed' })
      .mockResolvedValueOnce({ id: 'bk-1', status: 'video_uploaded' });
    const res = await service.completePuja('bk-1', 'priest-1');
    expect(res.status).toBe('video_uploaded');
  });

  it('a booking left in completed WITH proof (legacy / half-finished) is finished, never stuck', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'completed',
      priestId: 'priest-1',
      videoProofUrl: 'https://r2/video.mp4',
    });
    updateBookingStatusMock.mockResolvedValue({ id: 'bk-1', status: 'video_uploaded' });

    await service.completePuja('bk-1', 'priest-1');

    expect(updateBookingStatusMock).toHaveBeenCalledTimes(1);
    expect(updateBookingStatusMock).toHaveBeenCalledWith('bk-1', 'video_uploaded');
  });
});

describe('PriestService.uploadVideoProof', () => {
  it('forwards to BookingService.uploadVideoProof', async () => {
    uploadVideoProofMock.mockResolvedValue({ ok: true });
    await service.uploadVideoProof('bk-1', 'priest-1', 'https://r2/video.mp4');
    expect(uploadVideoProofMock).toHaveBeenCalledWith('bk-1', 'priest-1', 'https://r2/video.mp4');
  });
});

describe('PriestService.getProfile', () => {
  it('throws when priest not found', async () => {
    prismaMock.priest.findUnique.mockResolvedValue(null);
    await expect(service.getProfile('priest-x')).rejects.toThrow(/Priest not found/);
  });

  it('returns flattened profile with stats and temples', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({
      id: 'priest-1',
      userId: 'u-1',
      displayName: 'Pt. Sharma',
      bio: 'Vedic',
      avatarUrl: null,
      specializations: ['Satyanarayan'],
      languages: ['Hindi', 'English'],
      experienceYears: 12,
      aadhaarVerified: true,
      isVerified: true,
      verificationStatus: 'approved',
      ratingAvg: 4.7,
      ratingCount: 30,
      commissionRate: 30,
      status: 'active',
      user: { fullName: 'Pt. Sharma', phone: '+919999', email: 'p@e' },
      temples: [
        { isPrimary: true, temple: { id: 't1', name: 'Kashi', city: 'Varanasi', state: 'UP', slug: 'kashi' } },
        { isPrimary: false, temple: { id: 't2', name: 'Tirupati', city: 'Tirupati', state: 'AP', slug: 'tirupati' } },
      ],
      createdAt: new Date('2026-01-01'),
    });
    prismaMock.pujaBooking.count.mockResolvedValueOnce(50).mockResolvedValueOnce(45);

    const out = await service.getProfile('priest-1');

    expect(out.displayName).toBe('Pt. Sharma');
    expect(out.temples).toHaveLength(2);
    expect(out.temples[0]!.isPrimary).toBe(true);
    expect(out.stats).toEqual({ totalBookings: 50, completedBookings: 45 });
  });
});

describe('PriestService.updateProfile', () => {
  it('only includes provided fields in update payload', async () => {
    prismaMock.priest.update.mockResolvedValue({ id: 'priest-1', displayName: 'New Name' });

    await service.updateProfile('priest-1', {
      displayName: 'New Name',
      experienceYears: 8,
    });

    const call = prismaMock.priest.update.mock.calls[0]![0]!;
    expect(call.where).toEqual({ id: 'priest-1' });
    expect(call.data).toEqual({ displayName: 'New Name', experienceYears: 8 });
    expect(call.data.bio).toBeUndefined();
  });

  it('passes through specializations + languages arrays', async () => {
    prismaMock.priest.update.mockResolvedValue({});
    await service.updateProfile('priest-1', {
      specializations: ['Rudrabhishek'],
      languages: ['Hindi', 'Sanskrit'],
    });

    const call = prismaMock.priest.update.mock.calls[0]![0]!;
    expect(call.data.specializations).toEqual(['Rudrabhishek']);
    expect(call.data.languages).toEqual(['Hindi', 'Sanskrit']);
  });
});

describe('PriestService.getPayoutHistory', () => {
  it('returns payouts + summary with sum/pending/lastPayout', async () => {
    prismaMock.priestPayout.findMany.mockResolvedValue([
      { id: 'po-1', amount: 1000, status: 'completed', payoutMethod: 'bank' },
    ]);
    prismaMock.priestPayout.count.mockResolvedValue(1);
    prismaMock.priestPayout.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 5000 } })
      .mockResolvedValueOnce({ _sum: { amount: 200 } });
    prismaMock.priestPayout.findFirst.mockResolvedValue({
      amount: 1000,
      processedAt: new Date('2026-04-01'),
    });

    const out = await service.getPayoutHistory('priest-1');

    expect(out.total).toBe(1);
    expect(out.summary.totalEarned).toBe(5000);
    expect(out.summary.pending).toBe(200);
    expect(out.summary.lastPayout?.amount).toBe(1000);
  });

  it('handles empty payouts (lastPayout=null, sum=0 fallback)', async () => {
    prismaMock.priestPayout.findMany.mockResolvedValue([]);
    prismaMock.priestPayout.count.mockResolvedValue(0);
    prismaMock.priestPayout.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    prismaMock.priestPayout.findFirst.mockResolvedValue(null);

    const out = await service.getPayoutHistory('priest-1');

    expect(out.summary.totalEarned).toBe(0);
    expect(out.summary.pending).toBe(0);
    expect(out.summary.lastPayout).toBeNull();
  });

  it('applies status filter to where clause', async () => {
    prismaMock.priestPayout.findMany.mockResolvedValue([]);
    prismaMock.priestPayout.count.mockResolvedValue(0);
    prismaMock.priestPayout.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    prismaMock.priestPayout.findFirst.mockResolvedValue(null);

    await service.getPayoutHistory('priest-1', { status: 'pending' });

    const call = prismaMock.priestPayout.findMany.mock.calls[0]![0]!;
    expect(call.where).toEqual({ priestId: 'priest-1', status: 'pending' });
  });
});
