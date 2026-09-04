import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (coverage half) — the legacy payout rail had no audit trail at all.
 *
 * The money-event log landed with 13 call sites across payment/payout/refund,
 * and they cover the unified rail well: a Commission that is REVERSED is
 * recorded (`refund.service.ts`, COMMISSION_REVERSED). But `MONEY_EVENTS`
 * declared four names that no call site in the repository ever passed —
 * `PRIEST_PAYOUT_CREATED`, `COMMISSION_MINTED`, `BOOKING_CREATED` and
 * `DONATION_RECEIVED` — verified by grepping the whole of `apps/api/src` for
 * each constant and getting nothing outside `lib/audit-money.ts` itself.
 *
 * `PRIEST_PAYOUT_CREATED` is the one that matters most, for a reason specific
 * to this codebase: `PriestPayout` is rail B, the LEGACY pandit-only rail, and
 * `createPriestPayout` is the single writer for it. The two rails are
 * deliberately mutually exclusive, and which rail a booking landed on is
 * decided at this exact call by a guard reading `commission.findFirst`. So the
 * one question a "why was this pandit paid twice / not at all" dispute turns
 * on — *which rail took this booking, and did the exclusion guard fire* — was
 * the one thing the trail could not answer, because rail B wrote nothing.
 *
 * Both outcomes are asserted here. Logging the skip is not decoration: a
 * skipped payout is the guard WORKING, and an operator staring at a pandit
 * with no PriestPayout row needs to see "rail A owns this booking" rather than
 * silence, which is indistinguishable from the call never having been made.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

// Keep MONEY_EVENTS real — asserting against the literal string would let a
// renamed constant pass a test that no longer describes the shipped event.
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

/** A booking that satisfies every guard in createPriestPayout. */
function arrangePayableBooking() {
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: 'bk-1',
    status: 'video_uploaded',
    priestId: 'priest-1',
    priestPayout: new Prisma.Decimal('4000.00'),
    currency: 'INR',
    bookingNumber: 'BS-20260828-ABCDE',
  } as never);
  prismaMock.priest.findUnique.mockResolvedValue({
    aadhaarVerified: true,
    displayName: 'Pandit Sharma',
  } as never);
  prismaMock.priestPayout.findFirst.mockResolvedValue(null as never);
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
  prismaMock.priestPayout.create.mockResolvedValue({
    id: 'po-1',
    priestId: 'priest-1',
    bookingId: 'bk-1',
    amount: new Prisma.Decimal('4000.00'),
    status: 'pending',
    priest: { id: 'priest-1', displayName: 'Pandit Sharma' },
    booking: { bookingNumber: 'BS-20260828-ABCDE' },
  } as never);
}

/** All money events recorded during the call, in order. */
function recordedEvents(): Array<Record<string, unknown>> {
  return recordMoneyEventSpy.mock.calls.map(
    (c) => (c as unknown as [Record<string, unknown>])[0],
  );
}

describe('OPS-05 — the legacy PriestPayout rail is on the money trail', () => {
  it('records PRIEST_PAYOUT_CREATED when the legacy rail mints a payout', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangePayableBooking();

    const payout = await service.createPriestPayout('bk-1');
    expect((payout as { id: string }).id).toBe('po-1');

    const created = recordedEvents().filter(
      (e) => e.eventType === MONEY_EVENTS.PRIEST_PAYOUT_CREATED,
    );
    expect(created).toHaveLength(1);

    const event = created[0]!;
    expect(event.subjectType).toBe('payout');
    expect(event.subjectId).toBe('po-1');
    expect(event.payoutId).toBe('po-1');
    expect(event.bookingId).toBe('bk-1');
    expect(event.statusAfter).toBe('pending');
    // RUPEES, never paise — the column is DECIMAL(10,2) and a paise figure
    // both overflows it and makes the trail fail to sum.
    expect(String(event.amount)).toBe('4000');
    // The bare natural key. recordMoneyEvent namespaces by eventType itself;
    // pre-prefixing here would double it.
    expect(event.idempotencyKey).toBe('po-1');
  });

  it('records the SKIP when the unified rail already owns the booking', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangePayableBooking();
    // Rail A holds a live Commission — the mutual-exclusion guard must fire.
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'cm-9' } as never);

    const result = await service.createPriestPayout('bk-1');
    expect(result).toMatchObject({ skipped: true, commissionId: 'cm-9' });
    expect(prismaMock.priestPayout.create).not.toHaveBeenCalled();

    const events = recordedEvents();
    // No payout was written, so no payout may be claimed in the trail.
    expect(
      events.filter((e) => e.eventType === MONEY_EVENTS.PRIEST_PAYOUT_CREATED),
    ).toHaveLength(0);

    const skips = events.filter((e) => e.eventType === MONEY_EVENTS.PAYOUT_REJECTED);
    expect(skips).toHaveLength(1);
    expect(skips[0]!.commissionId).toBe('cm-9');
    expect(skips[0]!.bookingId).toBe('bk-1');
    expect(String(skips[0]!.note ?? '')).toMatch(/unified rail/i);
  });

  it('records nothing when a guard throws before any row is written', async () => {
    const service = await loadService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      id: 'bk-2',
      status: 'confirmed', // not video_uploaded/delivered
      priestId: 'priest-1',
      priestPayout: new Prisma.Decimal('4000.00'),
      currency: 'INR',
      bookingNumber: 'BS-20260828-ZZZZZ',
    } as never);

    await expect(service.createPriestPayout('bk-2')).rejects.toThrow(/video_uploaded/);
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });

  it('a failing audit write can never fail the payout', async () => {
    const service = await loadService();
    arrangePayableBooking();
    // recordMoneyEvent is contractually non-throwing, but a call site that
    // `await`ed a rejecting stub would still take the money path down with it.
    recordMoneyEventSpy.mockRejectedValueOnce(new Error('audit table missing'));

    const payout = await service.createPriestPayout('bk-1');
    expect((payout as { id: string }).id).toBe('po-1');
  });
});
