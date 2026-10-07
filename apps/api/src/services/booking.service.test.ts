import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';
import { nriPujaPriceInr } from '../lib/nri-pricing.js';

// RV-03 / RV-10 (2026-08-10): the shared deep mock in lib/__mocks__/prisma.ts
// predates temple_payouts and priest_puja_offerings, so neither model is on it.
// The old code hid that behind a try/catch that swallowed the resulting
// TypeError; now that the temple-share write is inside the confirm transaction
// (and must NOT swallow), the models have to exist. Augmenting the shared
// object here rather than editing it keeps this test file self-contained —
// vitest gives every test file its own module registry, so this cannot leak.
// DI-06 (F367): writeTemplePayoutOnConfirm inserts through
// `createMany({ skipDuplicates })` so the UNIQUE index on
// temple_payouts.booking_id resolves a concurrent confirm inside the INSERT
// instead of raising P2002, which inside the caller's payment transaction
// would roll back a real capture. `create` is kept on the mock so a
// regression back to it is visible rather than a TypeError.
const templePayoutMock = { findFirst: vi.fn(), create: vi.fn(), createMany: vi.fn() };
const priestPujaOfferingMock = { findUnique: vi.fn() };
(prismaMock as any).templePayout = templePayoutMock;
(prismaMock as any).priestPujaOffering = priestPujaOfferingMock;

// S3-08 / S3-10 (2026-08-11): three more members the shared mock predates.
//  - payment.count      — the confirm gate ("no captured payment, no confirm")
//  - commission.updateMany — reschedule REVERSES the detached pandit's earning
//  - dispatchOffer.updateMany — reschedule supersedes the old offers
// Attached here, never in lib/__mocks__/prisma.ts: that file is shared by every
// suite, and vitest gives this file its own module registry so nothing leaks.
const paymentCountMock = vi.fn();
const dispatchOfferMock = { updateMany: vi.fn() };
(prismaMock as any).payment.count = paymentCountMock;
// NOTE: unlike the others here, commission.updateMany ALREADY exists on the
// shared mock and other suites depend on its return value — alias it, never
// reassign it (doing so returned undefined and broke 26 unrelated tests).
const commissionUpdateManyMock = (prismaMock as any).commission.updateMany;
(prismaMock as any).dispatchOffer = dispatchOfferMock;

// Mock the prisma module before importing the service
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  BookingService,
  writeTemplePayoutOnConfirm,
  UNPAID_HOLD_MINUTES,
  MAX_RESCHEDULES,
  PLATFORM_FEE_INR,
} from './booking.service.js';

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
    prismaMock.userAddress.findFirst.mockResolvedValue({ id: 'addr-1', country: 'India', pincode: '221001' });
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

  // ── S3-09 (2026-08-11): displayed price === charged price ─────────────────
  //
  // This test previously asserted the OPPOSITE (`priceAmount > 1100` for an NRI
  // user), encoding the defect: createBooking swapped in PujaType.nriPrice for
  // anyone whose self-settable `isNri` flag was true, while the web wizard
  // quoted `priceOverride ?? basePrice` and never rendered an NRI figure at all.
  // Fixture base 500 / nri 5000: the page said Rs 551, the Razorpay order asked
  // for Rs 5,051. Same class as the RV-01 P0, and the /from-offering path had
  // already refused to create it.
  it('charges an NRI user the QUOTED base price, not the hidden nriPrice', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: true });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'pending_payment',
      priceAmount: 551,
      currency: 'INR',
      scheduledDate: new Date('2026-12-25'),
      scheduledTimeSlot: '10:00',
      createdAt: new Date(),
    });

    const result = await service.createBooking(validInput);

    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
    const createCall = prismaMock.pujaBooking.create.mock.calls[0]![0];
    // base 500 + platform fee 51 — exactly what a domestic user is charged and
    // exactly what the wizard showed. The nriPrice (5000) is nowhere near it.
    expect(Number(createCall.data.priceAmount)).toBe(551);
    expect(Number(createCall.data.priceAmount)).not.toBe(5051);
    // The split is on the QUOTED puja price too, so the pandit is not paid a
    // share of a number the devotee never agreed to.
    expect(Number(createCall.data.priestPayout)).toBe(400);
    // Razorpay is the only rail and INR the only currency; a 'USD' here is the
    // ~83x overcharge at the gateway that RV-01 closed.
    expect(createCall.data.currency).toBe('INR');
    expect(result.currency).toBe('INR');
  });

  // ── NRI premium (owner decision 2026-10-05: 2.5x) ─────────────────────────
  //
  // The premium is applied ONLY when the booking request carries the explicit
  // `nriPricing` flag — the same flag the wizard sends when it displays the
  // dollar price — so the amount shown is the amount charged. It is never
  // derived from the self-settable users.isNri column.
  describe('nriPricing (2.5x premium, still INR)', () => {
    function arrange() {
      prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
      prismaMock.pujaBooking.count.mockResolvedValue(0);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.userAddress.findFirst.mockResolvedValue({ id: 'addr-1', country: 'India', pincode: '221001' });
      prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
      prismaMock.pujaBooking.create.mockResolvedValue({ id: 'booking-1', status: 'pending_payment' });
    }
    const created = () => (prismaMock.pujaBooking.create.mock.calls[0]![0] as any).data;

    it('charges puja x 2.5 + the flat platform fee, in INR', async () => {
      arrange();
      await service.createBooking({ ...validInput, nriPricing: true });
      // 500 x 2.5 = 1250; + 51 platform fee = 1301
      expect(Number(created().priceAmount)).toBe(1301);
      expect(created().currency).toBe('INR');
    });

    it('keeps the prasad fee flat (not multiplied)', async () => {
      arrange();
      await service.createBooking({
        ...validInput,
        nriPricing: true,
        prasadDeliveryRequested: true,
        prasadDeliveryAddressId: 'addr-1',
      });
      expect(Number(created().priceAmount)).toBe(1250 + 51 + 150);
    });

    it('splits 80/20 on the NRI puja price actually charged (fees excluded, as for domestic)', async () => {
      arrange();
      await service.createBooking({ ...validInput, nriPricing: true });
      expect(created().priestPayout.toString()).toBe('1000'); // 80% of 1250
      expect(created().platformCommission.toString()).toBe('250'); // 20% of 1250
      expect(
        created().priestPayout.add(created().platformCommission).toString(),
      ).toBe('1250');
    });

    it('charges exactly the NRI puja price from the pricing module plus the flat fee', async () => {
      arrange();
      await service.createBooking({ ...validInput, nriPricing: true });
      expect(Number(created().priceAmount)).toBe(Number(nriPujaPriceInr(500)) + PLATFORM_FEE_INR);
    });

    it('is domestic when the flag is absent or false, even for users with isNri set', async () => {
      arrange();
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: true });
      await service.createBooking({ ...validInput, nriPricing: false });
      expect(Number(created().priceAmount)).toBe(551);
    });

    it('applies the premium on top of a temple price override', async () => {
      arrange();
      prismaMock.templePujaOffering.findUnique.mockResolvedValue({
        ...mockOffering,
        priceOverride: 1100,
      });
      await service.createBooking({ ...validInput, nriPricing: true });
      expect(Number(created().priceAmount)).toBe(2750 + 51);
    });
  });

  // ── S3-07 (2026-08-11): the platform multiplier is Decimal, not float ─────
  it('derives the platform commission by Decimal subtraction, not (1 - share)', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({ id: 'booking-1', status: 'pending_payment' });

    await service.createBooking(validInput);

    const data = (prismaMock.pujaBooking.create.mock.calls[0]![0] as any).data;
    // `new Prisma.Decimal((1 - 0.8).toString())` is literally
    // 0.19999999999999996, which yields '99.99999999999998' on a 500 puja.
    // Decimal(10,2) would round it away on write, which is exactly why this has
    // to be asserted on the un-rounded value.
    expect(data.platformCommission.toString()).toBe('100');
    expect(data.priestPayout.toString()).toBe('400');
  });

  // ── S3-04 (2026-08-11): unpaid holds expire ───────────────────────────────
  //
  // Every capacity predicate was `status notIn [cancelled, refunded]` with no
  // age bound and there is no expiry job for puja bookings, so a
  // `pending_payment` row held its slot forever. /create-order creates the
  // booking BEFORE the Razorpay order, so every abandoned checkout burned a
  // slot permanently — and an attacker could hold a competitor pandit's whole
  // calendar for free (maxBookingsPerSlot defaults to 1 on priest offerings).
  it('excludes unpaid holds older than the TTL from the capacity count', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.pujaBooking.create.mockResolvedValue({ id: 'booking-1', status: 'pending_payment' });

    const before = Date.now();
    await service.createBooking(validInput);

    const where = (prismaMock.pujaBooking.count.mock.calls[0]![0] as any).where;
    // Live rows still count...
    expect(where.AND[0]).toEqual({ status: { notIn: ['cancelled', 'refunded'] } });
    // ...but an abandoned pending_payment row older than the hold does not.
    const stale = where.AND[1].NOT;
    expect(stale.status).toBe('pending_payment');
    const cutoffMs = (stale.createdAt.lt as Date).getTime();
    expect(cutoffMs).toBeLessThanOrEqual(before - UNPAID_HOLD_MINUTES * 60_000 + 5_000);
    expect(cutoffMs).toBeGreaterThan(before - UNPAID_HOLD_MINUTES * 60_000 - 60_000);
    // The old shape put `status` at the top level with no age bound at all.
    expect(where.status).toBeUndefined();
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

  it('rejects prasad to a saved address outside India (India-only delivery)', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.userAddress.findFirst.mockResolvedValue({
      id: 'addr-1',
      country: 'United Kingdom',
      pincode: 'SW1A 1AA',
    });

    await expect(
      service.createBooking({
        ...validInput,
        prasadDeliveryRequested: true,
        prasadDeliveryAddressId: 'addr-1',
      }),
    ).rejects.toThrow('Prasad is delivered within India only');
  });

  it('rejects prasad to a saved Indian address whose pincode is not 6 digits', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(mockOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isNri: false });
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    prismaMock.userAddress.findFirst.mockResolvedValue({
      id: 'addr-1',
      country: 'India',
      pincode: '1100',
    });

    await expect(
      service.createBooking({
        ...validInput,
        prasadDeliveryRequested: true,
        prasadDeliveryAddressId: 'addr-1',
      }),
    ).rejects.toThrow('Prasad is delivered within India only');
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
    // S3-08: `confirmed` now requires a captured payment (see the P0 block
    // below) — this is the PAID booking, the one that must still work.
    paymentCountMock.mockResolvedValue(1);
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
    templePayoutMock.createMany.mockResolvedValue({ count: 1 });

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

  // S3-03 (2026-08-11): `videoUploadedAt` is server-stamped evidence. It sat in
  // the route's VIDEO_PROOF_FIELDS whitelist and was absent from this denylist,
  // and the route's video-proof gate only inspects the URL — so the booking
  // OWNER could rewrite the proof timestamp on a booking that already carried
  // genuine proof. GET /bookings/:id/video then served the forged value,
  // destroying the artefact that settles a chargeback on a Rs 10,000 puja.
  it('strips a client-supplied videoUploadedAt (forged video-proof timestamp)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'video_uploaded',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'delivered',
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    });

    await service.updateBookingStatus('booking-1', 'delivered' as any, {
      videoUploadedAt: '2020-01-01T00:00:00.000Z',
    } as any);

    const updateCall = prismaMock.pujaBooking.update.mock.calls[0]![0]!;
    expect(updateCall.data).not.toHaveProperty('videoUploadedAt');
    expect(updateCall.data.status).toBe('delivered');
  });

  // ── P0 S3-08 (2026-08-11): no captured payment, no confirm ────────────────
  //
  // PATCH /bookings/:id authorizes the booking OWNER for every transition, and
  // `confirmed` is where this method MINTS the Commission row that
  // payout.service pays a provider from. So a devotee could book a Rs 10,000
  // puja via /bookings/from-offering (which pins priestId at create), never
  // pay, PATCH {"status":"confirmed"}, and mint Rs 8,000 of withdrawable
  // balance for a colluding pandit — unbounded, and free.

  function unpaidConfirmMocks() {
    paymentCountMock.mockResolvedValue(0);
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'pending_payment',
      templeId: 't-1',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      templeId: 't-1',
      priestId: 'pr-1',
      priceAmount: new Prisma.Decimal(10000),
      platformCommission: new Prisma.Decimal(2000),
      priestPayout: new Prisma.Decimal(8000),
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    });
    prismaMock.priest.findUnique.mockResolvedValue({ userId: 'user-pandit-1' });
    prismaMock.commission.findFirst.mockResolvedValue(null);
    prismaMock.commission.createMany.mockResolvedValue({ count: 1 });
    templePayoutMock.findFirst.mockResolvedValue(null);
    templePayoutMock.createMany.mockResolvedValue({ count: 1 });
  }

  it('refuses to confirm a booking with no captured payment', async () => {
    unpaidConfirmMocks();

    await expect(service.updateBookingStatus('booking-1', 'confirmed' as any)).rejects.toThrow(
      'no captured payment',
    );
    expect(paymentCountMock).toHaveBeenCalledWith({
      where: { bookingId: 'booking-1', status: 'captured' },
    });
  });

  it('mints NO Commission and NO TemplePayout on an unpaid confirm', async () => {
    unpaidConfirmMocks();

    await expect(
      service.updateBookingStatus('booking-1', 'confirmed' as any),
    ).rejects.toThrow();

    // The self-payout mint: Commission.amount IS what getPayoutBalance pays.
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
    expect(templePayoutMock.createMany).not.toHaveBeenCalled();
  });

  it('throws INSIDE the transaction so the unpaid booking never becomes confirmed', async () => {
    unpaidConfirmMocks();

    await expect(
      service.updateBookingStatus('booking-1', 'confirmed' as any),
    ).rejects.toThrow();

    // The status flip itself is issued, but it is issued inside the same
    // $transaction the throw aborts — so it rolls back. Asserting the throw
    // escapes the transaction callback is the binding part: catching it inside
    // would leave the booking `confirmed` and unpaid.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
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
    // S3-08: a real confirm always has a captured Payment behind it.
    paymentCountMock.mockResolvedValue(1);
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
    prismaMock.commission.createMany.mockResolvedValue({ count: 1 });
    templePayoutMock.findFirst.mockResolvedValue(null);
    templePayoutMock.createMany.mockResolvedValue({ count: 1 });
  }

  it('runs the confirm flip + commission + temple payout in ONE transaction', async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
    expect(templePayoutMock.createMany).toHaveBeenCalledTimes(1);
  });

  it('computes the commission percentage as an exact Decimal, not a float', async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    const data = (prismaMock.commission.createMany.mock.calls[0]![0] as any).data[0];
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

    const data = (prismaMock.commission.createMany.mock.calls[0]![0] as any).data[0];
    expect(data.providerId).toBe('user-pandit-1');
    // The old value. A Priest.id here matches no payout read, which is exactly
    // why the historical rows are orphaned rather than mispaid.
    expect(data.providerId).not.toBe('pr-1');
  });

  it("RV-04: writes the pandit's 80% earning, not the platform's 20% cut", async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    const data = (prismaMock.commission.createMany.mock.calls[0]![0] as any).data[0];
    expect(data.amount.toString()).toBe('880');
    // ₹880 owed vs ₹220 written = the 75% underpayment the paired fix avoids.
    expect(data.amount.toString()).not.toBe('220');
  });

  it('RV-04: writes no commission at all when the pandit has no linked user', async () => {
    confirmMocks();
    prismaMock.priest.findUnique.mockResolvedValue(null);

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    // Writing it anyway is what produced the orphan rows in the first place.
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
    // The temple share is independent and must still run.
    expect(templePayoutMock.createMany).toHaveBeenCalledTimes(1);
  });

  it('PROPAGATES a commission write failure instead of swallowing it', async () => {
    // Before RV-14 this was caught, console.warn'd and ignored, so a paid,
    // CONFIRMED booking could end up with no ledger row while the API said 200.
    confirmMocks();
    prismaMock.commission.createMany.mockRejectedValue(new Error('deadlock detected'));

    await expect(service.updateBookingStatus('booking-1', 'confirmed' as any)).rejects.toThrow(
      'deadlock detected',
    );
  });

  it('skips the commission write when one already exists (idempotent confirm)', async () => {
    confirmMocks();
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'existing-commission' });

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
    // The temple share is guarded independently and still runs.
    expect(templePayoutMock.createMany).toHaveBeenCalledTimes(1);
  });

  // ── RV-03 (2026-08-10): the temple's 5% share ─────────────────────────────

  it('writes a TemplePayout of 5% of the PUJA price, not of priceAmount', async () => {
    confirmMocks();

    await service.updateBookingStatus('booking-1', 'confirmed' as any);

    const data = (templePayoutMock.createMany.mock.calls[0]![0] as any).data[0];
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

    expect(templePayoutMock.createMany).not.toHaveBeenCalled();
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

    expect(templePayoutMock.createMany).not.toHaveBeenCalled();
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
        create: vi.fn(),
        // DI-06 (F367): the writer inserts ON CONFLICT DO NOTHING.
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
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
    expect(tx.templePayout.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.pujaBooking.findUnique).not.toHaveBeenCalled();
    const data = (tx.templePayout.createMany.mock.calls[0]![0] as any).data[0];
    // pujaPrice 3500 -> 5% = 175.00
    expect(data.amount.toFixed(2)).toBe('175.00');
  });

  /**
   * DI-06 (F367) — the temple ledger's idempotency has to reach the database.
   *
   * This writer's guard was a `findFirst`-then-`create`, and its own comment
   * conceded the point: "temple_payouts.booking_id has no UNIQUE index, so this
   * findFirst remains a TOCTOU under truly concurrent confirms". Migration
   * 20260824000000 supplies the index; the insert has to USE it.
   *
   * It must NOT do so by catching P2002. This function runs inside the caller's
   * payment-capture `$transaction`, where a statement error aborts the whole
   * Postgres transaction and Prisma issues no savepoint — catching it in
   * JavaScript would not recover, and a duplicate temple share would roll back a
   * real capture. `createMany({ skipDuplicates })` compiles to
   * INSERT ... ON CONFLICT DO NOTHING, which never raises. Hence both halves of
   * the assertion: the flag must be set, and `create` must be unreachable.
   */
  it('inserts ON CONFLICT DO NOTHING so a race cannot abort the payment transaction', async () => {
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    const args = tx.templePayout.createMany.mock.calls[0]![0] as {
      data: unknown[];
      skipDuplicates?: boolean;
    };
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(1);
    expect(tx.templePayout.create).not.toHaveBeenCalled();
  });

  it('honours a valid TEMPLE_SHARE_RATE override', async () => {
    process.env.TEMPLE_SHARE_RATE = '0.075';
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    const data = (tx.templePayout.createMany.mock.calls[0]![0] as any).data[0];
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

    const data = (tx.templePayout.createMany.mock.calls[0]![0] as any).data[0];
    expect(data.amount.toFixed(2)).toBe('175.00');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('falls back to 5% when TEMPLE_SHARE_RATE is out of the [0,1] range', async () => {
    process.env.TEMPLE_SHARE_RATE = '5';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect((tx.templePayout.createMany.mock.calls[0]![0] as any).data[0].amount.toFixed(2)).toBe('175.00');
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

    expect((tx.templePayout.createMany.mock.calls[0]![0] as any).data[0].amount.toFixed(2)).toBe('104.95');
  });

  it('is idempotent — no write when a payout already exists', async () => {
    const tx = fakeTx(booking, { id: 'tp-existing' });

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect(tx.templePayout.createMany).not.toHaveBeenCalled();
  });

  it('no-ops when the booking is gone', async () => {
    const tx = fakeTx(null);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect(tx.templePayout.findFirst).not.toHaveBeenCalled();
    expect(tx.templePayout.createMany).not.toHaveBeenCalled();
  });

  it('writes nothing rather than a zero row when the share rounds to 0', async () => {
    process.env.TEMPLE_SHARE_RATE = '0';
    const tx = fakeTx(booking);

    await writeTemplePayoutOnConfirm('booking-1', tx as any);

    expect(tx.templePayout.createMany).not.toHaveBeenCalled();
  });

  it('defaults to the top-level prisma client when no tx is passed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking);
    templePayoutMock.findFirst.mockResolvedValue(null);
    templePayoutMock.createMany.mockResolvedValue({ count: 1 });

    await writeTemplePayoutOnConfirm('booking-1');

    expect(templePayoutMock.createMany).toHaveBeenCalledTimes(1);
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
    rescheduleCount: 0,
  };

  const templeOffering = {
    id: 'offering-1',
    isActive: true,
    availableSlots: ['10:00', '14:00', '18:00'],
    maxBookingsPerSlot: 5,
  };

  function happyMocks(overrides: Record<string, unknown> = {}) {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({ ...bookingRow, ...overrides });
    prismaMock.templePujaOffering.findUnique.mockResolvedValue(templeOffering);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    // S3-10: the detach path reads and voids the pandit's unclaimed earning.
    prismaMock.commission.findFirst.mockResolvedValue(null);
    commissionUpdateManyMock.mockResolvedValue({ count: 1 });
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 0 });
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
    // S3-04: the occupancy predicate moved into AND so an expired unpaid hold
    // stops counting. The live-status half must still be there.
    expect(where.AND[0]).toEqual({ status: { notIn: ['cancelled', 'refunded'] } });
    expect(where.AND[1].NOT.status).toBe('pending_payment');
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
      isActive: true,
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
      isActive: true,
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

  // ── S3-10 (2026-08-11): the earning must move with the work ───────────────
  //
  // Detaching the pandit left his Commission row untouched. The row is minted
  // at `confirmed` keyed to the pandit on record at that instant, and
  // createPriestPayout refuses to pay the replacement while ANY commission owns
  // the booking — so Pandit A withdrew Rs 8,000 for a puja Pandit B performed
  // for Rs 0. The admin reassign path in routes/bookings.ts exists to prevent
  // exactly this; the devotee-facing reschedule button had none of it.

  it('voids the detached pandit’s unclaimed commission when re-queueing', async () => {
    happyMocks({ status: 'priest_assigned', priestId: 'pr-1' });

    await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00');

    // REVERSE, never delete — a money ledger keeps its history. This is safe
    // only because createPriestPayout's mutual-exclusion guard now ignores
    // REVERSED rows (payment.service), so the pandit who actually performs is
    // still payable by the legacy rail. If that guard ever stops filtering on
    // status, this reversal strands him — the two are a pair.
    expect(commissionUpdateManyMock).toHaveBeenCalledWith({
      where: { bookingId: 'booking-1', status: 'PENDING', payoutRequestId: null },
      data: { status: 'REVERSED' },
    });
    // The row must survive as an audit record.
    expect((prismaMock as any).commission.deleteMany ?? { mock: { calls: [] } }).toBeDefined();
  });

  it('refuses the reschedule when the pandit’s earning is already settled', async () => {
    happyMocks({ status: 'priest_assigned', priestId: 'pr-1' });
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'c-paid' });

    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00'),
    ).rejects.toThrow('already been paid out');
    // Refused, not half-applied: nothing is reversed and the booking does not move.
    expect(commissionUpdateManyMock).not.toHaveBeenCalled();
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });

  it('supersedes the old dispatch offers and clears assignedVia on re-queue', async () => {
    happyMocks({ status: 'priest_assigned', priestId: 'pr-1' });

    await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00');

    const offerCall = dispatchOfferMock.updateMany.mock.calls[0]![0] as any;
    expect(offerCall.where).toEqual({ bookingId: 'booking-1', state: 'sent' });
    expect(offerCall.data.state).toBe('superseded');

    const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as any).data;
    expect(data.assignedVia).toBeNull();
    // dispatch.accept nulls offerExpiresAt on assignment and sweepExpiredOffers
    // only sees `offerExpiresAt < now`, so leaving it null made
    // `requeuedForAssignment: true` a lie — nobody would ever be re-offered it.
    expect(data.offerExpiresAt).toBeInstanceOf(Date);
    expect((data.offerExpiresAt as Date).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('leaves the ledger alone when no pandit was attached', async () => {
    happyMocks();

    await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00');

    expect(commissionUpdateManyMock).not.toHaveBeenCalled();
    expect(dispatchOfferMock.updateMany).not.toHaveBeenCalled();
  });

  // ── S3-06a: an inactive offering is a conscious refusal, not an oversight ──
  it('refuses to move a booking onto a deactivated offering', async () => {
    happyMocks();
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      ...templeOffering,
      isActive: false,
    });

    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00'),
    ).rejects.toThrow('no longer offered');
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });

  // ── S3-06b: the target date is normalised to UTC midnight ─────────────────
  //
  // The route parses `newDate` with `z.coerce.date()`, which accepts
  // '2026-09-15T10:30:00+05:30'. A Date carrying a time component made the
  // capacity query match ZERO existing rows (so it passed trivially) and wrote
  // a row every availability reader misses, because they all query UTC
  // midnight — one reschedule silently overselling a 5-capacity slot to 6.
  it('normalises a non-midnight target date to UTC midnight', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-11T10:00:00Z'));
      happyMocks({ scheduledDate: new Date('2026-08-20T00:00:00Z') });

      await service.rescheduleBooking(
        'booking-1',
        'user-1',
        new Date('2026-09-15T10:30:00Z'),
        '14:00',
      );

      const countWhere = prismaMock.pujaBooking.count.mock.calls[0]![0]!.where as any;
      expect((countWhere.scheduledDate as Date).toISOString()).toBe('2026-09-15T00:00:00.000Z');

      const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as any).data;
      expect((data.scheduledDate as Date).toISOString()).toBe('2026-09-15T00:00:00.000Z');

      // The advisory-lock key is derived from the same normalised date, so two
      // racers on the same calendar day take the same lock.
      const [, key] = prismaMock.$queryRawUnsafe.mock.calls[0]!;
      expect(key).toBe('puja-slot:offering-1:2026-09-15:14:00');
    } finally {
      vi.useRealTimers();
    }
  });

  // ── S3-25: reschedules are bounded and counted ────────────────────────────
  it('increments rescheduleCount on every move', async () => {
    happyMocks();

    await service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00');

    const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as any).data;
    expect(data.rescheduleCount).toEqual({ increment: 1 });
  });

  it('refuses once the reschedule limit is reached', async () => {
    happyMocks({ rescheduleCount: MAX_RESCHEDULES });

    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00'),
    ).rejects.toThrow('cannot be rescheduled again');
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    // The message carries "cannot be rescheduled" so the route maps it to 409.
    await expect(
      service.rescheduleBooking('booking-1', 'user-1', utcDay(10), '14:00'),
    ).rejects.toThrow(/cannot be rescheduled/);
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

// ─── getUserBookings: DB-01 view filters + honest counts ─────────────────────
//
// DB-01 (prod sweep 2026-08-12): My Bookings rendered 20 of the devotee's 81
// bookings and labelled that page "All 20". The page could not do better —
// the endpoint returned only a page of rows plus a single `total`, so the tab
// chips were computed from the truncated array. The server now owns both the
// per-tab filter and the per-tab count, so the chip and the list can never
// disagree.

describe('BookingService.getUserBookings — view filters and honest counts', () => {
  // ALIAS the shared mock's method — never reassign it (a past reassignment of
  // a shared-mock method returned undefined and broke 26 unrelated tests).
  const countMock = prismaMock.pujaBooking.count;

  /** The view predicate always rides in `where.AND[0]` so an explicit `status`
   *  filter can coexist with it. Identify which view a count() is for. */
  function viewOf(args: any): 'all' | 'upcoming' | 'completed' | 'cancelled' {
    const p = args?.where?.AND?.[0];
    if (!p) return 'all';
    if (p.status?.in?.includes('cancelled')) return 'cancelled';
    if (p.status?.in) return 'completed';
    return 'upcoming';
  }

  function stubCounts(v: {
    all: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  }) {
    countMock.mockImplementation(async (args: any) => v[viewOf(args)]);
  }

  afterEach(() => {
    // vi.clearAllMocks() clears calls but NOT implementations, so drop the
    // implementation set above rather than leaking it into later suites.
    countMock.mockReset();
  });

  it('returns a count per tab computed over the whole set, not the page', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({ id: `b${i}` })),
    );
    stubCounts({ all: 81, upcoming: 62, completed: 13, cancelled: 1 });

    const result = await service.getUserBookings('user-1', { limit: 20 });

    expect(result.bookings).toHaveLength(20);
    expect(result.counts).toEqual({ all: 81, upcoming: 62, completed: 13, cancelled: 1 });
    // The whole point: the page is 20 rows but the truth is 81.
    expect(result.total).toBe(81);
    expect(result.totalPages).toBe(5);
  });

  it('defaults to the "all" view — no view predicate, same rows as before', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 7, upcoming: 3, completed: 2, cancelled: 1 });

    await service.getUserBookings('user-1');

    const where = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any;
    expect(where.userId).toBe('user-1');
    expect(where.AND).toBeUndefined();
  });

  it('filters "cancelled" server-side so the chip and the list agree', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 81, upcoming: 62, completed: 13, cancelled: 1 });

    const result = await service.getUserBookings('user-1', { view: 'cancelled' });

    const where = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any;
    expect(where.AND[0].status).toEqual({ in: ['cancelled', 'refunded'] });
    // `total` paginates the ACTIVE view, not the whole table.
    expect(result.total).toBe(1);
    expect(result.counts.all).toBe(81);
  });

  it('"completed" covers the three terminal success states', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 81, upcoming: 62, completed: 13, cancelled: 1 });

    await service.getUserBookings('user-1', { view: 'completed' });

    const where = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any;
    expect(where.AND[0].status.in).toEqual(
      expect.arrayContaining(['completed', 'video_uploaded', 'delivered']),
    );
  });

  it('"upcoming" is future-dated and excludes every terminal state', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 81, upcoming: 62, completed: 13, cancelled: 1 });

    await service.getUserBookings('user-1', { view: 'upcoming' });

    const p = (prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any).AND[0];
    expect(p.scheduledDate.gte).toBeInstanceOf(Date);
    expect(p.status.notIn).toEqual(
      expect.arrayContaining(['cancelled', 'completed', 'video_uploaded', 'delivered']),
    );
  });

  it('orders by a UNIQUE tiebreaker so paging cannot skip or repeat a row', async () => {
    // Caught live: walking pages 1..5 of the seeded devotee's 81 bookings
    // returned only 80 DISTINCT booking numbers. `orderBy: { scheduledDate:
    // 'desc' }` is not a total order — dozens of these bookings share a date,
    // so Postgres is free to order ties differently per query and a row can
    // fall through the seam between two pages. Truncation was the reported
    // bug; an unstable sort loses rows just as invisibly.
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 81, upcoming: 62, completed: 13, cancelled: 1 });

    await service.getUserBookings('user-1', { page: 2 });

    const orderBy = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.orderBy as any[];
    expect(Array.isArray(orderBy)).toBe(true);
    expect(orderBy[0]).toEqual({ scheduledDate: 'desc' });
    // `id` is the primary key — the last key must be unique or the order is
    // still ambiguous whenever every preceding key ties.
    expect(orderBy[orderBy.length - 1]).toHaveProperty('id');
  });

  it('keeps an explicit status filter alongside the view predicate', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 2, upcoming: 2, completed: 0, cancelled: 0 });

    await service.getUserBookings('user-1', {
      status: 'confirmed' as any,
      view: 'upcoming',
    });

    const where = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any;
    expect(where.status).toBe('confirmed');
    expect(where.AND[0].status.notIn).toContain('cancelled');
  });
});

// ─── getUserBookings: DB-03 unpaid holds are not "Upcoming" ──────────────────
//
// DB-03 (prod sweep 2026-08-12): clicking Pay mints a real `pending_payment`
// booking BEFORE the gateway opens, so every abandoned or failed checkout
// leaves a row behind. The devotee is told "You have NOT been charged", and
// then the Upcoming tab shows those unpaid ghosts as if they were real,
// paid-for pujas — the sweep found one devotee with 8 of them. `Upcoming` is
// the tab a customer reads as "pujas I have booked and paid for"; an unpaid
// 30-minute hold is not that.
//
// The view predicate excluded cancelled + the three terminal success states,
// but NOT pending_payment (and not refunded, which is terminal for the same
// reason). Both belong in the exclusion set.

describe('BookingService.getUserBookings — DB-03: unpaid holds are not Upcoming', () => {
  const countMock = prismaMock.pujaBooking.count;

  function viewOf(args: any): 'all' | 'upcoming' | 'completed' | 'cancelled' {
    const p = args?.where?.AND?.[0];
    if (!p) return 'all';
    if (p.status?.in?.includes('cancelled')) return 'cancelled';
    if (p.status?.in) return 'completed';
    return 'upcoming';
  }

  function stubCounts(v: {
    all: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  }) {
    countMock.mockImplementation(async (args: any) => v[viewOf(args)]);
  }

  afterEach(() => {
    countMock.mockReset();
  });

  it('excludes pending_payment from the Upcoming predicate', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 33, upcoming: 12, completed: 7, cancelled: 1 });

    await service.getUserBookings('user-1', { view: 'upcoming' });

    const p = (prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any).AND[0];
    expect(p.status.notIn).toContain('pending_payment');
  });

  it('excludes refunded from the Upcoming predicate — it is terminal too', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 33, upcoming: 12, completed: 7, cancelled: 1 });

    await service.getUserBookings('user-1', { view: 'upcoming' });

    const p = (prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any).AND[0];
    expect(p.status.notIn).toContain('refunded');
  });

  it('the Upcoming COUNT uses the same predicate, so the chip cannot disagree', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 33, upcoming: 12, completed: 7, cancelled: 1 });

    await service.getUserBookings('user-1');

    const upcomingCountArgs = countMock.mock.calls
      .map((c: any[]) => c[0])
      .find((a: any) => viewOf(a) === 'upcoming');
    expect(upcomingCountArgs).toBeTruthy();
    expect((upcomingCountArgs as any).where.AND[0].status.notIn).toContain('pending_payment');
  });

  it('still keeps pending_payment visible under All — the row exists and holds a slot', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    stubCounts({ all: 33, upcoming: 12, completed: 7, cancelled: 1 });

    await service.getUserBookings('user-1', { view: 'all' });

    const where = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!.where as any;
    // No predicate at all on `all` — hiding the ghost rather than letting the
    // devotee complete or release them would be the worse bug.
    expect(where.AND).toBeUndefined();
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
    ).rejects.toThrow('can only be uploaded once the puja has been started');
  });

  it('while the puja is in_progress: stores the proof link only, status unchanged, no payout', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      priestId: 'priest-1',
      status: 'in_progress',
    });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'in_progress',
      videoProofUrl: 'https://video.url',
    });

    await service.uploadVideoProof('booking-1', 'priest-1', 'https://video.url');

    const data = prismaMock.pujaBooking.update.mock.calls[0]![0].data;
    expect(data.videoProofUrl).toBe('https://video.url');
    expect(data.videoUploadedAt).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty('status');
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

  // PF-02 (2026-08-12, P0). This is the SECOND path that sets `video_uploaded`.
  // updateBookingStatus mints the PriestPayout on that transition; this one
  // wrote the status with a raw update and skipped the hook. Because the pandit
  // portal's proof upload comes through HERE, pandits did the puja, filed the
  // proof, got a 200 — and their earnings stayed Rs 0 forever.
  //
  // The two paths must never drift apart again, so this mirrors the
  // "writes a PriestPayout on transition to video_uploaded" test above.
  it('mints the pandit payout — proof upload is the step that earns the money', async () => {
    prismaMock.pujaBooking.findUnique
      // 1. the authz/status read inside uploadVideoProof
      .mockResolvedValueOnce({ id: 'booking-1', priestId: 'pr-1', status: 'completed' })
      // 2. createPriestPayout re-fetches the POST-transition row
      .mockResolvedValue({
        id: 'booking-1',
        status: 'video_uploaded',
        priestId: 'pr-1',
        priestPayout: 880,
        currency: 'INR',
        bookingNumber: 'BS-20261225-ABC12',
      });
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'video_uploaded',
      videoProofUrl: 'https://video.url',
      videoUploadedAt: new Date(),
    });
    prismaMock.priest.findUnique.mockResolvedValue({
      id: 'pr-1',
      aadhaarVerified: true,
      displayName: 'Pandit Joshi',
    });
    prismaMock.priestPayout.findFirst.mockResolvedValue(null);
    // No Commission owns this booking, so the legacy rail is the payer here.
    prismaMock.commission.findFirst.mockResolvedValue(null);
    prismaMock.priestPayout.create.mockResolvedValue({ id: 'payout-1', amount: 880 });

    await service.uploadVideoProof('booking-1', 'pr-1', 'https://video.url');

    // Fire-and-forget: flush the microtask queue before asserting.
    await new Promise((r) => setImmediate(r));

    expect(prismaMock.priestPayout.create).toHaveBeenCalled();
    const call = prismaMock.priestPayout.create.mock.calls[0]![0] as any;
    expect(call.data.bookingId).toBe('booking-1');
    expect(call.data.priestId).toBe('pr-1');
  });

  it('a payout failure never fails the proof upload the pandit just completed', async () => {
    prismaMock.pujaBooking.findUnique
      .mockResolvedValueOnce({ id: 'booking-1', priestId: 'pr-1', status: 'completed' })
      .mockRejectedValue(new Error('payout lookup exploded'));
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BS-20261225-ABC12',
      status: 'video_uploaded',
      videoProofUrl: 'https://video.url',
      videoUploadedAt: new Date(),
    });

    // The proof is the pandit's evidence the work happened — it must be
    // recorded even if the money plumbing is having a bad day.
    const result = await service.uploadVideoProof('booking-1', 'pr-1', 'https://video.url');
    expect(result.status).toBe('video_uploaded');

    await new Promise((r) => setImmediate(r));
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

  // S3-22 (2026-08-11): `Priest.ratingAvg` is a Prisma Float = Postgres `double
  // precision`, and Postgres has no `round(double precision, integer)` — only
  // `round(dp)` and `round(numeric, int)`, with float8→numeric assignment-only
  // and therefore not eligible in function resolution. Without the cast EVERY
  // review on a booking with an assigned pandit raised `function round(double
  // precision, integer) does not exist`, AFTER the booking's own rating had
  // already committed as a separate statement: the devotee saw "Failed to
  // submit review" on a review that was saved, and the retry got "already been
  // submitted". Pandit ratingAvg never left 0, and dispatch.selectCandidates
  // ranks on that column. The harness mocks $executeRawUnsafe and so cannot
  // execute the statement — asserting the cast is in the SQL text is the only
  // binding available at this level.
  it('casts the running average to numeric before ROUND (float8 has no 2-arg round)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'delivered',
      priestId: 'priest-1',
      rating: null,
    });
    prismaMock.pujaBooking.update.mockResolvedValue({ id: 'booking-1', rating: 5 });
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);

    await service.submitReview('booking-1', 'user-1', 5);

    const [sql] = prismaMock.$executeRawUnsafe.mock.calls[0]! as [string];
    const normalized = sql.replace(/\s+/g, ' ');
    expect(normalized).toContain(
      'ROUND((((rating_avg * rating_count) + $1::numeric) / (rating_count + 1))::numeric, 2)',
    );
    // The exact broken shape: ROUND(<float8 expression>, 2).
    expect(normalized).not.toContain('/ (rating_count + 1), 2)');
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

  // ── S3-18 (2026-08-11): availableSlots holds BOTH shapes ─────────────────
  //
  // This method did `(offering.availableSlots as string[])` — a cast, not a
  // conversion. temple-portal accepts `z.array(z.unknown())` and priest.ts
  // documents `{ time, label }` objects, so the moment a manager saved object
  // slots the Map lookup (object key vs the groupBy's string key) never matched:
  // every slot reported 0 booked / full capacity forever, and `time` serialised
  // as an object. Devotees were shown 5/5 free on a slot that was full, then hit
  // the hard "No availability" error at createBooking.
  it('handles object-shaped {time,label} slots, not just bare strings', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      id: 'offering-1',
      isActive: true,
      availableSlots: [
        { time: '10:00', label: 'Morning' },
        { time: '14:00', label: 'Afternoon' },
      ],
      maxBookingsPerSlot: 5,
      temple: { name: 'Test Temple', slug: 'test-temple' },
      pujaType: { name: 'Test Puja', slug: 'test-puja', durationMinutes: 60 },
    });
    prismaMock.pujaBooking.groupBy.mockResolvedValue([
      { scheduledTimeSlot: '10:00', _count: { id: 5 } },
    ]);

    const result = await service.checkSlotAvailability('temple-1', 'puja-1', '2026-12-25');

    // `time` is the renderable string, not '[object Object]'.
    expect(result.slots.map((s: any) => s.time)).toEqual(['10:00', '14:00']);
    // The full slot is reported FULL. Under the cast it read 0 booked / 5 free.
    const slot10 = result.slots.find((s: any) => s.time === '10:00')!;
    expect(slot10.booked).toBe(5);
    expect(slot10.available).toBe(false);
  });

  // S3-04: the availability endpoint and the capacity check must use the SAME
  // occupancy predicate, or the page shows a slot the create path rejects.
  it('ignores expired unpaid holds when counting booked slots', async () => {
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      id: 'offering-1',
      isActive: true,
      availableSlots: ['10:00'],
      maxBookingsPerSlot: 5,
      temple: { name: 'Test Temple', slug: 'test-temple' },
      pujaType: { name: 'Test Puja', slug: 'test-puja', durationMinutes: 60 },
    });
    prismaMock.pujaBooking.groupBy.mockResolvedValue([]);

    await service.checkSlotAvailability('temple-1', 'puja-1', '2026-12-25');

    const where = (prismaMock.pujaBooking.groupBy.mock.calls[0]![0] as any).where;
    expect(where.AND[0]).toEqual({ status: { notIn: ['cancelled', 'refunded'] } });
    expect(where.AND[1].NOT.status).toBe('pending_payment');
    expect(where.AND[1].NOT.createdAt.lt).toBeInstanceOf(Date);
  });
});

// ─── escalateStaleBookings (SLA, issue #179) ────────────────────────────────

describe('BookingService.escalateStaleBookings', () => {
  /** The post-transition row updateBookingStatus returns for a cancel. */
  function cancelUpdateRow() {
    return {
      id: 'booking-stale-1',
      status: 'cancelled',
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: 'pr-1', displayName: 'Pandit Joshi' },
    };
  }

  function staleMocks(rows: any[]) {
    prismaMock.pujaBooking.findMany.mockResolvedValue(rows as any);
    // escalateStaleBookings now routes through updateBookingStatus, which
    // re-reads the booking to validate the transition.
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-stale-1',
      status: 'priest_assigned',
    });
    prismaMock.pujaBooking.update.mockResolvedValue(cancelUpdateRow() as any);
  }

  it('flags priest_assigned bookings past 72h with no videoProof for refund review (cancelled)', async () => {
    staleMocks([
      {
        id: 'booking-stale-1',
        scheduledDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
        scheduledTimeSlot: '10:00',
        priestId: 'priest-1',
      },
    ]);

    const out = await service.escalateStaleBookings(72);

    expect(out.escalated).toContain('booking-stale-1');
    expect(out.scanned).toBe(1);
  });

  // ── S3-12 (2026-08-11) ────────────────────────────────────────────────────
  //
  // The old body was a bare `pujaBooking.update({ data: { status:
  // 'cancelled' } })`: no cancelledAt, no cancellationReason, and no push,
  // because it bypassed updateBookingStatus entirely. The exact scenario this
  // method exists for — devotee paid Rs 10,000, pandit never uploaded proof,
  // 72h past the slot — ended with the booking silently flipped to `cancelled`
  // and the devotee neither told nor placed in any queue an admin sorts by.
  it('stamps cancelledAt and an explicit pandit-fault reason', async () => {
    staleMocks([
      {
        id: 'booking-stale-1',
        scheduledDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
        scheduledTimeSlot: '10:00',
        priestId: 'priest-1',
      },
    ]);

    await service.escalateStaleBookings(72);

    const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as any).data;
    expect(data.status).toBe('cancelled');
    expect(data.cancelledAt).toBeInstanceOf(Date);
    expect(data.cancellationReason).toMatch(/SLA escalation/);
    expect(data.cancellationReason).toMatch(/full refund/);
    expect(String(data.cancellationReason).length).toBeLessThanOrEqual(500);
  });

  // Deliberate, and the opposite of what the finding first prescribed. Writing
  // REFUND_REQUESTED_MARKER hands the row to refund.service.processAutoRefunds,
  // which applies the DEVOTEE ladder — and that ladder matches no tier for a
  // slot 72h in the PAST, so it falls through to the last one: 25%. This is a
  // PANDIT-fault cancellation, which policy defines as 100% of everything paid.
  // Marking it would auto-refund 25% within the hour and flip the booking to
  // `refunded`, removing it from GET /admin/bookings/refunds/pending — turning
  // "devotee is owed Rs 10,000 and an admin can see it" into "devotee silently
  // got Rs 2,500 and has no claim left". refund.service must learn to branch on
  // pandit fault before this path may mark rows for the cron.
  it('does NOT write the auto-refund marker (25% devotee ladder would under-refund)', async () => {
    staleMocks([
      {
        id: 'booking-stale-1',
        scheduledDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
        scheduledTimeSlot: '10:00',
        priestId: 'priest-1',
      },
    ]);

    await service.escalateStaleBookings(72);

    const data = (prismaMock.pujaBooking.update.mock.calls[0]![0] as any).data;
    expect(data.cancellationReason).not.toContain('[refund-requested]');
  });

  // lib/slot-time.ts is the only correct way to compare a booking date+slot.
  // The DB filter is deliberately a day looser than the real test, because the
  // true instant sits between -5h30m and +18h30m of the stored midnight.
  it('measures staleness from the slot INSTANT, not the midnight DATE column', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-11T10:00:00Z'));
      staleMocks([
        {
          // 2026-08-08 23:00 IST = 2026-08-08T17:30Z -> 64.5h before now.
          // The DATE alone (2026-08-08T00:00Z) is 82h back and would wrongly
          // escalate a booking that is not yet 72h stale.
          id: 'booking-stale-1',
          scheduledDate: new Date('2026-08-08T00:00:00Z'),
          scheduledTimeSlot: '23:00',
          priestId: 'priest-1',
        },
      ]);

      const out = await service.escalateStaleBookings(72);

      expect(out.escalated).toEqual([]);
      expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
      // It WAS scanned — the widened DB filter fetched it; the JS test rejected it.
      expect(out.scanned).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('queries only priest_assigned + null videoProof + scheduled before cutoff', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([] as any);
    const out = await service.escalateStaleBookings(72);
    const call = prismaMock.pujaBooking.findMany.mock.calls[0]![0]!;
    expect(call.where.status).toBe('priest_assigned');
    expect(call.where.videoProofUrl).toBeNull();
    expect(call.where.scheduledDate.lt).toBeInstanceOf(Date);
    // The slot string is needed to resolve the real instant.
    expect((call.select as any).scheduledTimeSlot).toBe(true);
    expect(out.escalated).toEqual([]);
    expect(out.scanned).toBe(0);
  });

  it('does nothing when no stale bookings exist', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([] as any);
    const out = await service.escalateStaleBookings(72);
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    expect(out).toEqual({ escalated: [], scanned: 0 });
  });

  it('keeps sweeping when one booking cannot be escalated', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: 'booking-stale-1',
        scheduledDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
        scheduledTimeSlot: '10:00',
        priestId: 'priest-1',
      },
      {
        id: 'booking-stale-2',
        scheduledDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
        scheduledTimeSlot: '10:00',
        priestId: 'priest-2',
      },
    ] as any);
    // First booking has already been moved on by an admin (invalid transition);
    // the second is still priest_assigned.
    prismaMock.pujaBooking.findUnique
      .mockResolvedValueOnce({ id: 'booking-stale-1', status: 'refunded' })
      .mockResolvedValue({ id: 'booking-stale-2', status: 'priest_assigned' });
    prismaMock.pujaBooking.update.mockResolvedValue(cancelUpdateRow() as any);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const out = await service.escalateStaleBookings(72);

    expect(out.escalated).toEqual(['booking-stale-2']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
