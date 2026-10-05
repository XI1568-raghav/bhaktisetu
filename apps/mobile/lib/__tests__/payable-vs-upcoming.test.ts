import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  selectTemplePayouts,
  selectTemplePortalDashboard,
  selectAstrologerEarnings,
  selectPayoutBalance,
} from '../api-contracts';
import { UPCOMING_LABEL, UPCOMING_HINT, upcomingShown } from '../earnings-copy';

/**
 * The API now keeps earnings that are not yet releasable (puja not proved,
 * session not held, consultation not completed) out of the figure a provider
 * can act on, and reports them as upcoming. The app must carry those fields
 * and show Upcoming apart from Payable, never one mixed "Pending" number.
 */

describe('temple payouts: payable vs upcoming', () => {
  const body = {
    payouts: [
      { id: 'p1', bookingId: 'b1', amount: '80.00', status: 'pending', releaseStatus: 'payable' },
      { id: 'p2', bookingId: 'b2', amount: '30.00', status: 'pending', releaseStatus: 'upcoming' },
    ],
    total: 2,
    payableInr: 80,
    upcomingInr: 30,
    pendingInr: 110,
    paidInr: 5,
  };

  it('reads payableInr / upcomingInr / releaseStatus from the server', () => {
    const vm = selectTemplePayouts(body)!;
    expect(vm.payableInr).toBe(80);
    expect(vm.upcomingInr).toBe(30);
    expect(vm.rows.map((r) => r.releaseStatus)).toEqual(['payable', 'upcoming']);
  });

  it('leaves the split null when an older server does not send it', () => {
    const vm = selectTemplePayouts({ payouts: [], total: 0, pendingInr: 0, paidInr: 0 })!;
    expect(vm.payableInr).toBeNull();
    expect(vm.upcomingInr).toBeNull();
  });
});

describe('temple dashboard: released vs upcoming share', () => {
  it('carries releasedInr and upcomingInr, null when absent', () => {
    const vm = selectTemplePortalDashboard({
      profile: { templeName: 'T' },
      stats: { totalBookings: 1, monthBookings: 1, totalRevenueInr: 60, monthRevenueInr: 50, releasedInr: 60, monthReleasedInr: 50, upcomingInr: 40, monthUpcomingInr: 10, totalStreams: 0 },
      recentBookings: [],
    })!;
    expect(vm.stats.releasedInr).toBe(60);
    expect(vm.stats.monthReleasedInr).toBe(50);
    expect(vm.stats.upcomingInr).toBe(40);

    const old = selectTemplePortalDashboard({
      profile: null,
      stats: { totalBookings: 0, monthBookings: 0, totalRevenueInr: 0, monthRevenueInr: 0, totalStreams: 0 },
      recentBookings: [],
    })!;
    expect(old.stats.releasedInr).toBeNull();
    expect(old.stats.upcomingInr).toBeNull();
  });
});

describe('provider balance and astrologer earnings carry upcomingInr', () => {
  it('selectPayoutBalance reads upcomingInr', () => {
    const vm = selectPayoutBalance({ availableInr: 100, upcomingInr: 250, pendingInr: 0, paidOutInr: 0 })!;
    expect(vm.upcomingInr).toBe(250);
    expect(selectPayoutBalance({ availableInr: 100, pendingInr: 0, paidOutInr: 0 })!.upcomingInr).toBeNull();
  });

  it('selectAstrologerEarnings reads summary.upcomingInr and row releaseStatus', () => {
    const vm = selectAstrologerEarnings({
      data: [{ id: 'c1', status: 'PENDING', releaseStatus: 'upcoming', earningsInr: 400 }],
      summary: { totalEarningsInr: 700, pendingInr: 300, upcomingInr: 400, paidInr: 0, astrologerShare: 0.8 },
    })!;
    expect(vm.upcomingInr).toBe(400);
    expect(vm.pendingInr).toBe(300);
    expect(vm.rows[0]!.releaseStatus).toBe('upcoming');
  });
});

describe('copy', () => {
  it('names upcoming honestly and only shows it when there is something upcoming', () => {
    expect(UPCOMING_LABEL).toBe('Upcoming (after the puja/session)');
    expect(UPCOMING_HINT).toMatch(/session is held or the puja is performed and proved/i);
    expect(upcomingShown(null)).toBe(false);
    expect(upcomingShown(0)).toBe(false);
    expect(upcomingShown(1)).toBe(true);
  });
});

describe('screens use the split', () => {
  const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

  it('temple payouts screen shows Payable and Upcoming, not one Pending card', () => {
    const src = read('app/(temple)/payouts.tsx');
    expect(src).toContain('upcomingInr');
    expect(src).toContain('UPCOMING_LABEL');
    expect(src).toContain('payableInr');
  });

  it('temple dashboard shows Released and Upcoming share, not Revenue', () => {
    const src = read('app/(temple)/dashboard.tsx');
    expect(src).toContain('releasedInr');
    expect(src).toContain('UPCOMING_LABEL');
    expect(src).not.toContain('label="Revenue"');
  });

  it('provider payouts and astrologer earnings show upcoming', () => {
    expect(read('lib/provider-payouts.tsx')).toContain('UPCOMING_LABEL');
    expect(read('app/(astrologer)/earnings.tsx')).toContain('UPCOMING_LABEL');
  });
});
