import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./booking.service.js', () => ({
  BookingService: vi.fn().mockImplementation(() => ({ updateBookingStatus: vi.fn(), uploadVideoProof: vi.fn() })),
}));

import { Prisma } from '@prisma/client';
import { PriestService } from './priest.service.js';

/**
 * Customer test 2026-10-05 — the stranded paid booking.
 *
 * A devotee pays, the booking becomes `confirmed` with no pandit (the default
 * "scheduled" tier), and from there NOTHING moved it: the pandit portal lists
 * only bookings already assigned to that pandit, the admin has no assign tool,
 * and production has 25 active puja offerings, none with a pandit pinned, no
 * pandit offerings and nobody on duty. The first real customer would have paid
 * for a puja no pandit could ever see.
 *
 * `acceptBooking` already says "either the priest is already assigned, or we
 * assign them now" — the self-pick the dispatch design calls T4. What was
 * missing is the list to pick from, and a check that the picker is approved.
 */
let service: PriestService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new PriestService();
});

const verified = { isVerified: true, status: 'active' };

describe('PriestService.getOpenRequests', () => {
  it('shows nothing, and says why, to a pandit who is not approved yet', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ isVerified: false, status: 'active', userId: 'u-1' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ approved: false });
    const out = await service.getOpenRequests('priest-1');
    expect(out).toEqual({ eligible: false, requests: [] });
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });

  it('REQUIRE_PROVIDER_APPROVAL off: a live pandit profile is enough, Priest.isVerified is not required (TC-08: it is never minted)', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ isVerified: false, status: 'active', userId: 'u-1' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ approved: true });
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    const out = await service.getOpenRequests('priest-1');
    expect(out.eligible).toBe(true);
  });

  it('a suspended or inactive Priest row is never eligible, whatever the profile says', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ isVerified: false, status: 'inactive', userId: 'u-1' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ approved: true });
    const out = await service.getOpenRequests('priest-1');
    expect(out).toEqual({ eligible: false, requests: [] });
  });

  it('shows nothing to a suspended pandit even if verified', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ isVerified: true, status: 'suspended' });
    expect((await service.getOpenRequests('priest-1')).eligible).toBe(false);
  });

  it('lists paid, unassigned, upcoming bookings to an approved pandit, soonest first', async () => {
    prismaMock.priest.findUnique.mockResolvedValue(verified);
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: 'bk-1',
        bookingNumber: 'BS-1',
        scheduledDate: new Date('2026-10-08T00:00:00Z'),
        scheduledTimeSlot: '07:00',
        devoteeNames: [{ name: 'Arjun Sharma', gotra: 'Kashyap' }, { name: 'Meera' }],
        priestPayout: new Prisma.Decimal('2400.00'),
        pujaType: { name: 'Hanuman Chalisa Path' },
        temple: { name: 'Kashi Vishwanath Temple', city: 'Varanasi', state: 'Uttar Pradesh' },
      },
    ]);
    const out = await service.getOpenRequests('priest-1');

    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as any;
    expect(args.where.status).toBe('confirmed');
    expect(args.where.priestId).toBeNull();
    expect(args.where.scheduledDate.gte).toBeInstanceOf(Date);
    expect(args.orderBy).toEqual([{ scheduledDate: 'asc' }, { createdAt: 'asc' }]);

    expect(out.eligible).toBe(true);
    expect(out.requests).toEqual([
      {
        id: 'bk-1',
        bookingNumber: 'BS-1',
        scheduledDate: new Date('2026-10-08T00:00:00Z'),
        scheduledTimeSlot: '07:00',
        devoteeCount: 2,
        priestEarningInr: 2400,
        pujaName: 'Hanuman Chalisa Path',
        templeName: 'Kashi Vishwanath Temple',
        city: 'Varanasi',
      },
    ]);
  });

  it('never exposes a devotee name or gotra before the pandit has accepted', async () => {
    prismaMock.priest.findUnique.mockResolvedValue(verified);
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: 'bk-1', bookingNumber: 'BS-1', scheduledDate: new Date(), scheduledTimeSlot: '07:00',
        devoteeNames: [{ name: 'Arjun Sharma', gotra: 'Kashyap' }],
        pujaType: { name: 'P' }, temple: { name: 'T', city: 'C', state: 'S' },
      },
    ]);
    const json = JSON.stringify(await service.getOpenRequests('priest-1'));
    expect(json).not.toMatch(/Arjun|Kashyap/);
  });

  it('asks the database for the minimum fields only (no names, no address, only the pandit earning)', async () => {
    prismaMock.priest.findUnique.mockResolvedValue(verified);
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    await service.getOpenRequests('priest-1');
    const select = (prismaMock.pujaBooking.findMany.mock.calls[0]![0] as any).select;
    expect(Object.keys(select).sort()).toEqual(
      ['bookingNumber', 'devoteeNames', 'id', 'priestPayout', 'pujaType', 'scheduledDate', 'scheduledTimeSlot', 'temple'].sort(),
    );
  });
});

describe('PriestService.acceptBooking — taking an unassigned booking', () => {
  const confirmedUnassigned = {
    id: 'bk-1', status: 'confirmed', priestId: null,
    scheduledDate: new Date('2026-12-25'), scheduledTimeSlot: '10:00',
  };

  it('refuses a pandit who is not approved', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(confirmedUnassigned);
    prismaMock.priest.findUnique.mockResolvedValue({ isVerified: false, status: 'active', userId: 'u-1' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ approved: false });
    await expect(service.acceptBooking('bk-1', 'priest-1')).rejects.toThrow(/complete your pandit profile/i);
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('does not re-check approval for a booking already assigned to this pandit (a temple pinned them)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({ ...confirmedUnassigned, priestId: 'priest-1', status: 'priest_assigned' });
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.pujaBooking.update.mockResolvedValue({ id: 'bk-1', status: 'priest_assigned', priestId: 'priest-1' });
    await service.acceptBooking('bk-1', 'priest-1').catch(() => undefined);
    expect(prismaMock.priest.findUnique).not.toHaveBeenCalled();
  });
});
