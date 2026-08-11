import { describe, it, expect } from 'vitest';
import { parseSlotMinutes, resolveSlotInstant, hoursUntilSlot } from './slot-time.js';

describe('parseSlotMinutes', () => {
  it('parses 24h times', () => {
    expect(parseSlotMinutes('18:00')).toBe(18 * 60);
    expect(parseSlotMinutes('06:00')).toBe(6 * 60);
    expect(parseSlotMinutes('6:30')).toBe(6 * 60 + 30);
    expect(parseSlotMinutes('00:00')).toBe(0);
    expect(parseSlotMinutes('23:59')).toBe(23 * 60 + 59);
  });

  it('parses labelled 12h slots (legacy availableSlots shape)', () => {
    expect(parseSlotMinutes('Evening (6:00 PM)')).toBe(18 * 60);
    expect(parseSlotMinutes('Morning (6:00 AM)')).toBe(6 * 60);
    expect(parseSlotMinutes('12:00 AM')).toBe(0);
    expect(parseSlotMinutes('12:30 PM')).toBe(12 * 60 + 30);
  });

  it('returns null on unparseable / empty input rather than throwing', () => {
    expect(parseSlotMinutes(null)).toBeNull();
    expect(parseSlotMinutes(undefined)).toBeNull();
    expect(parseSlotMinutes('')).toBeNull();
    expect(parseSlotMinutes('whenever')).toBeNull();
  });
});

describe('resolveSlotInstant — IST slot on a UTC-midnight DATE', () => {
  // scheduledDate is written as new Date('YYYY-MM-DD') => UTC midnight.
  const day = new Date('2026-08-15');

  it('18:00 IST resolves to 12:30 UTC the same day', () => {
    expect(resolveSlotInstant(day, '18:00').toISOString()).toBe('2026-08-15T12:30:00.000Z');
  });

  it('06:00 IST resolves to 00:30 UTC the same day', () => {
    expect(resolveSlotInstant(day, '06:00').toISOString()).toBe('2026-08-15T00:30:00.000Z');
  });

  it('an early-morning IST slot lands on the PREVIOUS UTC day', () => {
    // 04:00 IST = 22:30 UTC on 2026-08-14.
    expect(resolveSlotInstant(day, '04:00').toISOString()).toBe('2026-08-14T22:30:00.000Z');
  });

  it('falls back to the raw date when the slot is unparseable (old behaviour)', () => {
    expect(resolveSlotInstant(day, 'whenever').toISOString()).toBe(day.toISOString());
    expect(resolveSlotInstant(day, null).toISOString()).toBe(day.toISOString());
  });
});

describe('hoursUntilSlot — the RV-11 / RV-13 regression', () => {
  const day = new Date('2026-08-15');

  it('an 18:00 slot is still >24h away at 09:00 IST on D-1 (was wrongly refused)', () => {
    // 2026-08-14 09:00 IST == 2026-08-14T03:30:00Z
    const now = new Date('2026-08-14T03:30:00.000Z');
    const h = hoursUntilSlot(day, '18:00', now);
    // slot = 2026-08-15T12:30Z -> 33h away.
    expect(h).toBeCloseTo(33, 5);
    expect(h).toBeGreaterThan(24); // cancellation MUST be allowed
  });

  it('midnight-only maths (the bug) would have said 20.5h and refused that same cancel', () => {
    const now = new Date('2026-08-14T03:30:00.000Z');
    const buggy = (day.getTime() - now.getTime()) / 3_600_000;
    expect(buggy).toBeCloseTo(20.5, 5);
    expect(buggy).toBeLessThan(24); // <- the wrongful refusal
  });

  it('the lost window equals the slot hour-of-day: 06:00 puja loses ~6h', () => {
    const now = new Date('2026-08-14T00:00:00.000Z');
    const correct = hoursUntilSlot(day, '06:00', now); // slot 00:30Z on the 15th
    const buggy = (day.getTime() - now.getTime()) / 3_600_000; // 24h
    expect(correct - buggy).toBeCloseTo(0.5, 5);
  });

  it('goes negative once the slot has passed', () => {
    expect(hoursUntilSlot(day, '18:00', new Date('2026-08-15T13:00:00.000Z'))).toBeLessThan(0);
  });
});
