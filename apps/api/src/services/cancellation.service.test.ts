import { describe, it, expect } from 'vitest';
import {
  CancellationService,
  DEFAULT_CANCEL_POLICY,
  type CancelPolicy,
} from './cancellation.service.js';

// Pure-function tests for the refund ladder — the part of the cancellation
// engine that must be exactly right (money math). DB-touching methods
// (snapshotPolicy / panditCancel) are covered by integration tests elsewhere;
// here we lock the tier boundaries and the pandit-fault / no-show paths.

const svc = new CancellationService();
const policy: CancelPolicy = DEFAULT_CANCEL_POLICY;
const SLOT = new Date('2026-09-01T10:00:00Z');

function hoursBefore(h: number): Date {
  return new Date(SLOT.getTime() - h * 60 * 60 * 1000);
}

describe('cancellation.service — devotee refund ladder', () => {
  it('>48h before → 100% refund', () => {
    const q = svc.computeDevoteeRefund({
      policy,
      scheduledDate: SLOT,
      pujaPriceInr: 5100,
      totalPaidInr: 5100,
      now: hoursBefore(72),
    });
    expect(q.refundFraction).toBe(1.0);
    expect(q.refundAmountInr).toBe(5100);
    expect(q.isPanditFault).toBe(false);
  });

  it('exactly 48h → full refund (boundary inclusive)', () => {
    const q = svc.computeDevoteeRefund({
      policy,
      scheduledDate: SLOT,
      pujaPriceInr: 5100,
      totalPaidInr: 5100,
      now: hoursBefore(48),
    });
    expect(q.refundFraction).toBe(1.0);
  });

  it('24–48h → 75% refund', () => {
    const q = svc.computeDevoteeRefund({
      policy,
      scheduledDate: SLOT,
      pujaPriceInr: 10000,
      totalPaidInr: 10000,
      now: hoursBefore(30),
    });
    expect(q.refundFraction).toBe(0.75);
    expect(q.refundAmountInr).toBe(7500);
    expect(q.feeAmountInr).toBe(2500);
  });

  it('4–24h → 50% refund', () => {
    const q = svc.computeDevoteeRefund({
      policy,
      scheduledDate: SLOT,
      pujaPriceInr: 8000,
      totalPaidInr: 8000,
      now: hoursBefore(10),
    });
    expect(q.refundFraction).toBe(0.5);
    expect(q.refundAmountInr).toBe(4000);
  });

  it('<4h → 25% refund (beats SmartPuja 0% inside 48h)', () => {
    const q = svc.computeDevoteeRefund({
      policy,
      scheduledDate: SLOT,
      pujaPriceInr: 4000,
      totalPaidInr: 4000,
      now: hoursBefore(2),
    });
    expect(q.refundFraction).toBe(0.25);
    expect(q.refundAmountInr).toBe(1000);
  });

  it('rounds to 2 decimals for odd amounts', () => {
    const q = svc.computeDevoteeRefund({
      policy,
      scheduledDate: SLOT,
      pujaPriceInr: 3333.33,
      totalPaidInr: 3333.33,
      now: hoursBefore(30),
    });
    expect(q.refundAmountInr).toBeCloseTo(2499.9975, 2);
  });
});

describe('cancellation.service — pandit-fault & no-show', () => {
  it('pandit cancel → full refund of everything paid (platform bears it)', () => {
    const q = svc.computePanditFaultRefund({ policy, totalPaidInr: 5451 });
    expect(q.refundFraction).toBe(1.0);
    expect(q.refundAmountInr).toBe(5451);
    expect(q.isPanditFault).toBe(true);
  });

  it('devotee no-show → 0 refund by default policy', () => {
    const q = svc.computeNoShowRefund({ policy, totalPaidInr: 5100 });
    expect(q.refundFraction).toBe(0);
    expect(q.refundAmountInr).toBe(0);
    expect(q.isPanditFault).toBe(false);
  });

  it('custom policy snapshot overrides the default ladder', () => {
    const strict: CancelPolicy = {
      ...policy,
      tiers: [{ minHoursBefore: 0, refundFraction: 0.9, label: 'always 90%' }],
    };
    const q = svc.computeDevoteeRefund({
      policy: strict,
      scheduledDate: SLOT,
      pujaPriceInr: 1000,
      totalPaidInr: 1000,
      now: hoursBefore(1),
    });
    expect(q.refundFraction).toBe(0.9);
    expect(q.refundAmountInr).toBe(900);
  });
});

// ── RV-13 regression lock: the tier must be measured against the real slot
// instant, not the DATE column's midnight. `scheduledDate` is a DATE (midnight)
// and the time of day lives in `scheduledTimeSlot` (IST). Measuring from
// midnight quoted devotees a tier lower than policy, and for a same-day slot
// produced a NEGATIVE hoursUntilSlot that fell through every tier to the floor.
describe('cancellation.service — slot-aware tiering (RV-13)', () => {
  const DAY = new Date('2026-09-01'); // UTC midnight, the stored DATE
  const PRICE = 1100;

  it('an 18:00 IST slot is 33h out at 09:00 IST on D-1 → 75% tier, not 50%', () => {
    // 2026-08-31 09:00 IST == 2026-08-31T03:30:00Z
    const now = new Date('2026-08-31T03:30:00.000Z');
    const withSlot = svc.computeDevoteeRefund({
      policy,
      scheduledDate: DAY,
      scheduledTimeSlot: '18:00',
      pujaPriceInr: PRICE,
      totalPaidInr: PRICE,
      now,
    });
    expect(withSlot.hoursUntilSlot).toBeCloseTo(33, 1);
    expect(withSlot.refundFraction).toBe(0.75);
    expect(withSlot.refundAmountInr).toBe(825);

    // Without the slot (the bug) the same moment reads 20.5h → 50% tier.
    const midnightOnly = svc.computeDevoteeRefund({
      policy,
      scheduledDate: DAY,
      pujaPriceInr: PRICE,
      totalPaidInr: PRICE,
      now,
    });
    expect(midnightOnly.hoursUntilSlot).toBeCloseTo(20.5, 1);
    expect(midnightOnly.refundFraction).toBe(0.5);
    // The devotee was quoted Rs 275 less than policy entitles them to.
    expect(withSlot.refundAmountInr - midnightOnly.refundAmountInr).toBe(275);
  });

  it('same-day morning quote no longer goes negative and floors out', () => {
    // 2026-09-01 07:00 IST == 2026-09-01T01:30:00Z; slot 18:00 IST is 11h away.
    const now = new Date('2026-09-01T01:30:00.000Z');
    const q = svc.computeDevoteeRefund({
      policy,
      scheduledDate: DAY,
      scheduledTimeSlot: '18:00',
      pujaPriceInr: PRICE,
      totalPaidInr: PRICE,
      now,
    });
    expect(q.hoursUntilSlot).toBeGreaterThan(0);
    expect(q.refundFraction).toBe(0.5); // 4–24h tier
  });

  it('omitting the slot preserves the old behaviour (back-compat)', () => {
    const now = new Date('2026-08-30T00:00:00.000Z');
    const a = svc.computeDevoteeRefund({
      policy, scheduledDate: DAY, pujaPriceInr: PRICE, totalPaidInr: PRICE, now,
    });
    const b = svc.computeDevoteeRefund({
      policy, scheduledDate: DAY, scheduledTimeSlot: null, pujaPriceInr: PRICE, totalPaidInr: PRICE, now,
    });
    expect(a.hoursUntilSlot).toBe(b.hoursUntilSlot);
  });
});
