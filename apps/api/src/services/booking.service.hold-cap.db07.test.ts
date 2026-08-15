/**
 * DB-07, first half — one devotee must not be able to hold a slot five times.
 *
 * Sweep repro (2026-08-12), real devotee token, offering slot at
 * {remaining:5, total:5}: six POSTs to /bookings/create-order with the same
 * offering + date + slot returned 201 five times (BS-20260812-IMJRW, M9OBX,
 * KXVGX, B6R1Z, S5VSQ) and 409 on the sixth, after which GET /bookings/slots
 * reported {"remaining":0,"total":5} for a slot NOBODY had paid for. The holds
 * survive UNPAID_HOLD_MINUTES, so a marquee slot goes dark for half an hour.
 *
 * RES-05's idempotent reuse already covers the byte-identical retry. It is
 * deliberately narrow — a different devotee list, amount or prasad choice is a
 * genuinely different booking — and the sweep varied the devotee name, which is
 * precisely how five rows appeared. So the two rules compose:
 *
 *   identical repeat  -> hand back the SAME hold (RES-05, unchanged)
 *   different repeat  -> refuse; you are already holding this slot (here)
 *
 * Refuse rather than silently reuse: handing back a hold for a different
 * devotee party or a different amount would charge this devotee for something
 * they did not ask for, which is the trap RES-05's own comment calls out.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { BookingService } from './booking.service.js';

const service = new BookingService();

const USER_ID = '22222222-2222-4222-8222-222222222222';
const OFFERING_ID = '11111111-1111-4111-8111-111111111111';

function futureDate(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

const createArgs = (over: Record<string, unknown> = {}) => ({
  userId: USER_ID,
  templeId: '33333333-3333-4333-8333-333333333333',
  pujaTypeId: '44444444-4444-4444-8444-444444444444',
  templePujaOfferingId: OFFERING_ID,
  scheduledDate: futureDate(),
  scheduledTimeSlot: '06:00',
  devoteeNames: [{ name: 'Arjun Sharma' }],
  prasadDeliveryRequested: false,
  ...over,
});

/** The hold the devotee already owns on this offering + date + slot. */
function existingHold(over: Record<string, unknown> = {}) {
  return {
    id: 'bk-hold-1',
    bookingNumber: 'BS-20260812-IMJRW',
    status: 'pending_payment',
    priceAmount: new Prisma.Decimal('1151.00'),
    currency: 'INR',
    scheduledDate: new Date(`${futureDate()}T00:00:00.000Z`),
    scheduledTimeSlot: '06:00',
    createdAt: new Date(),
    devoteeNames: [{ name: 'Arjun Sharma' }],
    prasadDeliveryRequested: false,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  prismaMock.templePujaOffering.findUnique.mockResolvedValue({
    id: OFFERING_ID,
    templeId: '33333333-3333-4333-8333-333333333333',
    pujaTypeId: '44444444-4444-4444-8444-444444444444',
    isActive: true,
    availableSlots: ['06:00', '09:00'],
    maxBookingsPerSlot: 5,
    priceOverride: null,
    pujaType: { basePrice: 1100, nriPrice: 11000 },
    temple: { id: '33333333-3333-4333-8333-333333333333', name: 'Kashi', isVerified: true },
  } as never);
  prismaMock.user.findUnique.mockResolvedValue({ id: USER_ID, isNri: false } as never);
  prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);
  prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never);
  prismaMock.pujaBooking.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.create.mockResolvedValue({
    id: 'bk-new',
    bookingNumber: 'BS-20260812-NEW01',
    status: 'pending_payment',
    priceAmount: new Prisma.Decimal('1151.00'),
    currency: 'INR',
    scheduledDate: new Date(),
    scheduledTimeSlot: '06:00',
    createdAt: new Date(),
  } as never);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    typeof fn === 'function' ? fn(prismaMock) : fn,
  );
});

describe('DB-07 — a second, different hold on a slot the devotee already holds', () => {
  it('is refused instead of minting a second row', async () => {
    // Same offering + date + slot, DIFFERENT devotee party — so RES-05's
    // identity reuse deliberately does not fire.
    prismaMock.pujaBooking.findFirst.mockResolvedValue(existingHold() as never);

    await expect(
      service.createBooking(createArgs({ devoteeNames: [{ name: 'Someone Else' }] })),
    ).rejects.toThrow(/already have an unpaid booking/i);

    expect(prismaMock.pujaBooking.create).not.toHaveBeenCalled();
  });

  it('names the booking the devotee is already holding so they can go pay it', async () => {
    prismaMock.pujaBooking.findFirst.mockResolvedValue(existingHold() as never);

    await expect(
      service.createBooking(createArgs({ devoteeNames: [{ name: 'Someone Else' }] })),
    ).rejects.toThrow(/BS-20260812-IMJRW/);
  });

  it('still hands back the SAME hold for a byte-identical repeat (RES-05)', async () => {
    prismaMock.pujaBooking.findFirst.mockResolvedValue(existingHold() as never);

    const result = await service.createBooking(createArgs());

    expect(result.bookingNumber).toBe('BS-20260812-IMJRW');
    expect(prismaMock.pujaBooking.create).not.toHaveBeenCalled();
  });

  it('still creates a booking when the devotee holds nothing on this slot', async () => {
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);

    const result = await service.createBooking(createArgs());

    expect(result.bookingNumber).toBe('BS-20260812-NEW01');
    expect(prismaMock.pujaBooking.create).toHaveBeenCalled();
  });
});
