import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 — the commission unwind had no durable record on three of its four
 * rails.
 *
 * `ledger-reversal.service.ts` is the ONE implementation of the unwind, and
 * four call sites drive it:
 *
 *   services/refund.service.ts:434 / :442     auto-refund cron
 *   services/payment.service.ts:2112 / :2140  admin refund rail
 *   services/payment.service.ts:1839 / :1841  Razorpay `refund.*` webhook
 *   routes/consultation.ts:817                astrology consultation cancel
 *
 * Only refund.service.ts:484 records `COMMISSION_REVERSED`. The other three
 * hand money back to the devotee, unwind the pandit's and the temple's
 * earnings, and leave nothing to reconstruct it from. `recordLedgerReversal`
 * is the shared emitter that removes the reason for a fourth hand-copy.
 *
 * WHAT THESE TESTS ARE FOR. Not "the function exists" — every case below
 * pins a behaviour that a plausible wrong implementation gets wrong:
 *
 *   - a no-op unwind must write NOTHING (an evidence log that records a
 *     zero-row reversal reads later as proof the unwind ran);
 *   - an unwind that reclaimed nothing because the money had already been
 *     paid out must STILL be recorded — that is the double-pay case, the most
 *     disputable outcome the module produces, and the naive `if (rows) log`
 *     is exactly what silences it;
 *   - a reversal whose transaction ROLLED BACK must not be recorded, which is
 *     the whole reason this runs post-commit against the module-level client;
 *   - it must never throw, on any path, including when the probe itself dies.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  // Typed with its argument so `mock.calls[0][0]` is the recorded event rather
  // than an empty tuple — the assertions below read that argument.
  recordMoneyEventSpy: vi.fn((_input: unknown) =>
    Promise.resolve({ ok: true, wrote: true, id: 'evt-1' }),
  ),
}));

// MONEY_EVENTS stays REAL. Asserting against the literal 'commission.reversed'
// would let a renamed constant pass a test that no longer describes the
// shipped event.
vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

const { recordLedgerReversal } = await import('./ledger-reversal.service.js');
const { MONEY_EVENTS } = await import('../lib/audit-money.js');

/** `reverseBookingLedger`'s return shape. */
const fullResult = (o: Partial<{
  reversedCommissions: number;
  reversedTemplePayouts: number;
  alreadySettled: number;
}> = {}) => ({
  reversedCommissions: o.reversedCommissions ?? 1,
  reversedTemplePayouts: o.reversedTemplePayouts ?? 1,
  alreadySettled: o.alreadySettled ?? 0,
});

/** `reduceBookingLedgerForPartialRefund`'s return shape. */
const partialResult = (o: Partial<{
  scaledCommissions: number;
  scaledTemplePayouts: number;
  scaledPriestPayouts: number;
  scaledBookingSplit: boolean;
  clawedBackInr: string;
  alreadySettled: number;
}> = {}) => ({
  scaledCommissions: o.scaledCommissions ?? 1,
  scaledTemplePayouts: o.scaledTemplePayouts ?? 0,
  scaledPriestPayouts: o.scaledPriestPayouts ?? 0,
  scaledBookingSplit: o.scaledBookingSplit ?? true,
  clawedBackInr: o.clawedBackInr ?? '577.50',
  alreadySettled: o.alreadySettled ?? 0,
});

/** The only event argument this module ever produces. */
const soleEvent = () => {
  expect(recordMoneyEventSpy).toHaveBeenCalledTimes(1);
  return recordMoneyEventSpy.mock.calls[0]![0] as Record<string, unknown>;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: the reversal committed. Individual cases override.
  prismaMock.commission.count.mockResolvedValue(1 as never);
});

describe('recordLedgerReversal — the full unwind', () => {
  it('records COMMISSION_REVERSED against the booking with the row counts it moved', async () => {
    await recordLedgerReversal({
      bookingId: 'bk-1',
      rail: 'admin',
      reason: 'Devotee cancelled 50h before slot',
      actorType: 'admin',
      actorId: 'admin-9',
      paymentId: 'pay-1',
      amount: '1151.00',
      currency: 'INR',
      gatewayRefundId: 'rfnd_A1',
      idempotencyKey: 'rfnd_A1',
      full: fullResult({ reversedCommissions: 1, reversedTemplePayouts: 1 }),
    });

    const ev = soleEvent();
    expect(ev.eventType).toBe(MONEY_EVENTS.COMMISSION_REVERSED);
    expect(ev.subjectType).toBe('booking');
    expect(ev.subjectId).toBe('bk-1');
    expect(ev.bookingId).toBe('bk-1');
    expect(ev.paymentId).toBe('pay-1');
    expect(ev.actorType).toBe('admin');
    expect(ev.actorId).toBe('admin-9');
    expect(ev.statusAfter).toBe('reversed');
    expect(ev.amount).toBe('1151.00');
    expect(ev.gatewayRefundId).toBe('rfnd_A1');
    expect(ev.metadata).toMatchObject({
      rail: 'admin',
      fullyRefunded: true,
      reversedCommissions: 1,
      reversedTemplePayouts: 1,
      alreadySettled: 0,
    });
  });

  it('passes the refund id through BARE — the writer namespaces it by event type', async () => {
    // Pre-prefixing here would produce a key the writer prefixes a second time,
    // which silently breaks dedupe against the REFUND_COMPLETED row that
    // legitimately shares this same natural key.
    await recordLedgerReversal({
      bookingId: 'bk-1',
      rail: 'auto-refund',
      reason: 'r',
      idempotencyKey: 'rfnd_A1',
      full: fullResult(),
    });
    expect(soleEvent().idempotencyKey).toBe('rfnd_A1');
  });

  it('defaults the actor to system when no human authorised it', async () => {
    await recordLedgerReversal({
      bookingId: 'bk-1',
      rail: 'razorpay-webhook',
      reason: 'r',
      full: fullResult(),
    });
    expect(soleEvent().actorType).toBe('system');
  });
});

describe('recordLedgerReversal — the partial unwind', () => {
  it('records it as "reduced", not "reversed"', async () => {
    // A partial scales the earning down; it does not reverse it. Collapsing the
    // two makes the trail unable to answer "was this booking refunded in full".
    await recordLedgerReversal({
      bookingId: 'bk-2',
      rail: 'admin',
      reason: '75% tier',
      partial: partialResult(),
    });
    expect(soleEvent().statusAfter).toBe('reduced');
  });

  it('defaults the amount to the money removed from provider earnings, not the refund', async () => {
    // On a 75%-tier cancellation of a Rs 1,100 puja the devotee gets Rs 825 back
    // while Rs 577.50 comes off the pandit's earning. This event is about the
    // provider ledger, so 577.50 is the figure that belongs on it.
    await recordLedgerReversal({
      bookingId: 'bk-2',
      rail: 'admin',
      reason: '75% tier',
      partial: partialResult({ clawedBackInr: '577.50' }),
    });
    const ev = soleEvent();
    expect(ev.amount).toBe('577.50');
    expect(ev.metadata).toMatchObject({
      fullyRefunded: false,
      scaledCommissions: 1,
      clawedBackInr: '577.50',
    });
  });

  it('does not run the durability probe on the partial path', async () => {
    // A scaled row is indistinguishable from an unscaled one without the
    // pre-image, so there is nothing to probe — and probing anyway would cost a
    // query on every partial refund and prove nothing.
    await recordLedgerReversal({
      bookingId: 'bk-2',
      rail: 'admin',
      reason: 'r',
      partial: partialResult(),
    });
    expect(prismaMock.commission.count).not.toHaveBeenCalled();
    expect(recordMoneyEventSpy).toHaveBeenCalledTimes(1);
  });
});

describe('recordLedgerReversal — what must NOT be written', () => {
  it('writes nothing when the unwind moved no rows and blocked none', async () => {
    await recordLedgerReversal({
      bookingId: 'bk-3',
      rail: 'admin',
      reason: 'r',
      full: fullResult({ reversedCommissions: 0, reversedTemplePayouts: 0, alreadySettled: 0 }),
    });
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });

  it('writes nothing when neither a full nor a partial result is supplied', async () => {
    await recordLedgerReversal({ bookingId: 'bk-3', rail: 'admin', reason: 'r' });
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });

  it('writes nothing without a bookingId', async () => {
    await recordLedgerReversal({ bookingId: '', rail: 'admin', reason: 'r', full: fullResult() });
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });

  it('does NOT record a full reversal whose transaction rolled back', async () => {
    // The reversal reported one commission flipped, but nothing is COMMITTED —
    // so the caller's transaction aborted after it ran. Recording here would put
    // a reversal in the trail that never happened. This is the case the whole
    // post-commit design exists for; an implementation that trusts the returned
    // count alone passes every other test in this file and fails this one.
    prismaMock.commission.count.mockResolvedValue(0 as never);

    await recordLedgerReversal({
      bookingId: 'bk-4',
      rail: 'admin',
      reason: 'r',
      full: fullResult({ reversedCommissions: 1, reversedTemplePayouts: 0 }),
    });

    expect(prismaMock.commission.count).toHaveBeenCalledWith({
      where: { bookingId: 'bk-4', status: 'REVERSED' },
    });
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });
});

describe('recordLedgerReversal — the case that must never be silent', () => {
  it('records the unwind even when it reclaimed NOTHING because the money had left', async () => {
    // reversedCommissions 0 + alreadySettled 2: the devotee was refunded and the
    // provider keeps the earning — the double-pay that cost ~172% of booking
    // value on BS-20260812-J3M76. A guard of `if (rowsMoved) log` drops exactly
    // this row and leaves the worst outcome as the only unlogged one.
    await recordLedgerReversal({
      bookingId: 'bk-5',
      rail: 'admin',
      reason: 'Full refund after payout raised',
      full: fullResult({ reversedCommissions: 0, reversedTemplePayouts: 0, alreadySettled: 2 }),
    });

    const ev = soleEvent();
    expect(ev.statusAfter).toBe('blocked');
    expect(ev.metadata).toMatchObject({ alreadySettled: 2, reversedCommissions: 0 });
  });

  it('records the blocked case on the partial path too', async () => {
    await recordLedgerReversal({
      bookingId: 'bk-5',
      rail: 'razorpay-webhook',
      reason: 'r',
      partial: partialResult({
        scaledCommissions: 0,
        scaledTemplePayouts: 0,
        scaledPriestPayouts: 0,
        scaledBookingSplit: false,
        clawedBackInr: '0.00',
        alreadySettled: 1,
      }),
    });
    expect(soleEvent().statusAfter).toBe('blocked');
  });

  it('does not probe durability for a blocked full unwind — there is nothing to prove', async () => {
    await recordLedgerReversal({
      bookingId: 'bk-5',
      rail: 'admin',
      reason: 'r',
      full: fullResult({ reversedCommissions: 0, reversedTemplePayouts: 0, alreadySettled: 3 }),
    });
    expect(prismaMock.commission.count).not.toHaveBeenCalled();
    expect(recordMoneyEventSpy).toHaveBeenCalledTimes(1);
  });
});

describe('recordLedgerReversal — never throws', () => {
  it('resolves when the audit writer rejects', async () => {
    // The gateway has already moved the money. Logging must never be able to
    // fail a refund, so every path here resolves.
    recordMoneyEventSpy.mockRejectedValueOnce(new Error('money_audit_events is gone') as never);
    await expect(
      recordLedgerReversal({ bookingId: 'bk-6', rail: 'admin', reason: 'r', full: fullResult() }),
    ).resolves.toBeUndefined();
  });

  it('resolves — and writes nothing — when the durability probe itself dies', async () => {
    prismaMock.commission.count.mockRejectedValue(new Error('connection terminated') as never);
    await expect(
      recordLedgerReversal({ bookingId: 'bk-6', rail: 'admin', reason: 'r', full: fullResult() }),
    ).resolves.toBeUndefined();
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });
});
