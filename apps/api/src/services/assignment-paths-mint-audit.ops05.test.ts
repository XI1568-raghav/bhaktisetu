import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (wiring) — the two DI-05 assignment paths put their mint on the trail.
 *
 * `lib/audit-money-callsites.test.ts` proves the helper. This file proves the
 * two services actually CALL it, and — the part that matters — that they call
 * it AFTER their transaction has committed rather than inside it.
 *
 * Why that ordering is the assertion worth writing: `mintProviderEarningForBooking`
 * runs inside the caller's `$transaction`, and the obvious place to log a mint
 * is right next to it. Doing that would put the audit INSERT inside the
 * caller's transaction, where a failure — a missing table, a bad column —
 * aborts the whole transaction in Postgres and rolls back the pandit's
 * assignment. `recordMoneyEvent` accepts no `tx` precisely to make that
 * impossible, and a call site can still get it wrong. So the mint outcome is
 * carried out on a closure variable and recorded after the commit, and that is
 * what is asserted here.
 */

const dispatchOfferMock = {
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
};
// ADD, never reassign, on the shared mock.
(prismaMock as unknown as Record<string, unknown>).dispatchOffer = dispatchOfferMock;

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

vi.mock('./booking-notify.service.js', () => ({
  notifyDevotee: vi.fn().mockResolvedValue(undefined),
  sendOfferToPriest: vi.fn().mockResolvedValue(undefined),
  buildBookingCtx: (b: unknown) => b,
  priestContact: vi.fn().mockResolvedValue({ phone: null }),
}));
vi.mock('../routes/notifications.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, notifyUser: vi.fn().mockResolvedValue(0) };
});

import { DispatchService } from './dispatch.service.js';
import { PriestService } from './priest.service.js';

const scheduledDate = new Date('2026-09-15T00:00:00.000Z');

const ASSIGNED_ROW = {
  id: 'booking-1',
  priestId: 'priest-1',
  status: 'priest_assigned',
  priceAmount: new Prisma.Decimal('1000.00'),
  priestPayout: new Prisma.Decimal('770.00'),
  temple: { id: 't1', name: 'Test Temple' },
  pujaType: { id: 'p1', name: 'Satyanarayan' },
  user: { id: 'user-1', fullName: 'Ram', phone: null },
  priest: { displayName: 'Pandit A' },
};

/**
 * The mint's four guards armed to PASS, plus the post-commit lookup.
 *
 * `commission.findFirst` is called TWICE on a successful mint and must answer
 * differently each time: first as the mint's own idempotency guard, where a row
 * means "already minted, do nothing", and then by the audit helper recovering
 * the id of the row that was just written. Hence `Once(null)` then the row.
 */
function armMintGuardsAndLookup() {
  prismaMock.commission.findFirst
    .mockResolvedValueOnce(null as never)
    .mockResolvedValue({
      id: 'cm-new',
      amount: new Prisma.Decimal('770.00'),
      providerId: 'user-pandit-1',
    } as never);
  prismaMock.priestPayout.findFirst.mockResolvedValue(null as never);
  prismaMock.payment.count.mockResolvedValue(1 as never);
  // userId is for the earning mint; isVerified/status are for the self-pick approval check.
  prismaMock.priest.findUnique.mockResolvedValue({ userId: 'user-pandit-1', isVerified: true, status: 'active' } as never);
  prismaMock.commission.create.mockResolvedValue({ id: 'cm-new' } as never);
  // DI-06 (F367): the mint inserts through createMany({ skipDuplicates }) —
  // ON CONFLICT DO NOTHING against the UNIQUE index on commissions.booking_id,
  // so the loser of a two-rail race writes nothing instead of raising P2002 and
  // aborting the assignment transaction. `count: 1` means "this call wrote it",
  // which is what makes the mint report 'minted' and log the money event.
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);
}

function mintEvents(): Array<Record<string, unknown>> {
  return recordMoneyEventSpy.mock.calls
    .map((c) => (c as unknown as [Record<string, unknown>])[0])
    .filter((e) => e.eventType === 'commission.minted');
}

describe('OPS-05 — DispatchService.accept records the mint it performs', () => {
  let service: DispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DispatchService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      priestId: null,
      scheduledDate,
      scheduledTimeSlot: '09:00',
      pujaType: { name: 'Satyanarayan' },
      temple: { name: 'Test Temple' },
      user: { id: 'user-1', fullName: 'Ram', phone: null },
      priest: { displayName: 'Pandit A' },
    } as never);
    dispatchOfferMock.findFirst.mockResolvedValue({
      id: 'offer-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);
    dispatchOfferMock.update.mockResolvedValue({});
    dispatchOfferMock.updateMany.mockResolvedValue({ count: 0 });
    dispatchOfferMock.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.update.mockResolvedValue(ASSIGNED_ROW as never);
    armMintGuardsAndLookup();
  });

  it('records COMMISSION_MINTED for the pandit who won the broadcast', async () => {
    await service.accept('booking-1', 'priest-1');

    const events = mintEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.commissionId).toBe('cm-new');
    expect(events[0]!.bookingId).toBe('booking-1');
    expect(String(events[0]!.amount)).toBe('770');
    expect((events[0]!.metadata as Record<string, unknown>).rail).toBe(
      'dispatch-accept-offer',
    );
  });

  it('records the mint AFTER the assignment transaction, never inside it', async () => {
    await service.accept('booking-1', 'priest-1');

    // the commission insert runs inside the tx; the audit write must come after it
    // AND after the transaction resolves. Ordering is the only observable
    // difference between "logged safely" and "logged inside the tx", and the
    // latter can roll back a pandit's assignment when the audit table is bad.
    const mintAt = prismaMock.commission.createMany.mock.invocationCallOrder[0]!;
    const auditAt = recordMoneyEventSpy.mock.invocationCallOrder[0]!;
    expect(mintAt).toBeLessThan(auditAt);
  });

  it('records nothing when the unified rail already owned the booking', async () => {
    // Guard 1 must see an existing row on its FIRST call → the outcome is
    // 'already-on-unified-rail'. `mockReset` rather than `mockClear` because
    // the beforeEach queued a `mockResolvedValueOnce(null)` and a bare
    // `mockClear` leaves that one-shot in place — it would answer null here,
    // the mint would fire, and the test would assert the opposite of its name.
    prismaMock.commission.findFirst.mockReset();
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'cm-existing' } as never);
    prismaMock.commission.create.mockClear();
    prismaMock.commission.createMany.mockClear();
    recordMoneyEventSpy.mockClear();

    await service.accept('booking-1', 'priest-1');

    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
    // An earlier call minted and already logged it. A second row here would
    // double-count one earning in a log whose purpose is to be summable.
    expect(mintEvents()).toHaveLength(0);
  });
});

describe('OPS-05 — PriestService.acceptBooking records the mint it performs', () => {
  let service: PriestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PriestService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      priestId: null,
      scheduledDate,
      scheduledTimeSlot: '09:00',
    } as never);
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);
    prismaMock.pujaBooking.update.mockResolvedValue(ASSIGNED_ROW as never);
    armMintGuardsAndLookup();
  });

  it('records COMMISSION_MINTED for a pandit accepting in his own portal', async () => {
    await service.acceptBooking('priest-1', 'booking-1');

    const events = mintEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.commissionId).toBe('cm-new');
    expect((events[0]!.metadata as Record<string, unknown>).rail).toBe(
      'priest-portal-accept-booking',
    );
  });

  it('records the mint AFTER the assignment transaction', async () => {
    await service.acceptBooking('priest-1', 'booking-1');
    const mintAt = prismaMock.commission.createMany.mock.invocationCallOrder[0]!;
    const auditAt = recordMoneyEventSpy.mock.invocationCallOrder[0]!;
    expect(mintAt).toBeLessThan(auditAt);
  });
});
