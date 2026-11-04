import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * QA_PAYER_EMAILS end to end through createBooking: a Rs 1 puja costs a tester
 * exactly Rs 1 (no Rs 51 platform fee, no Rs 150 prasad fee), the 80/20 split
 * is computed in whole paise, and nobody else's price moves.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { BookingService } from './booking.service.js';

const USER_ID = 'u-qa-1';
const OFFERING_ID = 'off-qa-1';
const SLOT = '07:00';
const DATE = '2027-02-28';

const INPUT = {
  userId: USER_ID,
  templeId: 't-1',
  pujaTypeId: 'pt-1',
  templePujaOfferingId: OFFERING_ID,
  scheduledDate: DATE,
  scheduledTimeSlot: SLOT,
  devoteeNames: [{ name: 'Asha Devi', gotra: 'Kashyap' }],
  prasadDeliveryRequested: false,
};

function arrange(email: string | null) {
  prismaMock.user.findUnique.mockResolvedValue({ id: USER_ID, email } as never);
  prismaMock.templePujaOffering.findUnique.mockResolvedValue({
    id: OFFERING_ID,
    templeId: 't-1',
    pujaTypeId: 'pt-1',
    isActive: true,
    priceOverride: new Prisma.Decimal('1.00'),
    nriPrice: null,
    maxBookingsPerSlot: 5,
    availableSlots: [SLOT],
    assignedPriestId: null,
    temple: { id: 't-1', name: 'QA Mandir', isVerified: true },
    pujaType: { id: 'pt-1', basePrice: new Prisma.Decimal('1101.00'), nriPrice: null, isActive: true },
  } as never);
  prismaMock.pujaBooking.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never);
  prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);
  prismaMock.userAddress.findFirst.mockResolvedValue({
    id: 'addr-1',
    country: 'IN',
    pincode: '110001',
  } as never);
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

const created = () => (prismaMock.pujaBooking.create.mock.calls[0]![0] as any).data;
const ORIGINAL = process.env.QA_PAYER_EMAILS;

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QA_PAYER_EMAILS;
  else process.env.QA_PAYER_EMAILS = ORIGINAL;
});

describe('createBooking with QA_PAYER_EMAILS', () => {
  it('QA payer: Rs 1 puja = Rs 1 charged, split 0.80 / 0.20 in whole paise', async () => {
    process.env.QA_PAYER_EMAILS = 'test.devotee@example.com';
    arrange('Test.Devotee@example.com');
    await new BookingService().createBooking(INPUT as never);
    const d = created();
    expect(d.priceAmount.toString()).toBe('1');
    expect(d.priestPayout.toFixed(2)).toBe('0.80');
    expect(d.platformCommission.toFixed(2)).toBe('0.20');
    expect(d.priestPayout.add(d.platformCommission).toFixed(2)).toBe('1.00');
  });

  it('QA payer asking for prasad delivery still pays no prasad fee', async () => {
    process.env.QA_PAYER_EMAILS = 'test.devotee@example.com';
    arrange('test.devotee@example.com');
    await new BookingService().createBooking({
      ...INPUT,
      prasadDeliveryRequested: true,
      prasadDeliveryAddressId: 'addr-1',
    } as never);
    expect(created().priceAmount.toString()).toBe('1');
  });

  it('a customer NOT on the list still pays Rs 1 + Rs 51 (+ Rs 150 with prasad)', async () => {
    process.env.QA_PAYER_EMAILS = 'test.devotee@example.com';
    arrange('real.customer@gmail.com');
    await new BookingService().createBooking(INPUT as never);
    expect(created().priceAmount.toString()).toBe('52');

    vi.clearAllMocks();
    arrange('real.customer@gmail.com');
    await new BookingService().createBooking({
      ...INPUT,
      prasadDeliveryRequested: true,
      prasadDeliveryAddressId: 'addr-1',
    } as never);
    expect(created().priceAmount.toString()).toBe('202');
  });

  it('with the env unset even the tester email pays the normal fees', async () => {
    delete process.env.QA_PAYER_EMAILS;
    arrange('test.devotee@example.com');
    await new BookingService().createBooking(INPUT as never);
    expect(created().priceAmount.toString()).toBe('52');
  });
});
