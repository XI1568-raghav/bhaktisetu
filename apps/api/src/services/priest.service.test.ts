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
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'confirmed',
      priestId: null,
    });
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
    });
    updateBookingStatusMock.mockResolvedValue({ id: 'bk-1', status: 'in_progress' });

    await service.startPuja('bk-1', 'priest-1');

    expect(updateBookingStatusMock).toHaveBeenCalledWith('bk-1', 'in_progress');
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

  it('delegates to BookingService.updateBookingStatus(completed)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: 'in_progress',
      priestId: 'priest-1',
    });
    updateBookingStatusMock.mockResolvedValue({ id: 'bk-1', status: 'completed' });

    await service.completePuja('bk-1', 'priest-1');

    expect(updateBookingStatusMock).toHaveBeenCalledWith('bk-1', 'completed');
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
