import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * DI-05 (prod sweep 2026-08-12, P1) — THE TEMPLE PATH NEVER PAID THE PANDIT.
 *
 * `writePujaCommissionOnConfirm` returns early when `booking.priestId` is null
 * (payment.service.ts:245). On the temple booking path no priest is assigned at
 * PAYMENT time — the pandit is attached later by a PATCH — and nothing re-ran
 * the writer once he was. The reassignment block in routes/bookings.ts only
 * calls `commission.updateMany`, which matches zero rows when no commission was
 * ever minted.
 *
 * Driven end to end on 2026-08-12: create-order -> verify-payment (captured,
 * booking confirmed) -> PATCH priest_assigned -> in_progress -> completed, all
 * 200. `commissions` stayed at 0 rows for that booking while
 * `puja_bookings.priest_payout` read Rs 770. The pandit's own surfaces then
 * answered GET /payouts/balance {availableInr: 0} and GET /payouts/commissions
 * {data: [], total: 0}.
 *
 * A pandit who completed pujas booked through a temple opens the payout page
 * the product tells him to use and sees zero. It is the default experience for
 * temple-anchored bookings and the single most trust-destroying screen in a
 * marketplace.
 */

const templePayoutMock = { findFirst: vi.fn(), create: vi.fn() };
const priestPujaOfferingMock = { findUnique: vi.fn() };
(prismaMock as any).templePayout = templePayoutMock;
(prismaMock as any).priestPujaOffering = priestPujaOfferingMock;
const paymentCountMock = vi.fn();
(prismaMock as any).payment.count = paymentCountMock;
(prismaMock as any).dispatchOffer = { updateMany: vi.fn() };

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { BookingService } from './booking.service.js';

const PRIEST_ROW_ID = 'pr-1';
const PANDIT_USER_ID = 'u-pandit-1';

let service: BookingService;

/** A PAID, confirmed temple booking that never had a priest until now. */
function arrangeTemplePathAssignment(overrides: { commissionExists?: boolean } = {}) {
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: 'confirmed',
  } as never);
  prismaMock.pujaBooking.update.mockResolvedValue({
    id: 'booking-1',
    status: 'priest_assigned',
    priestId: PRIEST_ROW_ID,
    priceAmount: new Prisma.Decimal('1151.00'),
    priestPayout: new Prisma.Decimal('770.00'),
    pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
    temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
    user: { id: 'u-1' },
    priest: { id: PRIEST_ROW_ID, displayName: 'Pandit Joshi' },
  } as never);
  prismaMock.commission.findFirst.mockResolvedValue(
    (overrides.commissionExists ? { id: 'c-existing' } : null) as never,
  );
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.priest.findUnique.mockResolvedValue({
    id: PRIEST_ROW_ID,
    userId: PANDIT_USER_ID,
    displayName: 'Pandit Joshi',
  } as never);
  paymentCountMock.mockResolvedValue(1);
}

beforeEach(() => {
  vi.clearAllMocks();
  service = new BookingService();
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
});

describe('DI-05 — attaching the pandit mints the earning he is owed', () => {
  it('writes the Commission when a PAID temple booking gets its priest', async () => {
    arrangeTemplePathAssignment();

    await service.updateBookingStatus('booking-1', 'priest_assigned' as any);

    expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
    const data = (prismaMock.commission.createMany.mock.calls[0]![0] as { data: any[] }).data[0];
    expect(data.bookingId).toBe('booking-1');
    // The payout engine reads a User.id — writing the Priest row id here is
    // what orphaned every earlier row (RV-04).
    expect(data.providerId).toBe(PANDIT_USER_ID);
    // `amount` is the PROVIDER's earning, never the platform's cut.
    expect(data.amount.toString()).toBe('770');
    // `percentage` is the PLATFORM's take rate against the same fee-inclusive
    // base the other writers use: (1151 - 770) / 1151.
    expect(Number(data.percentage)).toBeCloseTo(381 / 1151, 6);
    expect(data.status).toBe('PENDING');
  });

  it('is idempotent — a re-PATCH of the same assignment does not mint a second earning', async () => {
    arrangeTemplePathAssignment({ commissionExists: true });

    await service.updateBookingStatus('booking-1', 'priest_assigned' as any);

    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('does not mint for an UNPAID booking', async () => {
    arrangeTemplePathAssignment();
    paymentCountMock.mockResolvedValue(0);

    await service.updateBookingStatus('booking-1', 'priest_assigned' as any);

    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('does not mint when the transition is a cancellation', async () => {
    arrangeTemplePathAssignment();
    prismaMock.pujaBooking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'cancelled',
      priestId: PRIEST_ROW_ID,
      priceAmount: new Prisma.Decimal('1151.00'),
      priestPayout: new Prisma.Decimal('770.00'),
      pujaType: { id: 'pt-1', name: 'Satyanarayan Puja', slug: 'satyanarayan' },
      temple: { id: 't-1', name: 'Shri Kashi Vishwanath', slug: 'kashi' },
      user: { id: 'u-1' },
      priest: { id: PRIEST_ROW_ID, displayName: 'Pandit Joshi' },
    } as never);

    await service.updateBookingStatus('booking-1', 'cancelled' as any);

    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });
});
