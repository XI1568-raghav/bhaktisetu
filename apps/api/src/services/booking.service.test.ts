import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

// RV-03 / RV-10 (2026-08-10): the shared deep mock in lib/__mocks__/prisma.ts
// predates temple_payouts and priest_puja_offerings, so neither model is on it.
// The old code hid that behind a try/catch that swallowed the resulting
// TypeError; now that the temple-share write is inside the confirm transaction
// (and must NOT swallow), the models have to exist. Augmenting the shared
// object here rather than editing it keeps this test file self-contained —
// vitest gives every test file its own module registry, so this cannot leak.
const templePayoutMock = { findFirst: vi.fn(), create: vi.fn() };
const priestPujaOfferingMock = { findUnique: vi.fn() };
(prismaMock as any).templePayout = templePayoutMock;
(prismaMock as any).priestPujaOffering = priestPujaOfferingMock;

// Mock the prisma module before importing the service
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import { BookingService, writeTemplePayoutOnConfirm } from './booking.service.js';

let service: BookingService;

beforeEach(() => {
  vi.clearAllMocks();
  // vi.clearAllMocks() clears calls but not implementations, so the shared
  // $transaction stub keeps running its callback against prismaMock.
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
      // RV-09: business rule 6 — only a verified temple is bookable.
      isVerified: true,
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

  // This test used to assert `currency === 'USD'` — it ENCODED the RV-01
  // residual found on 2026-08-11: nriPrice is an INR column, and that currency
  // string flowed straight into razorpay.orders.create, asking the gateway for
  // $10,000 on a Rs 10,000 booking. NRI users pay the NRI *price*, in INR.
  it('uses the NRI price for NRI users — and still bills in INR', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: true });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'pending_payment',
      priceAmount: 5000,
      currency: 'INR',
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
      createdAt: new Date(),
    });

    const result = await service.createBooking(validInput);

    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
    const createCall = prismaMock.pujaBooking.create.mock.calls[0]![0];
    // The NRI price IS applied...
    expect(Number(createCall.data.priceAmount)).toBeGreaterThan(1100);
    // ...but the currency is INR. Razorpay is the only rail and INR the only
    // currency; a 'USD' here is an ~83x overcharge at the gateway.
    expect(createCall.data.currency).toBe('INR');
    expect(result.currency).toBe('INR');
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

  // ── RV-09 (2026-08-10): business rule 6 — temples must be verified ─────────
  // An unverified temple was bookable end-to-end on the temple-anchored path:
  // no gate on read, none on write, and the booking then accrued a TemplePayout
  // to an unvetted trust account while the platform carried the whole refund /
  // chargeback liability.

  it('rejects a booking at an unverified temple (rule 6)', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      ...mockOffering,
      temple: { id: 'temple-1', name: 'Unvetted Temple', isVerified: false },
    });

    await expect(service.createBooking(validInput)).rejects.toThrow(
      'This temple has not been verified yet.',
    );
    // Fails before any pricing work or slot count.
    expect(prismaMock.pujaBooking.create).not.toHaveBeenCalled();
  });

  it('rejects when the offering carries no temple relation at all', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      ...mockOffering,
      temple: null,
    });

    await expect(service.createBooking(validInput)).rejects.toThrow('has not been verified');
  });

  it('gates on verification BEFORE the temple/pujaType consistency check', async () => {
    // Ordering matters: an unverified temple must not be able to probe the
    // offering-consistency error to enumerate valid ids.
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      ...mockOffering,
      templeId: 'different-temple',
      temple: { id: 'different-temple', name: 'Unvetted', isVerified: false },
    });

    await expect(service.createBooking(validInput)).rejects.toThrow('has not been verified');
  });

  // ── RV-15 (2026-08-10): slot capacity was a count-then-create TOCTOU ───────
  // The count and the create sat 2-4 DB round-trips apart with no transaction
  // and no lock, so concurrent bookings oversold the slot.

  it('locks the slot and re-checks capacity inside the create transaction', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({ id: 'booking-1', status: 'pending_payment' });

    await service.createBooking(validInput);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    // Advisory lock keyed on offering + date + slot, taken before the re-count.
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, key] = prismaMock.$queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(key).toBe('puja-slot:offering-1:2026-12-25:10:00');
    // Two counts: the cheap pre-check, then the authoritative one under the lock.
    expect(prismaMock.pujaBooking.count).toHaveBeenCalledTimes(2);
    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
  });

  it('rejects when the slot fills between the pre-check and the locked re-count', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    // Pre-check sees 4/5 and passes; by the time the lock is held it is 5/5.
    prismaMock.pujaBooking.count.mockResolvedValueOnce(4).mockResolvedValue(5);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);

    await expect(service.createBooking(validInput)).rejects.toThrow(
      'No availability for the selected slot',
    );
    // The whole point: no oversold row is written.
    expect(prismaMock.pujaBooking.create).not.toHaveBeenCalled();
  });

  it('still books when the advisory lock statement is unavailable (degrades, never blocks)', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    // Once only — vi.clearAllMocks() clears calls but not implementations, so a
    // persistent rejection would leak into every later test in this file.
    prismaMock.$queryRawUnsafe.mockRejectedValueOnce(new Error('function does not exist'));
    prismaMock.pujaBooking.create.mockResolvedValue({ id: 'booking-1', status: 'pending_payment' });

    const result = await service.createBooking(validInput);
    expect(result.id).toBe('booking-1');
    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
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
      templeId: 't-1',
      platformCommission: new Prisma.Decimal(100),
      priestPayout: new Prisma.Decimal(400),
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      templeId: 't-1',
      priceAmount: new Prisma.Decimal(551),
      platformCommission: new Prisma.Decimal(100),
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: null,
    });
    prismaMock.commission.findFirst.mockResolvedValue(null);
    templePayoutMock.findFirst.mockResolvedValue(null);
    templePayoutMock.create.mockResolvedValue({ id: 'tp-1' });

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

  // ── RV-14 (2026-08-10): confirm + ledger writes must be one transaction ────

  function confirmMocks() {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'pending_payment',
      templeId: 't-1',
      platformCommission: new Prisma.Decimal(220),
      priestPayout: new Prisma.Decimal(880),
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      templeId: 't-1',
      priestId: 'pr-1',
      priceAmount: new Prisma.Decimal(1151),
      platformCommission: new Prisma.Decimal(220),
      priestPayout: new Prisma.Decimal(880),
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    });
    // RV-04: the Priest → User hop the commission writer now makes. 'pr-1' is a
    // Priest.id; 'user-pandit-1' is what every payout read passes.
    prismaMock.priest.findUnique.mockResolvedValue({ userId: 'user-pandit-1' });
    prismaMock.commission.findFirst.mockResolvedValue(null);
    prismaMock.commission.create.mockResolvedValue({ id: 'c-1' });
    templePayoutMock.findFirst.mockResolvedValue(null);
    templePayoutMock.create.mockResolvedValue({ id: 'tp-1' });
  }

  it('runs the confirm flip + commission + temple payout in ONE transaction', async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.commission.create).toHaveBeenCalledTimes(1);
    expect(templePayoutMock.create).toHaveBeenCalledTimes(1);
  });

  it('computes the commission percentage as an exact Decimal, not a float', async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    const data = (prismaMock.commission.create.mock.calls[0]![0] as any).data;
    expect(data.amount).toBeInstanceOf(Prisma.Decimal);
    expect(data.percentage).toBeInstanceOf(Prisma.Decimal);
    // `amount` is the provider's earning; `percentage` is the PLATFORM's take
    // rate. One column, one meaning — see lib/commission-math.ts.
    expect(data.percentage.toNumber()).toBeCloseTo((1151 - 880) / 1151, 12);
    expect(data.status).toBe('PENDING');
  });

  // ── RV-04 / S2C-15 (2026-08-11) ───────────────────────────────────────────
  //
  // The Commission row is what the payout engine pays a provider from. This
  // writer had both fields wrong in opposite directions, and the two had to be
  // fixed together: repairing only the key would have connected every pandit to
  // a row carrying the platform's 20%, turning an inert orphan into a live 75%
  // underpayment.

  it('RV-04: keys the commission on the pandit User.id, not the Priest.id', async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    const data = (prismaMock.commission.create.mock.calls[0]![0] as any).data;
    expect(data.providerId).toBe('user-pandit-1');
    // The old value. A Priest.id here matches no payout read, which is exactly
    // why the historical rows are orphaned rather than mispaid.
    expect(data.providerId).not.toBe('pr-1');
  });

  it("RV-04: writes the pandit's 80% earning, not the platform's 20% cut", async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    const data = (prismaMock.commission.create.mock.calls[0]![0] as any).data;
    expect(data.amount.toString()).toBe('880');
    // ₹880 owed vs ₹220 written = the 75% underpayment the paired fix avoids.
    expect(data.amount.toString()).not.toBe('220');
  });

  it('RV-04: writes no commission at all when the pandit has no linked user', async () => {
    confirmMocks();
    prismaMock.priest.findUnique.mockResolvedValue(null);

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    // Writing it anyway is what produced the orphan rows in the first place.
    expect(prismaMock.commission.create).not.toHaveBeenCalled();
    // The temple share is independent and must still run.
    expect(templePayoutMock.create).toHaveBeenCalledTimes(1);
  });

  it('PROPAGATES a commission write failure instead of swallowing it', async () => {
    // Before RV-14 this was caught, console.warn'd and ignored, so a paid,
    // CONFIRMED booking could end up with no ledger row while the API said 200.
    confirmMocks();
    prismaMock.commission.create.mockRejectedValue(new Error('deadlock detected'));

    await expect(service.updateBookingStatus('booking-1', 'confirmed' as any)).rejects.toThrow(
      'deadlock detected',
    );
  });

  it('skips the commission write when one already exists (idempotent confirm)', async () => {
    confirmMocks();
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'existing-commission' });

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    expect(prismaMock.commission.create).not.toHaveBeenCalled();
    // The temple share is guarded independently and still runs.
    expect(templePayoutMock.create).toHaveBeenCalledTimes(1);
  });

  // ── RV-03 (2026-08-10): the temple's 5% share ─────────────────────────────

  it('writes a TemplePayout of 5% of the PUJA price, not of priceAmount', async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    const data = (templePayoutMock.create.mock.calls[0]![0] as any).data;
    expect(data.templeId).toBe('t-1');
    expect(data.bookingId).toBe('booking-1');
    expect(data.status).toBe('pending');
    // pujaPrice = priestPayout 880 + platformCommission 220 = 1100 -> 5% = 55.00.
    // The old code used priceAmount (1151, which carries the ₹51 platform fee)
    // and would have paid the temple 57.55 out of a fee it has no claim on.
    expect(data.amount).toBeInstanceOf(Prisma.Decimal);
    expect(data.amount.toFixed(2)).toBe('55.00');
  });

  it('does not double-write a TemplePayout when one already exists', async () => {
    confirmMocks();
    templePayoutMock.findFirst.mockResolvedValue({ id: 'tp-existing' });

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    expect(templePayoutMock.create).not.toHaveBeenCalled();
  });

  it('does not write a TemplePayout on a non-confirm transition', async () => {
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
      priest: null,
    });

    await service.updateBookingStatus('booking-1', 'completed' as any);

    expect(templePayoutMock.create).not.toHaveBeenCalled();
  });
});

// ─── writeTemplePayoutOnConfirm (RV-03) ──────────────────────────────────────
//
// Exported so the three REAL payment-confirm paths (which write the confirmed
// status inline inside payment.service's capture transaction and never call
// updateBookingStatus) can run the SAME writer inside their own transaction.
// Before this, every genuinely PAID booking was locked out of the temple share
// and only UNPAID ones could ever mint a TemplePayout.

describe('writeTemplePayoutOnConfirm', () => {
  afterEach(() => {
    delete process.env.TEMPLE_SHARE_RATE;
  });

  function fakeTx(booking: any, existing: any = null) {
    return {
      pujaBooking: { findUnique: vi.fn().mockResolvedValue(booking) },
      templePayout: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn().mockResolvedValue({ id: 'tp-1' }),
      },
    };
  }

  const booking = {
    id: 'booking-1',
    templeId: 't-1',
    platformCommission: new Prisma.Decimal(700),
    priestPayout: new Prisma.Decimal(2800),
  };

  it('runs against an externally supplied transaction client', async () => {
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    // Every read AND the write go through the caller's tx — nothing leaks onto
    // the top-level client, so the row commits or rolls back with the confirm.
    expect(tx.pujaBooking.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.templePayout.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.pujaBooking.findUnique).not.toHaveBeenCalled();
    const data = (tx.templePayout.create.mock.calls[0]![0] as any).data;
    // pujaPrice 3500 -> 5% = 175.00
    expect(data.amount.toFixed(2)).toBe('175.00');
  });

  it('honours a valid TEMPLE_SHARE_RATE override', async () => {
    process.env.TEMPLE_SHARE_RATE = '0.075';
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    const data = (tx.templePayout.create.mock.calls[0]![0] as any).data;
    // 3500 * 0.075 = 262.50
    expect(data.amount.toFixed(2)).toBe('262.50');
  });

  it('falls back to 5% when TEMPLE_SHARE_RATE is unparseable', async () => {
    // The old `Number(env ?? '0.05')` turned this into NaN and silently paid
    // the temple nothing (or blew up the insert) with no signal.
    process.env.TEMPLE_SHARE_RATE = 'five percent';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    const data = (tx.templePayout.create.mock.calls[0]![0] as any).data;
    expect(data.amount.toFixed(2)).toBe('175.00');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('falls back to 5% when TEMPLE_SHARE_RATE is out of the [0,1] range', async () => {
    process.env.TEMPLE_SHARE_RATE = '5';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect((tx.templePayout.create.mock.calls[0]![0] as any).data.amount.toFixed(2)).toBe('175.00');
    warn.mockRestore();
  });

  it('rounds half-up to 2 decimal places', async () => {
    // pujaPrice 2099 * 0.05 = 104.95 exactly; 3499 * 0.05 = 174.95.
    const tx = fakeTx({
      ...booking,
      platformCommission: new Prisma.Decimal('419.90'),
      priestPayout: new Prisma.Decimal('1679.10'),
    });

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect((tx.templePayout.create.mock.calls[0]![0] as any).data.amount.toFixed(2)).toBe('104.95');
  });

  it('is idempotent — no write when a payout already exists', async () => {
    const tx = fakeTx(booking, { id: 'tp-existing' });

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect(tx.templePayout.create).not.toHaveBeenCalled();
  });

  it('no-ops when the booking is gone', async () => {
    const tx = fakeTx(null);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect(tx.templePayout.findFirst).not.toHaveBeenCalled();
    expect(tx.templePayout.create).not.toHaveBeenCalled();
  });

  it('writes nothing rather than a zero row when the share rounds to 0', async () => {
    process.env.TEMPLE_SHARE_RATE = '0';
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect(tx.templePayout.create).not.toHaveBeenCalled();
  });

  it('defaults to the top-level prisma client when no tx is passed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking);
    templePayoutMock.findFirst.mockResolvedValue(null);
    templePayoutMock.create.mockResolvedValue({ id: 'tp-1' });

    await writeTemplePayoutOnConfirm('booking-1');

    expect(templePayoutMock.create).toHaveBeenCalledTimes(1);
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

// ─── rescheduleBooking (RV-10 / RV-11) ───────────────────────────────────────
//
// RV-10: reschedule wrote the new date and slot STRAIGHT THROUGH — no
// availableSlots whitelist, no maxBookingsPerSlot capacity, no real futurity
// check. Zero test coverage existed for the whole method.

describe('BookingService.rescheduleBooking', () => {
  /** UTC midnight `n` days from now — the shape a @db.Date column round-trips. */
  function utcDay(offsetDays: number): Date {
    const d = new Date(Date.now() + offsetDays * 86_400_000);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  const bookingRow = {
    id: 'booking-1',
    userId: 'user-1',
    status: 'confirmed',
    priestId: null,
    scheduledDate: utcDay(5),
    scheduledTimeSlot: '10:00',
    templePujaOfferingId: 'offering-1',
    priestPujaOfferingId: null,
  };

  const templeOffering = {
    id: 'offering-1',
    availableSlots: ['10:00', '14:00', '18:00'],
    maxBookingsPerSlot: 5,
  };

  function happyMocks(overrides: Record<string, unknown> = {}) {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({ ...bookingRow, ...overrides });
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(templeOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'confirmed',
      scheduledDate: utcDay(10),
      scheduledTimeSlot: '14:00',
    });
  }

  it('throws if booking not found', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    await expect(service.rescheduleBooking('booking-1', 'user-1', utcDay(10))).rejects.toThrow(
      'Booking not found.',
    );
  });

  it('throws if the caller is not the owner', async () => {
    happyMocks({ userId: 'someone-else' });
    await expect(service.rescheduleBooking('booking-1', 'user-1', utcDay(10))).rejects.toThrow(
      'not authorized to reschedule',
    );
  });

  it('throws for a status that cannot be rescheduled', async () => {
    happyMocks({ status: 'delivered' });
    await expect(service.rescheduleBooking('booking-1', 'user-1', utcDay(10))).rejects.toThrow(
      'cannot be rescheduled in its current status',
    );
  });

  it('throws inside the 24h window of the CURRENT slot', async () => {
    // Slot 23:00 IST today is 17:30Z today — always under 24h away.
    happyMocks({ scheduledDate: utcDay(0), scheduledTimeSlot: '23:00' });
    await expect(service.rescheduleBooking('booking-1', 'user-1', utcDay(10))).rejects.toThrow(
      'not allowed within 24 hours',
    );
  });

  // RV-11 half: the 24h window was measured from `scheduledDate` (a DATE column,
  // i.e. MIDNIGHT) rather than the slot time, silently denying the devotee up to
  // 23h59m of their entitled window. cancelBooking was fixed; reschedule was not.
  it('measures the 24h window from the slot TIME, not midnight of the slot day', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-11T10:00:00Z'));
      // Slot is 2026-08-12 18:00 IST = 2026-08-12T12:30Z -> 26.5h away (allowed).
      // Midnight maths would have read 2026-08-12T00:00Z -> 14h -> wrongly denied.
      happyMocks({
        scheduledDate: new Date('2026-08-12T00:00:00Z'),
        scheduledTimeSlot: '18:00',
      });

      const result = await service.rescheduleBooking(
        'booking-1',
        'user-1',
        new Date('2026-08-20T00:00:00Z'),
        '14:00',
      );
      expect(result.id).toBe('booking-1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a new slot that is not on the offering whitelist', async () => {
    happyMocks();
    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '10:30'),
    ).rejects.toThrow('Invalid time slot "10:30"');
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });

  it('rejects an Invalid Date target', async () => {
    happyMocks();
    await expect(
      service.rescheduleBooking('booking-1', 'user-1', new Date('not-a-date'), '14:00'),
    ).rejects.toThrow('not a valid date');
  });

  it('rejects an empty new slot string', async () => {
    happyMocks();
    await expect(service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '')).rejects.toThrow(
      'must not be empty',
    );
  });

  it('rejects when the target slot is already at capacity', async () => {
    happyMocks();
    prismaMock.pujaBooking.count.mockResolvedValue(5); // max is 5
    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00'),
    ).rejects.toThrow('No availability for the selected slot');
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });

  it('excludes the booking being moved from its own capacity count', async () => {
    happyMocks();
    await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00');

    const where = prismaMock.pujaBooking.count.mock.calls[0]![0]!.where as any;
    expect(where.id).toEqual({ not: 'booking-1' });
    expect(where.templePujaOfferingId).toBe('offering-1');
    expect(where.scheduledTimeSlot).toBe('14:00');
    expect(where.status).toEqual({ notIn: ['cancelled', 'refunded'] });
  });

  // The past-date trap: once scheduledDate is behind, cancel, reschedule AND
  // request-refund all reject, so the devotee's money is captured on a puja that
  // can never be performed and has no self-service exit.
  it('rejects a move into the past (slot time, not just the date)', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-11T10:00:00Z')); // 15:30 IST
      happyMocks({ scheduledDate: new Date('2026-08-20T00:00:00Z') });
      // Target is TODAY at 10:00 IST = 2026-08-11T04:30Z — 5.5h in the past.
      // The old guard compared DATEs only against LOCAL midnight, so it happily
      // accepted "today" and moved a paid booking behind the current time.
      await expect(
        service.rescheduleBooking(
          'booking-1',
          'user-1',
          new Date('2026-08-11T00:00:00Z'),
          '10:00',
        ),
      ).rejects.toThrow('must be in the future');
      expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws when the offering behind the booking no longer exists', async () => {
    happyMocks();
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(null);
    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00'),
    ).rejects.toThrow('no longer exists');
  });

  it('validates a pandit-direct booking against its PRIEST offering, not the temple anchor', async () => {
    // A from-offering booking carries an unrelated "anchor" templePujaOfferingId,
    // so validating against the temple offering would reject legitimate slots
    // and read the wrong capacity.
    happyMocks({ priestPujaOfferingId: 'priest-offering-9' });
    priestPujaOfferingMock.findUnique.mockResolvedValue({
      id: 'priest-offering-9',
      availableSlots: [{ time: '07:00', label: 'Morning' }],
      maxBookingsPerSlot: 1,
    });

    await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '07:00');

    expect(priestPujaOfferingMock.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.templePujaOffering.findUnique).not.toHaveBeenCalled();
    const where = prismaMock.pujaBooking.count.mock.calls[0]![0]!.where as any;
    expect(where.priestPujaOfferingId).toBe('priest-offering-9');
    expect(where.templePujaOfferingId).toBeUndefined();
  });

  it('rejects an off-whitelist slot on a pandit-direct booking', async () => {
    happyMocks({ priestPujaOfferingId: 'priest-offering-9' });
    priestPujaOfferingMock.findUnique.mockResolvedValue({
      id: 'priest-offering-9',
      availableSlots: [{ time: '07:00', label: 'Morning' }],
      maxBookingsPerSlot: 1,
    });

    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '19:00'),
    ).rejects.toThrow('Invalid time slot "19:00"');
  });

  it('skips the whitelist when the offering has no slots configured (back-compat)', async () => {
    happyMocks();
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      ...templeOffering,
      availableSlots: [],
    });

    const result = await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '09:15');
    expect(result.id).toBe('booking-1');
    // Capacity is still enforced even without a whitelist.
    expect(prismaMock.pujaBooking.count).toHaveBeenCalledTimes(1);
  });

  it('validates the CURRENT slot when no new slot is supplied', async () => {
    happyMocks({ scheduledTimeSlot: 'whenever' });
    await expect(service.rescheduleBooking('booking-1', 'user-1', utcDay(10))).rejects.toThrow(
      'Invalid time slot "whenever"',
    );
  });

  it('locks the target slot and writes inside a transaction', async () => {
    happyMocks();
    const newDate = utcDay(10);

    await service.rescheduleBooking('booking-1', 'user-1', newDate, '14:00');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    const [sql, key] = prismaMock.$queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(key).toBe(`puja-slot:offering-1:${newDate.toISOString().slice(0, 10)}:14:00`);
  });

  it('re-queues the booking for assignment when a priest was attached', async () => {
    happyMocks({ status: 'priest_assigned', priestId: 'pr-1' });

    const result = await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00');

    expect(result.requeuedForAssignment).toBe(true);
    const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as any).data;
    expect(data.priestId).toBeNull();
    expect(data.status).toBe('confirmed');
    expect(data.scheduledTimeSlot).toBe('14:00');
  });

  it('keeps the existing slot when newTimeSlot is omitted', async () => {
    happyMocks();

    const result = await service.rescheduleBooking('booking-1', 'user-1', utcDay(10));

    expect(result.requeuedForAssignment).toBe(false);
    const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as any).data;
    expect(data).not.toHaveProperty('scheduledTimeSlot');
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
