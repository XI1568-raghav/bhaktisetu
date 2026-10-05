import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { selectAstrologerEarnings, selectTemplePayouts } from '../api-contracts';
import { READY_LABEL, REQUESTED_LABEL, requestedShown } from '../earnings-copy';

/**
 * The astrologer earnings summary used to send one `pendingInr` that mixed
 * money ready to withdraw with money already inside a payout request. The API
 * now sends `readyInr` and `requestedInr` too; the app must carry them and
 * label them truthfully, falling back to the old single figure only for an
 * older server.
 */
describe('astrologer earnings: ready vs requested', () => {
  const body = {
    data: [],
    summary: {
      totalEarningsInr: 1000,
      pendingInr: 800,
      readyInr: 300,
      requestedInr: 500,
      upcomingInr: 0,
      paidInr: 200,
      astrologerShare: 0.8,
    },
  };

  it('reads readyInr and requestedInr', () => {
    const vm = selectAstrologerEarnings(body)!;
    expect(vm.readyInr).toBe(300);
    expect(vm.requestedInr).toBe(500);
    expect(vm.pendingInr).toBe(800);
  });

  it('leaves the split null for an older server (screen falls back to "Pending")', () => {
    const vm = selectAstrologerEarnings({
      data: [],
      summary: { totalEarningsInr: 1, pendingInr: 1, paidInr: 0, astrologerShare: 0.8 },
    })!;
    expect(vm.readyInr).toBeNull();
    expect(vm.requestedInr).toBeNull();
  });

  it('shows the requested card only for a positive figure', () => {
    expect(requestedShown(500)).toBe(true);
    expect(requestedShown(0)).toBe(false);
    expect(requestedShown(null)).toBe(false);
  });

  it('uses the true wording', () => {
    expect(READY_LABEL).toBe('Ready to withdraw');
    expect(REQUESTED_LABEL).toBe('Requested, awaiting payout');
  });

  it('the astrologer screen renders the labels and keeps an unsplit fallback', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../../app/(astrologer)/earnings.tsx'),
      'utf8',
    );
    expect(src).toContain('READY_LABEL');
    expect(src).toContain('REQUESTED_LABEL');
    expect(src).toContain('label="Pending"'); // older-server fallback only
  });
});

describe('temple payouts: unsplit fallback is not called plain "Pending"', () => {
  it('pendingInr from the temple route includes upcoming share, so the fallback says so', () => {
    const vm = selectTemplePayouts({ payouts: [], total: 0, pendingInr: 110, paidInr: 0 })!;
    expect(vm.pendingInr).toBe(110);
    const src = readFileSync(path.resolve(__dirname, '../../app/(temple)/payouts.tsx'), 'utf8');
    expect(src).toContain('Pending (incl. upcoming)');
    expect(src).not.toContain('label="Pending"');
  });
});
