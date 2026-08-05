import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

// Mock the prisma module before importing the service
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import { BookingService } from './booking.service.js';

let service: BookingService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new BookingService();
});

// ─── createBooking ───────────────────────────────────────────────────────────

describe('BookingService.createBooking', () => {
  const validInput = {
    userId: 'user-1',
    templeId: 'temple-1',
    pujaTypeId: 'puja-1',
    templePujaOfferingId: 'offering-1',
    scheduledDate: '2026-12-25',
    scheduledTimeSlot: '10:00',
    devoteeNames: [{ name: 'Ram Prasad', gotra: 'Bharadwaj' }],
    prasadDeliveryRequested: false,
  };

  const mockOffering = {
    id: 'offering-1',
    templeId: 'temple-1',
    pujaTypeId: 'puja-1',
    isActive: true,
    availableSlots: ['10:00', '14:00', '18:00'],
    maxBookingsPerSlot: 5,
    priceOverride: null,
    pujaType: {
      basePrice: 500,
      nriPrice: 5000,
    },
    temple: {
      id: 'temple-1',
      name: 'Test Temple',
    },
  };

  it('throws if scheduledDate is in the past', async () => {
    // Past-date guard fires before any DB fetch — no mocks needed.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');

    await expect(
      service.createBooking({ ...validInput, scheduledDate: `${yyyy}-${mm}-${dd}` }),
    ).rejects.toThrow('Cannot book a past date');

    expect(prismaMock.templePujaOffering.findUnique).not.toHaveBeenCalled();
  });

  it('allows scheduledDate of today (same-day booking)', async () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-TODAY-XXXXX',
      status: 'pending_payment',
      priceAmount: 500,
      currency: 'INR',
      scheduledDate: new Date(`${yyyy}-${mm}-${dd}`),
      scheduledTimeSlot: '10:00',
      createdAt: new Date(),
    });

    const result = await service.createBooking({
      ...validInput,
      scheduledDate: `${yyyy}-${mm}-${dd}`,
    });
    expect(result.status).toBe('pending_payment');
  });

  // P0 #PBO-3 (2026-07-09): the charged total must include the platform fee
  // (₹51) and, when prasad delivery is requested, the prasad fee (₹150) —
  // previously only the base puja price was charged, leaking both fees.
  // Commission + priest payout stay on the PUJA price (fees are platform
  // revenue / prasad pass-through, not the priest's earned split).
  it('charges base + platform fee when prasad not requested', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-TODAY-XXXXX',
      status: 'pending_payment',
      priceAmount: 551,
      currency: 'INR',
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
      createdAt: new Date(),
    });

    await service.createBooking(validInput);
    const data = prismaMock.pujaBooking.create.mock.calls[0]![0] as any;
    // base 500 + platform 51 = 551
    expect(Number(data.data.priceAmount)).toBe(551);
    // Take-rate revamp (2026-08-04): platform 20% of PUJA price (500) = 100,
    // not of the total. (Was 30% = 150 before the supply-acquisition cut.)
    expect(Number(data.data.platformCommission)).toBeCloseTo(100, 6);
    // priest payout 80% of PUJA price (500) = 400 (was 70% = 350)
    expect(Number(data.data.priestPayout)).toBeCloseTo(400, 6);
  });

  it('charges base + platform fee + prasad fee when prasad requested', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.userAddress.findFirst.mockResolvedValue({ id: 'addr-1' });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-TODAY-XXXXX',
      status: 'pending_payment',
      priceAmount: 701,
      currency: 'INR',
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
      createdAt: new Date(),
    });

    await service.createBooking({
      ...validInput,
      prasadDeliveryRequested: true,
      prasadDeliveryAddressId: 'addr-1',
    });
    const data = prismaMock.pujaBooking.create.mock.calls[0]![0] as any;
    // base 500 + platform 51 + prasad 150 = 701
    expect(Number(data.data.priceAmount)).toBe(701);
    // commission still 20% of PUJA price (500) = 100 — fees not in the split
    expect(Number(data.data.platformCommission)).toBeCloseTo(100, 6);
    expect(Number(data.data.priestPayout)).toBeCloseTo(400, 6);
  });

  it('throws if offering not found', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(null);

    await expect(service.createBooking(validInput)).rejects.toThrow(
      'Temple puja offering not found.',
    );
  });

  it('throws if offering is inactive', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      ...mockOffering,
      isActive: false,
    });

    await expect(service.createBooking(validInput)).rejects.toThrow(
      'This puja offering is currently inactive.',
    );
  });

  it('throws if temple/puja IDs do not match offering', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      ...mockOffering,
      templeId: 'different-temple',
    });

    await expect(service.createBooking(validInput)).rejects.toThrow(
      'Offering does not match the specified temple and puja type.',
    );
  });

  it('throws if time slot is not available for the offering', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);

    await expect(
      service.createBooking({ ...validInput, scheduledTimeSlot: '08:00' }),
    ).rejects.toThrow('Invalid time slot');
  });

  it('throws if slot is fully booked', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(5); // max is 5

    await expect(service.createBooking(validInput)).rejects.toThrow(
      'No availability for the selected slot',
    );
  });

  it('throws if user not found', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.createBooking(validInput)).rejects.toThrow('User not found.');
  });

  it('creates a booking with correct pricing for domestic user', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null); // booking number unique
    prismaMock.pujaBooking.create.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'pending_payment',
      priceAmount: 500,
      currency: 'INR',
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
      createdAt: new Date(),
    });

    const result = await service.createBooking(validInput);

    expect(result.status).toBe('pending_payment');
    expect(result.currency).toBe('INR');
    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
  });

  it('uses NRI price for NRI users', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: true });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'pending_payment',
      priceAmount: 5000,
      currency: 'USD',
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
      createdAt: new Date(),
    });

    const result = await service.createBooking(validInput);

    expect(result.currency).toBe('USD');
    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
    const createCall = prismaMock.pujaBooking.create.mock.calls[0]![0];
    expect(createCall.data.currency).toBe('USD');
  });

  it('validates prasad delivery address belongs to user', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.userAddress.findFirst.mockResolvedValue(null);

    await expect(
      service.createBooking({
        ...validInput,
        prasadDeliveryRequested: true,
        prasadDeliveryAddressId: 'addr-1',
      }),
    ).rejects.toThrow('Prasad delivery address not found');
  });
});

// ─── updateBookingStatus ─────────────────────────────────────────────────────

describe('BookingService.updateBookingStatus', () => {
  it('throws if booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);

    await expect(service.updateBookingStatus('booking-1', 'confirmed' as any)).rejects.toThrow(
      'Booking not found.',
    );
  });

  it('throws for invalid state transition', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'completed',
    });

    await expect(service.updateBookingStatus('booking-1', 'confirmed' as any)).rejects.toThrow(
      'Invalid status transition',
    );
  });

  it('allows valid transition from pending_payment to confirmed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'pending_payment',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: null,
    });

    const result = await service.updateBookingStatus('booking-1', 'confirmed' as any);
    expect(result.status).toBe('confirmed');
  });

  it('allows transition from confirmed to priest_assigned', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'priest_assigned',
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    });

    const result = await service.updateBookingStatus('booking-1', 'priest_assigned' as any);
    expect(result.status).toBe('priest_assigned');
  });

  it('does not allow transition from refunded to any status', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'refunded',
    });

    await expect(service.updateBookingStatus('booking-1', 'confirmed' as any)).rejects.toThrow(
      'Invalid status transition',
    );
  });

  // P0 #pp-01 (2026-07-09): the service denylist must strip financial/identity
  // fields from the data payload even if a caller smuggles them in — they are
  // server-authoritative and must never be client-settable via a status PATCH.
  it('strips forbidden financial/identity fields from data (denylist)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'completed',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'video_uploaded',
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    });

    await service.updateBookingStatus(
      'booking-1',
      'video_uploaded' as any,
      {
        videoProofUrl: 'https://r2.example.com/proof.mp4',
        // smuggled fields that must be stripped:
        priestPayout: 999999,
        platformCommission: 0,
        priceAmount: 1,
        userId: 'attacker-uuid',
        priestId: 'attacker-priest-uuid',
        id: 'forged-id',
      } as any,
    );

    const updateCall = prismaMock.pujaBooking.update.mock.calls[0]![0]!;
    expect(updateCall.data).toMatchObject({
      status: 'video_uploaded',
      videoProofUrl: 'https://r2.example.com/proof.mp4',
    });
    // None of the smuggled fields survive into the Prisma update.
    expect(updateCall.data).not.toHaveProperty('priestPayout');
    expect(updateCall.data).not.toHaveProperty('platformCommission');
    expect(updateCall.data).not.toHaveProperty('priceAmount');
    expect(updateCall.data).not.toHaveProperty('userId');
    expect(updateCall.data).not.toHaveProperty('priestId');
    expect(updateCall.data).not.toHaveProperty('id');
  });

  // P0 #pp-02 (2026-07-09): transitioning a booking to video_uploaded (or
  // delivered) must mint a PriestPayout row — otherwise the priest Earnings +
  // Payouts dashboards are permanently ₹0. createPriestPayout is fire-and-
  // forget from the service, so we flush the microtask queue before asserting.
  it('writes a PriestPayout on transition to video_uploaded', async () => {
    // Valid transition: completed -> video_uploaded (priest uploads proof).
    // updateBookingStatus calls findUnique first (needs status: 'completed' to
    // allow the transition); createPriestPayout then re-fetches the SAME booking
    // and needs the post-transition row (status: 'video_uploaded' + priestId +
    // priestPayout) for its guard + amount. So queue two resolves in order.
    prismaMock.pujaBooking.findUnique
      .mockResolvedValueOnce({
        id: 'booking-1',
        status: 'completed',
      })
      .mockResolvedValue({
        id: 'booking-1',
        status: 'video_uploaded',
        priestId: 'pr-1',
        priestPayout: 700,
        currency: 'INR',
        bookingNumber: 'BK-1',
      });
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
    });
    // createPriestPayout internal lookups (it re-fetches the booking).
    prismaMock.priest.findUnique.mockResolvedValue({
      id: 'pr-1',
      aadhaarVerified: true,
      displayName: 'Pandit Joshi',
    });
    prismaMock.priestPayout.findFirst.mockResolvedValue(null);
    prismaMock.priestPayout.create.mockResolvedValue({
      id: 'payout-1',
      priestId: 'pr-1',
      bookingId: 'booking-1',
      amount: 700,
    });

    const result = await service.updateBookingStatus('booking-1', 'video_uploaded' as any);
    expect(result.status).toBe('video_uploaded');

    // Flush the fire-and-forget createPriestPayout promise.
    await new Promise((r) => setImmediate(r));

    expect(prismaMock.priestPayout.create).toHaveBeenCalled();
    const createCall = prismaMock.priestPayout.create.mock.calls[0]![0] as any;
    expect(createCall.data.bookingId).toBe('booking-1');
    expect(createCall.data.priestId).toBe('pr-1');
    expect(Number(createCall.data.amount)).toBe(700);
    expect(createCall.data.status).toBe('pending');
  });

  it('does NOT write a PriestPayout on transition to completed (video not uploaded yet)', async () => {
    // Valid transition: in_progress -> completed (puja performed, no proof yet).
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'in_progress',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'completed',
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    });

    await service.updateBookingStatus('booking-1', 'completed' as any);
    await new Promise((r) => setImmediate(r));

    // createPriestPayout is only fired on video_uploaded/delivered — completed
    // means the puja was performed but the proof video is not yet uploaded.
    expect(prismaMock.priestPayout.create).not.toHaveBeenCalled();
  });
});

// ─── cancelBooking ───────────────────────────────────────────────────────────

describe('BookingService.cancelBooking', () => {
  it('throws if booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);

    await expect(service.cancelBooking('booking-1', 'user-1')).rejects.toThrow(
      'Booking not found.',
    );
  });

  it('throws if user is not the booking owner', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'different-user',
      status: 'confirmed',
      payments: [],
    });

    await expect(service.cancelBooking('booking-1', 'user-1')).rejects.toThrow(
      'not authorized to cancel',
    );
  });

  it('throws if booking is not in a cancellable status', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'completed',
      payments: [],
    });

    await expect(service.cancelBooking('booking-1', 'user-1')).rejects.toThrow(
      'cannot be cancelled',
    );
  });

  it('allows cancellation for pending_payment without time check', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'pending_payment',
      scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      payments: [],
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: null,
    });

    const result = await service.cancelBooking('booking-1', 'user-1');
    expect(result.status).toBe('cancelled');
    expect(result.requiresRefund).toBe(false);
  });

  it('throws if cancelling within 24 hours for confirmed booking', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'confirmed',
      scheduledDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      payments: [],
    });

    await expect(service.cancelBooking('booking-1', 'user-1')).rejects.toThrow('within 24 hours');
  });

  it('allows cancellation more than 24 hours before for confirmed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'confirmed',
      scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      payments: [],
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'Changed plans',
    });

    const result = await service.cancelBooking('booking-1', 'user-1', 'Changed plans');
    expect(result.status).toBe('cancelled');
  });

  it('returns requiresRefund=true when payment is captured', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'confirmed',
      scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      payments: [{ id: 'pay-1', amount: 500 }],
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: null,
    });

    const result = await service.cancelBooking('booking-1', 'user-1');
    expect(result.requiresRefund).toBe(true);
    expect(result.capturedPaymentId).toBe('pay-1');
  });
});

// ─── getBookingById ──────────────────────────────────────────────────────────

describe('BookingService.getBookingById', () => {
  it('throws if booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);

    await expect(service.getBookingById('booking-1')).rejects.toThrow('Booking not found.');
  });

  it('throws if userId does not match booking owner', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-a',
    });

    await expect(service.getBookingById('booking-1', 'user-b')).rejects.toThrow(
      'not authorized to view',
    );
  });

  it('returns booking when user matches', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'confirmed',
      temple: { id: 'temple-1', name: 'Test Temple' },
      pujaType: { id: 'puja-1', name: 'Test Puja' },
      priest: null,
      payments: [],
      prasadAddress: null,
    };
    prismaMock.pujaBooking.findUnique.mockResolvedValue(mockBooking);

    const result = await service.getBookingById('booking-1', 'user-1');
    expect(result.id).toBe('booking-1');
    expect(result.bookingNumber).toBe('BS-20261225-ABC12');
  });

  it('returns booking without userId check when userId not provided', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      bookingNumber: 'BS-20261225-ABC12',
    };
    prismaMock.pujaBooking.findUnique.mockResolvedValue(mockBooking);

    const result = await service.getBookingById('booking-1');
    expect(result.id).toBe('booking-1');
  });
});

// ─── getUserBookings ─────────────────────────────────────────────────────────

describe('BookingService.getUserBookings', () => {
  it('returns paginated bookings for a user', async () => {
    const mockBookings = [
      { id: 'b1', bookingNumber: 'BS-1', status: 'confirmed' },
      { id: 'b2', bookingNumber: 'BS-2', status: 'completed' },
    ];
    prismaMock.pujaBooking.findMany.mockResolvedValue(mockBookings);
    prismaMock.pujaBooking.count.mockResolvedValue(2);

    const result = await service.getUserBookings('user-1');

    expect(result.bookings).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('applies status filter', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.count.mockResolvedValue(0);

    await service.getUserBookings('user-1', { status: 'confirmed' as any });

    const findManyCall = prismaMock.pujaBooking.findMany.mock.calls[0]![0];
    expect(findManyCall.where.status).toBe('confirmed');
  });

  it('applies date range filters', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.count.mockResolvedValue(0);

    await service.getUserBookings('user-1', {
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });

    const findManyCall = prismaMock.pujaBooking.findMany.mock.calls[0]![0];
    expect(findManyCall.where.scheduledDate).toBeDefined();
  });

  it('applies pagination parameters', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.count.mockResolvedValue(100);

    const result = await service.getUserBookings('user-1', {
      page: 3,
      limit: 10,
    });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(10);
    const findManyCall = prismaMock.pujaBooking.findMany.mock.calls[0]![0];
    expect(findManyCall.skip).toBe(20); // (3-1) * 10
    expect(findManyCall.take).toBe(10);
  });
});

// ─── uploadVideoProof ────────────────────────────────────────────────────────

describe('BookingService.uploadVideoProof', () => {
  it('throws if booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);

    await expect(
      service.uploadVideoProof('booking-1', 'priest-1', 'https://video.url'),
    ).rejects.toThrow('Booking not found.');
  });

  it('throws if priest is not assigned to the booking', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      priestId: 'different-priest',
      status: 'completed',
    });

    await expect(
      service.uploadVideoProof('booking-1', 'priest-1', 'https://video.url'),
    ).rejects.toThrow('Only the assigned priest');
  });

  it('throws if booking is not in completed status', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      priestId: 'priest-1',
      status: 'confirmed',
    });

    await expect(
      service.uploadVideoProof('booking-1', 'priest-1', 'https://video.url'),
    ).rejects.toThrow('can only be uploaded for bookings in "completed" status');
  });

  it('uploads video proof and transitions to video_uploaded', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      priestId: 'priest-1',
      status: 'completed',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'video_uploaded',
      videoProofUrl: 'https://video.url',
      videoUploadedAt: new Date(),
    });

    const result = await service.uploadVideoProof('booking-1', 'priest-1', 'https://video.url');

    expect(result.status).toBe('video_uploaded');
    expect(result.videoProofUrl).toBe('https://video.url');
  });
});

// ─── submitReview ────────────────────────────────────────────────────────────

describe('BookingService.submitReview', () => {
  it('throws if rating is below 1', async () => {
    await expect(service.submitReview('booking-1', 'user-1', 0)).rejects.toThrow(
      'Rating must be an integer between 1 and 5.',
    );
  });

  it('throws if rating is above 5', async () => {
    await expect(service.submitReview('booking-1', 'user-1', 6)).rejects.toThrow(
      'Rating must be an integer between 1 and 5.',
    );
  });

  it('throws if rating is not an integer', async () => {
    await expect(service.submitReview('booking-1', 'user-1', 3.5)).rejects.toThrow(
      'Rating must be an integer between 1 and 5.',
    );
  });

  it('throws if booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);

    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(
      'Booking not found.',
    );
  });

  it('throws if user is not the booking owner', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'different-user',
      status: 'delivered',
      priestId: 'priest-1',
      rating: null,
    });

    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(
      'not authorized to review',
    );
  });

  it('throws if booking status is not delivered or video_uploaded', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'confirmed',
      priestId: 'priest-1',
      rating: null,
    });

    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(
      'Reviews can only be submitted',
    );
  });

  it('throws if a review already exists', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'delivered',
      priestId: 'priest-1',
      rating: 4,
    });

    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(
      'review has already been submitted',
    );
  });

  it('submits review and updates priest aggregate rating', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'delivered',
      priestId: 'priest-1',
      rating: null,
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      rating: 5,
      reviewText: 'Excellent!',
    });
    // Changed 2026-07-17: submitReview now updates the priest aggregate via a
    // single atomic SQL UPDATE ($executeRawUnsafe) instead of a read-modify-
    // write (findUnique + update) that raced under concurrent reviews. The
    // average is computed inside the SQL statement, so we assert the call
    // shape rather than the pre-computed JS value.
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);

    const result = await service.submitReview('booking-1', 'user-1', 5, 'Excellent!');

    expect(result.rating).toBe(5);
    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, ratingArg, priestIdArg] = prismaMock.$executeRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE priests/);
    expect(sql).toMatch(/rating_count \+ 1/);
    expect(ratingArg).toBe(5);
    expect(priestIdArg).toBe('priest-1');
    // priest.findUnique + priest.update are no longer called for the aggregate.
    expect(prismaMock.priest.update).not.toHaveBeenCalled();
  });
});

// ─── checkSlotAvailability ───────────────────────────────────────────────────

describe('BookingService.checkSlotAvailability', () => {
  it('returns unavailable if offering not found', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(null);

    const result = await service.checkSlotAvailability('temple-1', 'puja-1', '2026-12-25');

    expect(result.available).toBe(false);
    expect(result.slots).toHaveLength(0);
  });

  it('returns unavailable if offering is inactive', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      id: 'offering-1',
      isActive: false,
    });

    const result = await service.checkSlotAvailability('temple-1', 'puja-1', '2026-12-25');

    expect(result.available).toBe(false);
  });

  it('returns slots with availability counts', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      id: 'offering-1',
      isActive: true,
      availableSlots: ['10:00', '14:00'],
      maxBookingsPerSlot: 5,
      temple: { name: 'Test Temple', slug: 'test-temple' },
      pujaType: { name: 'Test Puja', slug: 'test-puja', durationMinutes: 60 },
    });
    prismaMock.pujaBooking.groupBy.mockResolvedValue([
      { scheduledTimeSlot: '10:00', _count: { id: 3 } },
    ]);

    const result = await service.checkSlotAvailability('temple-1', 'puja-1', '2026-12-25');

    expect(result.available).toBe(true);
    expect(result.slots).toHaveLength(2);

    const slot10 = result.slots.find((s: any) => s.time === '10:00');
    expect(slot10!.booked).toBe(3);
    expect(slot10!.remaining).toBe(2);
    expect(slot10!.available).toBe(true);

    const slot14 = result.slots.find((s: any) => s.time === '14:00');
    expect(slot14!.booked).toBe(0);
    expect(slot14!.remaining).toBe(5);
    expect(slot14!.available).toBe(true);
  });

  it('marks fully booked slots as unavailable', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      id: 'offering-1',
      isActive: true,
      availableSlots: ['10:00'],
      maxBookingsPerSlot: 3,
      temple: { name: 'Test Temple', slug: 'test-temple' },
      pujaType: { name: 'Test Puja', slug: 'test-puja', durationMinutes: 60 },
    });
    prismaMock.pujaBooking.groupBy.mockResolvedValue([
      { scheduledTimeSlot: '10:00', _count: { id: 3 } },
    ]);

    const result = await service.checkSlotAvailability('temple-1', 'puja-1', '2026-12-25');

    expect(result.available).toBe(false);
    expect(result.slots[0]!.available).toBe(false);
    expect(result.slots[0]!.remaining).toBe(0);
  });
});

// ─── escalateStaleBookings (SLA, issue #179) ────────────────────────────────

describe('BookingService.escalateStaleBookings', () => {
  it('flags priest_assigned bookings past 72h with no videoProof for refund review (cancelled)', async () => {
    const stale = {
      id: 'booking-stale-1',
      scheduledDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
      priestId: 'priest-1',
    };
    prismaMock.pujaBooking.findMany.mockResolvedValue([stale] as any);
    prismaMock.pujaBooking.update.mockResolvedValue({ ...stale, status: 'cancelled' } as any);

    const out = await service.escalateStaleBookings(72);

    expect(out.escalated).toContain('booking-stale-1');
    expect(out.scanned).toBe(1);
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-stale-1' },
      data: { status: 'cancelled' },
    });
  });

  it('queries only priest_assigned + null videoProof + scheduled before cutoff', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([] as any);
    const out = await service.escalateStaleBookings(72);
    const where = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where;
    expect(where.status).toBe('priest_assigned');
    expect(where.videoProofUrl).toBeNull();
    expect(where.scheduledDate.lt).toBeInstanceOf(Date);
    expect(out.escalated).toEqual([]);
    expect(out.scanned).toBe(0);
  });

  it('does nothing when no stale bookings exist', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([] as any);
    const out = await service.escalateStaleBookings(72);
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    expect(out).toEqual({ escalated: [], scanned: 0 });
  });
});
