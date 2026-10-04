import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * DI-09 (F455), part 1 — the duplicate-key path on `createPriestPayout` is an
 * unhandled 500 in production TODAY, with no new constraint required.
 *
 * `priest_payouts_booking_id_key` was created by
 * `migrations/20260902000000_di06_priest_payout_booking_key` and is LIVE in
 * production (verified 2026-09-08 in the 20260908000000 migration's own
 * measurement block). The guard it backs is at payment.service.ts:2348:
 *
 *     const existingPayout = await prisma.priestPayout.findFirst({ where: { bookingId } });
 *     if (existingPayout) throw new Error('A payout already exists for this booking (status: …).');
 *
 * That check and the `prisma.priestPayout.create` at :2438 are two separate
 * statements on the module-level client, with no transaction and no lock, and
 * between them sit three further awaits. So the check is a TOCTOU, and the
 * constraint is what actually stops the double-write — which is correct, and
 * is exactly why the LOSER's experience matters.
 *
 * Before this fix the loser got a raw `PrismaClientKnownRequestError` with code
 * P2002 straight out of the service. Nothing between here and the HTTP layer
 * translates it, so the caller sees a 500 for a condition the code already has
 * a considered, human-readable answer for three lines earlier. The two callers
 * that matter are unattended:
 *
 *   services/booking.service.ts:1008 and :1746 call `.createPriestPayout(...)`
 *   on a status transition — a 500 there is a failed booking transition, not a
 *   failed payout.
 *
 * The fix is not "swallow P2002". It is to make the racing caller reach the
 * SAME domain outcome the guard reaches, because they are the same fact: a
 * payout already exists for this booking. Anything else — a different message,
 * a silent success, a fabricated payout row — would make the two orderings of
 * one race observably different.
 *
 * NON-VACUITY. Against pre-fix HEAD the first two tests fail with
 * `PrismaClientKnownRequestError: duplicate key value violates unique
 * constraint "priest_payouts_booking_id_key"` where a message matching
 * /payout already exists/ was expected — i.e. the raw gateway-level error
 * escaping the service, which is the bug. The third and fourth passed already
 * and are here to pin the surrounding behaviour the fix must not disturb.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

vi.mock('razorpay', () => ({
  default: class MockRazorpay {
    payments = { refund: vi.fn(), fetch: vi.fn() };
    orders = { create: vi.fn() };
  },
}));

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

/**
 * A booking that clears every guard in createPriestPayout, so the only thing
 * standing between the call and a written row is the INSERT itself.
 */
function arrangePayableBooking() {
  // `vi.clearAllMocks()` clears CALLS but not queued `mockResolvedValueOnce`
  // values or implementations, and this suite deliberately leaves a once-value
  // unconsumed on the pre-fix code path. Reset the two mocks whose call counts
  // differ between the fixed and unfixed service, or test N leaks into N+1 and
  // the failures stop describing the code.
  prismaMock.priestPayout.findFirst.mockReset();
  prismaMock.priestPayout.create.mockReset();

  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: 'bk-1',
    status: 'video_uploaded',
    priestId: 'priest-1',
    priestPayout: new Prisma.Decimal('4000.00'),
    currency: 'INR',
    bookingNumber: 'BS-20260908-ABCDE',
  } as never);
  prismaMock.priest.findUnique.mockResolvedValue({
    aadhaarVerified: true,
    displayName: 'Pandit Sharma',
  } as never);
  // The guard read sees nothing — this is the racing caller, not the guarded one.
  prismaMock.priestPayout.findFirst.mockResolvedValue(null as never);
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
}

/**
 * The losing caller: its guard read finds nothing, its INSERT loses to the
 * index, and its re-read finds the winner's row.
 */
function arrangeDuplicateRace(winnerStatus: string) {
  arrangePayableBooking();
  prismaMock.priestPayout.create.mockRejectedValue(duplicateBookingKey() as never);
  prismaMock.priestPayout.findFirst
    .mockResolvedValueOnce(null as never) // the guard, before the INSERT
    .mockResolvedValueOnce({ id: 'po-winner', status: winnerStatus } as never); // after P2002
}

/** Exactly what Postgres 23505 surfaces as through Prisma. */
function duplicateBookingKey(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`bookingId`)',
    {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['booking_id'], modelName: 'PriestPayout' },
    },
  );
}

describe('DI-09 — a duplicate priest payout is a domain outcome, not a 500', () => {
  it('translates P2002 into the same error the findFirst guard raises', async () => {
    const service = await loadService();
    arrangeDuplicateRace('pending');

    // The SAME sentence the guard at :2348 throws. Not a Prisma error, not a
    // generic one — a caller cannot tell the two orderings of the race apart.
    await expect(service.createPriestPayout('bk-1')).rejects.toThrow(
      /payout already exists for this booking/i,
    );
  });

  it('reports the winner’s status, so the two orderings of the race read identically', async () => {
    const service = await loadService();
    arrangeDuplicateRace('processing');

    await expect(service.createPriestPayout('bk-1')).rejects.toThrow(/processing/);
  });

  it('writes no PRIEST_PAYOUT_CREATED for a payout this call did not create', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangeDuplicateRace('pending');

    await expect(service.createPriestPayout('bk-1')).rejects.toThrow();

    // The row belongs to the other caller, which logged it. A second
    // PRIEST_PAYOUT_CREATED would put one payout on the trail twice.
    const created = recordMoneyEventSpy.mock.calls
      .map((c) => (c as unknown as [Record<string, unknown>])[0])
      .filter((e) => e.eventType === MONEY_EVENTS.PRIEST_PAYOUT_CREATED);
    expect(created).toEqual([]);
  });

  it('lets a NON-duplicate write failure propagate untouched', async () => {
    const service = await loadService();
    arrangePayableBooking();
    // P2003 = foreign key violation. Not a duplicate, and translating it into
    // "a payout already exists" would report a false reason for a real fault
    // on a money path.
    prismaMock.priestPayout.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK violation', {
        code: 'P2003',
        clientVersion: 'test',
      }) as never,
    );

    await expect(service.createPriestPayout('bk-1')).rejects.toThrow(/FK violation/);
  });

  it('still writes and logs normally when there is no duplicate', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangePayableBooking();
    prismaMock.priestPayout.create.mockResolvedValue({
      id: 'po-1',
      priestId: 'priest-1',
      bookingId: 'bk-1',
      amount: new Prisma.Decimal('4000.00'),
      status: 'pending',
      priest: { id: 'priest-1', displayName: 'Pandit Sharma' },
      booking: { bookingNumber: 'BS-20260908-ABCDE' },
    } as never);

    const payout = await service.createPriestPayout('bk-1');
    expect((payout as { id: string }).id).toBe('po-1');

    const created = recordMoneyEventSpy.mock.calls
      .map((c) => (c as unknown as [Record<string, unknown>])[0])
      .filter((e) => e.eventType === MONEY_EVENTS.PRIEST_PAYOUT_CREATED);
    expect(created).toHaveLength(1);
    expect(created[0]!.payoutId).toBe('po-1');
  });
});
