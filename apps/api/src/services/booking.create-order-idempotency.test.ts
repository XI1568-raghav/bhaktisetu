import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * RES-05 (prod sweep 2026-08-12, P1) — POST /bookings/create-order had no
 * idempotency, so a retry minted a second booking AND a second payable
 * Razorpay order.
 *
 * Measured: three byte-identical POSTs in the same tick with one devotee token
 * (offering ee690cd7…, 2027-02-28, slot 07:00) returned [201,201,201] with
 * three distinct bookings BS-20260812-VXVHO / RQRUX / PP6S4 and three distinct
 * Razorpay order ids, each for Rs 1,552. Postgres confirmed three separate
 * pending_payment rows on the same
 * (temple_puja_offering_id, scheduled_date, scheduled_time_slot).
 *
 * Capacity was never oversold — the advisory lock and max_bookings_per_slot=5
 * hold — so this is duplicate INTENT, not oversell. But a devotee whose
 * response is lost to a mobile handover retries and now owns two bookings and
 * two live Razorpay orders for one puja: two charges to reverse, or one paid
 * booking plus a phantom pending_payment row holding slot inventory. Each
 * duplicate also consumes 1 of the 5 places on a popular muhurat slot for the
 * 30-minute hold window.
 *
 * The client guard was never the gap (a useRef/useState guard produced exactly
 * one POST under 3 parallel clicks and a native dblclick). The exposure is
 * server-side, and the fix belongs inside the slot lock — the one place that
 * already serialises racers.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { BookingService } from './booking.service.js';

const USER_ID = 'u-devotee-1';
const OFFERING_ID = 'off-ee690cd7';
const SLOT = '07:00';
const DATE = '2027-02-28';

let service: BookingService;

const CREATE_INPUT = {
  userId: USER_ID,
  templeId: 't-1',
  pujaTypeId: 'pt-1',
  templePujaOfferingId: OFFERING_ID,
  scheduledDate: DATE,
  scheduledTimeSlot: SLOT,
  devoteeNames: [{ name: 'Asha Devi', gotra: 'Kashyap' }],
  prasadDeliveryRequested: false,
};

/** Rs 1,101 puja + Rs 51 platform fee, no prasad. */
const EXPECTED_PRICE = '1152';

function arrange(existing: unknown) {
  prismaMock.user.findUnique.mockResolvedValue({ id: USER_ID, isNri: false } as never);
  prismaMock.templePujaOffering.findUnique.mockResolvedValue({
    id: OFFERING_ID,
    templeId: 't-1',
    pujaTypeId: 'pt-1',
    isActive: true,
    priceOverride: new Prisma.Decimal('1101.00'),
    nriPrice: null,
    maxBookingsPerSlot: 5,
    availableSlots: [SLOT],
    assignedPriestId: null,
    temple: { id: 't-1', name: 'Shri Kashi Vishwanath', isVerified: true },
    pujaType: { id: 'pt-1', basePrice: new Prisma.Decimal('1101.00'), nriPrice: null, isActive: true },
  } as never);
  prismaMock.pujaBooking.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never); // booking-number collision check
  prismaMock.pujaBooking.findFirst.mockResolvedValue(existing as never);
  prismaMock.pujaBooking.create.mockImplementation(async (args: any) => ({
    id: 'bk-new',
    bookingNumber: args.data.bookingNumber,
    status: 'pending_payment',
    priceAmount: args.data.priceAmount,
    currency: 'INR',
  }));
  prismaMock.$queryRaw.mockResolvedValue([] as never);
  prismaMock.$executeRaw.mockResolvedValue(0 as never);
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
}

beforeEach(() => {
  vi.clearAllMocks();
  service = new BookingService();
});

describe('RES-05 — create-order is idempotent on the natural booking key', () => {
  it('returns the existing pending_payment hold instead of minting a second booking', async () => {
    arrange({
      id: 'bk-first',
      bookingNumber: 'BS-20260812-VXVHO',
      status: 'pending_payment',
      priceAmount: new Prisma.Decimal(EXPECTED_PRICE),
      currency: 'INR',
      devoteeNames: CREATE_INPUT.devoteeNames,
      prasadDeliveryRequested: false,
    });

    const out = await service.createBooking(CREATE_INPUT as never);

    expect(prismaMock.pujaBooking.create).not.toHaveBeenCalled();
    expect(out.id).toBe('bk-first');
    expect(out.bookingNumber).toBe('BS-20260812-VXVHO');
  });

  it('still creates a booking when there is no live hold to reuse', async () => {
    arrange(null);

    const out = await service.createBooking(CREATE_INPUT as never);

    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
    expect(out.id).toBe('bk-new');
  });

  it('does not reuse a hold whose request differs — a different prasad choice is a different booking', async () => {
    arrange({
      id: 'bk-first',
      bookingNumber: 'BS-20260812-VXVHO',
      status: 'pending_payment',
      // Rs 150 prasad fee on the earlier hold: not the same request, so
      // reusing it would charge this devotee for something else entirely.
      priceAmount: new Prisma.Decimal('1302'),
      currency: 'INR',
      devoteeNames: CREATE_INPUT.devoteeNames,
      prasadDeliveryRequested: true,
    });

    const out = await service.createBooking(CREATE_INPUT as never);

    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
    expect(out.id).toBe('bk-new');
  });

  it('does not reuse a hold booked for different devotees', async () => {
    arrange({
      id: 'bk-first',
      bookingNumber: 'BS-20260812-VXVHO',
      status: 'pending_payment',
      priceAmount: new Prisma.Decimal(EXPECTED_PRICE),
      currency: 'INR',
      devoteeNames: [{ name: 'Ramesh Kumar', gotra: 'Bharadwaj' }],
      prasadDeliveryRequested: false,
    });

    const out = await service.createBooking(CREATE_INPUT as never);

    expect(prismaMock.pujaBooking.create).toHaveBeenCalledTimes(1);
    expect(out.id).toBe('bk-new');
  });

  it('scopes the reuse lookup to this devotee, this offering, this date and this slot', async () => {
    arrange(null);

    await service.createBooking(CREATE_INPUT as never);

    const where = prismaMock.pujaBooking.findFirst.mock.calls.at(-1)![0].where;
    expect(where.userId).toBe(USER_ID);
    expect(where.templePujaOfferingId).toBe(OFFERING_ID);
    expect(where.scheduledTimeSlot).toBe(SLOT);
    expect(where.status).toBe('pending_payment');
  });
});
