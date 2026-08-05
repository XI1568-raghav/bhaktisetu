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
