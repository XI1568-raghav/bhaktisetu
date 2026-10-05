import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { READY_LABEL, REQUESTED_LABEL, UPCOMING_LABEL } from '../earnings-copy';

const src = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

describe('mobile earnings labels', () => {
  it('uses the three agreed labels', () => {
    expect(READY_LABEL).toBe('Ready to withdraw');
    expect(UPCOMING_LABEL).toBe('Upcoming (after the puja/session)');
    expect(REQUESTED_LABEL).toBe('Requested, awaiting payout');
  });

  it('pandit dashboard reads /payouts/balance and keeps the single label only as a fallback', () => {
    const dash = src('app/(priest)/dashboard.tsx');
    expect(dash).toContain('usePayoutBalance');
    expect(dash).toMatch(/hasSplit && balance \?/);
    expect(dash).toContain('label="Pending payout"');
    expect(dash).toContain('READY_LABEL');
    expect(dash).toContain('REQUESTED_LABEL');
    expect(dash).toContain('UPCOMING_LABEL');
  });

  it('shared provider payouts card is labelled Ready to withdraw, not Available', () => {
    const p = src('lib/provider-payouts.tsx');
    expect(p).toContain('label="Ready to withdraw"');
    expect(p).not.toContain('label="Available"');
  });

  it('the addresses screen says prasad is India-only', () => {
    expect(src('app/(devotee)/addresses.tsx')).toContain('Prasad is delivered within India only.');
  });
});
