import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { __testing } from './demo-pay.js';
import { DEFAULT_PRIEST_SHARE } from '../services/booking.service.js';

const { resolveDemoSplit } = __testing;

// ── RV-21 regression lock ────────────────────────────────────────────────────
//
// demo-pay hardcoded `.mul('0.30')` / `.mul('0.70')`, which stopped matching the
// product the day the take-rate became a uniform 20% platform / 80% provider.
// A ₹1,100 demo booking showed the pandit ₹770 instead of ₹880. The split now
// reads the same source of truth booking.service.createBooking uses — the
// assigned pandit's commissionRate, else DEFAULT_PRIEST_SHARE — so the number
// can never drift from the real path again.

describe('demo-pay resolveDemoSplit — RV-21', () => {
  it('is the uniform 20/80, not the stale 30/70, when the pandit has no sane rate', () => {
    // Priest.commissionRate defaults to 0.70 in the schema, so a demo pandit
    // seeded before the take-rate change is the realistic case; 0 stands for
    // "unset", which must fall back to the platform default.
    const { priestShare, priestPayout, platformCommission } = resolveDemoSplit('1100', 0);
    expect(priestShare).toBe(DEFAULT_PRIEST_SHARE);
    expect(priestPayout.toString()).toBe('880');
    expect(platformCommission.toString()).toBe('220');
    // The dead 30/70 numbers must not come back.
    expect(priestPayout.toString()).not.toBe('770');
    expect(platformCommission.toString()).not.toBe('330');
  });

  it('honours a per-pandit negotiated rate exactly as booking.service does', () => {
    const { priestShare, priestPayout, platformCommission } = resolveDemoSplit('1100', 0.7);
    expect(priestShare).toBe(0.7);
    expect(priestPayout.toString()).toBe('770');
    expect(platformCommission.toString()).toBe('330');
  });

  it('falls back to the default for an out-of-range rate rather than paying nonsense', () => {
    for (const bad of [-0.5, 0, 1.5, 42]) {
      expect(resolveDemoSplit('1100', bad).priestShare).toBe(DEFAULT_PRIEST_SHARE);
    }
    // 1.0 is a legitimate 100%-to-provider arrangement, not out of range.
    expect(resolveDemoSplit('1100', 1).priestShare).toBe(1);
    expect(resolveDemoSplit('1100', 1).platformCommission.toString()).toBe('0');
  });

  it('keeps the two halves summing back to the price exactly (no float residue)', () => {
    // 1 - 0.8 is 0.19999999999999996 in JS float; deriving the platform half by
    // subtraction is what keeps this exact.
    for (const price of ['1100', '3499.99', '2099.01', '0.01', '8499.50']) {
      const { priestPayout, platformCommission } = resolveDemoSplit(price, 0);
      expect(priestPayout.add(platformCommission).toString()).toBe(
        new Prisma.Decimal(price).toString(),
      );
    }
  });

  it('rounds the payout to paisa — a Decimal(10,2) column cannot hold more', () => {
    const { priestPayout } = resolveDemoSplit('2099.01', 0);
    expect(priestPayout.decimalPlaces()).toBeLessThanOrEqual(2);
    // 2099.01 * 0.8 = 1679.208 → 1679.21 half-up.
    expect(priestPayout.toString()).toBe('1679.21');
  });

  it('accepts a Prisma.Decimal price without going through a JS number', () => {
    const { priestPayout } = resolveDemoSplit(new Prisma.Decimal('1100.00'), 0);
    expect(priestPayout.toString()).toBe('880');
  });
});
