import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

(prismaMock as any).dispatchOffer = {
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
};

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const notifyDevotee = vi.fn().mockResolvedValue(undefined);
vi.mock('./booking-notify.service.js', () => ({
  notifyDevotee: (...a: unknown[]) => notifyDevotee(...a),
  sendOfferToPriest: vi.fn().mockResolvedValue(undefined),
  notifyPriest: vi.fn().mockResolvedValue(undefined),
  buildBookingCtx: (b: unknown) => b,
  priestContact: vi.fn().mockResolvedValue({ phone: null }),
}));

const mintMock = vi.fn().mockResolvedValue('minted');
vi.mock('./provider-earning-mint.js', () => ({
  mintProviderEarningForBooking: (...a: unknown[]) => mintMock(...a),
}));
vi.mock('../lib/audit-money-callsites.js', () => ({
  recordProviderEarningMinted: vi.fn().mockResolvedValue(undefined),
}));

import { DispatchService } from './dispatch.service.js';
import { priestSlotKey } from '../lib/priest-slot.js';

// A temple puja offering's "Assigned Priest" must route the booking to that
// priest once it is paid (confirmed), instead of the open pool, when the priest
// is verified and active and free at that date and slot. Anything else falls
// back to the open pool: the booking is never stranded.

const scheduledDate = new Date('2026-12-15T00:00:00.000Z');
let service: DispatchService;

function arm(over: {
  booking?: Record<string, unknown> | null;
  offering?: Record<string, unknown> | null;
  priest?: Record<string, unknown> | null;
  conflict?: unknown;
} = {}) {
  prismaMock.pujaBooking.findUnique.mockResolvedValue(
    over.booking === undefined
      ? ({
          id: 'b1',
          status: 'confirmed',
          priestId: null,
          templePujaOfferingId: 'off1',
          scheduledDate,
          scheduledTimeSlot: '09:00',
          priceAmount: 1000,
          priestPayout: 800,
        } as never)
      : (over.booking as never),
  );
  prismaMock.templePujaOffering.findUnique.mockResolvedValue(
    over.offering === undefined ? ({ assignedPriestId: 'pr1' } as never) : (over.offering as never),
  );
  prismaMock.priest.findUnique.mockResolvedValue(
    over.priest === undefined
      ? ({ id: 'pr1', isVerified: true, status: 'active' } as never)
      : (over.priest as never),
  );
  prismaMock.pujaBooking.findFirst.mockResolvedValue((over.conflict ?? null) as never);
  prismaMock.pujaBooking.update.mockResolvedValue({
    id: 'b1',
    priestId: 'pr1',
    priceAmount: 1000,
    priestPayout: 800,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  service = new DispatchService();
});

describe('DispatchService.assignPinnedPriest', () => {
  it('assigns the offering priest: priest_assigned, mints their earning, tells the devotee', async () => {
    arm();
    const res = await service.assignPinnedPriest('b1');

    expect(res).toEqual({ assigned: true, priestId: 'pr1' });
    const upd = prismaMock.pujaBooking.update.mock.calls[0]![0] as any;
    expect(upd.where).toEqual({ id: 'b1', status: 'confirmed', priestId: null });
    expect(upd.data).toMatchObject({ priestId: 'pr1', status: 'priest_assigned', assignedVia: 'temple_pin' });
    expect(mintMock).toHaveBeenCalledTimes(1);
    expect(notifyDevotee).toHaveBeenCalledWith('assigned', expect.anything());
  });

  it('takes the shared priest-slot lock before the conflict check', async () => {
    arm();
    await service.assignPinnedPriest('b1');
    const lock = prismaMock.$queryRawUnsafe.mock.calls[0]!;
    expect(String(lock[0])).toContain('pg_advisory_xact_lock');
    expect(lock[1]).toBe(priestSlotKey('pr1', scheduledDate, '09:00'));
    expect(prismaMock.$queryRawUnsafe.mock.invocationCallOrder[0]!).toBeLessThan(
      prismaMock.pujaBooking.findFirst.mock.invocationCallOrder[0]!,
    );
  });

  it.each([
    ['no assigned priest on the offering', { offering: { assignedPriestId: null } }, 'no_pinned_priest'],
    ['offering not found', { offering: null }, 'no_pinned_priest'],
    ['priest not verified', { priest: { id: 'pr1', isVerified: false, status: 'active' } }, 'priest_not_eligible'],
    ['priest suspended', { priest: { id: 'pr1', isVerified: true, status: 'suspended' } }, 'priest_not_eligible'],
    ['priest row missing', { priest: null }, 'priest_not_eligible'],
    ['priest already booked at that slot', { conflict: { id: 'other' } }, 'priest_busy'],
    ['booking already has a priest', { booking: { id: 'b1', status: 'confirmed', priestId: 'x', templePujaOfferingId: 'off1', scheduledDate, scheduledTimeSlot: '09:00' } }, 'not_open'],
    ['booking not confirmed', { booking: { id: 'b1', status: 'pending_payment', priestId: null, templePujaOfferingId: 'off1', scheduledDate, scheduledTimeSlot: '09:00' } }, 'not_open'],
    ['booking has no temple offering', { booking: { id: 'b1', status: 'confirmed', priestId: null, templePujaOfferingId: null, scheduledDate, scheduledTimeSlot: '09:00' } }, 'no_pinned_priest'],
  ])('falls back to the open pool (no assignment): %s', async (_name, over, reason) => {
    arm(over as never);
    const res = await service.assignPinnedPriest('b1');
    expect(res).toEqual({ assigned: false, reason });
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('never throws: a failure leaves the booking in the open pool', async () => {
    arm();
    prismaMock.pujaBooking.update.mockRejectedValue(new Error('db down'));
    const res = await service.assignPinnedPriest('b1');
    expect(res).toEqual({ assigned: false, reason: 'error' });
  });
});
