import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  balanceSplitCards,
  hasBalanceSplit,
  READY_TO_WITHDRAW_LABEL,
  REQUESTED_LABEL,
  UPCOMING_LABEL,
} from '../lib/payout-balance-labels';

const web = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('payout balance split labels', () => {
  it('uses the three agreed labels', () => {
    expect(READY_TO_WITHDRAW_LABEL).toBe('Ready to withdraw');
    expect(UPCOMING_LABEL).toBe('Upcoming (after the puja/session)');
    expect(REQUESTED_LABEL).toBe('Requested, awaiting payout');
  });

  it('maps availableInr / upcomingInr / pendingInr to ready / upcoming / requested', () => {
    expect(balanceSplitCards({ availableInr: 800, upcomingInr: 240, pendingInr: 500 })).toEqual([
      { label: 'Ready to withdraw', amount: 800 },
      { label: 'Upcoming (after the puja/session)', amount: 240 },
      { label: 'Requested, awaiting payout', amount: 500 },
    ]);
  });

  it('treats a missing upcomingInr as 0 but a missing available/pending as "no split"', () => {
    expect(balanceSplitCards({ availableInr: 1, pendingInr: 2 })[1]?.amount).toBe(0);
    expect(hasBalanceSplit({ availableInr: 1 })).toBe(false);
    expect(hasBalanceSplit(null)).toBe(false);
    expect(balanceSplitCards({})).toEqual([]);
  });
});

describe('screens that showed one mixed "Pending" number', () => {
  it('/priest/payouts reads /payouts/balance and keeps the old label only as a fallback', () => {
    const src = web('app/priest/payouts/page.tsx');
    expect(src).toContain('/payouts/balance');
    expect(src).toContain('balanceSplitCards');
    expect(src).toMatch(/:\s*\[\s*\{\s*label: 'Pending Payout'/);
  });

  it('/priest dashboard shows Ready to withdraw when the split is present', () => {
    const src = web('app/priest/page.tsx');
    expect(src).toContain('/payouts/balance');
    expect(src).toMatch(/hasBalanceSplit\(balance\) \? READY_TO_WITHDRAW_LABEL : undefined/);
  });

  it('/wellness-portal shows Ready to withdraw, Requested and Upcoming from the dashboard split', () => {
    const src = web('app/wellness-portal/page.tsx');
    expect(src).toMatch(/typeof liveStats\?\.readyInr === 'number'\s*\?\s*READY_TO_WITHDRAW_LABEL/);
    expect(src).toContain('REQUESTED_LABEL');
    expect(src).toContain('UPCOMING_LABEL');
  });
});
