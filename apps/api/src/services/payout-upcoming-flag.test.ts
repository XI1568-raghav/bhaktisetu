import { describe, it, expect } from 'vitest';
import { isUpcomingCommission, type HeldEarningKeys } from './payout.service.js';

// The earning screens split "Pending" into payable vs upcoming. A commission is
// upcoming exactly when GET /payouts/balance would count it in upcomingInr:
// PENDING, not yet in a payout request, and keyed on a held session / puja /
// consultation.

const keys: HeldEarningKeys = {
  wellnessEnrollmentIds: new Set(['enr-1']),
  bookingIds: new Set(['book-1']),
};
const base = { status: 'PENDING', payoutRequestId: null, bookingId: null, wellnessEnrollmentId: null };

describe('isUpcomingCommission', () => {
  it('is true for a pending, unrequested row on a held booking or enrollment', () => {
    expect(isUpcomingCommission({ ...base, bookingId: 'book-1' }, keys)).toBe(true);
    expect(isUpcomingCommission({ ...base, wellnessEnrollmentId: 'enr-1' }, keys)).toBe(true);
  });

  it('is false for a row whose booking is not held', () => {
    expect(isUpcomingCommission({ ...base, bookingId: 'book-2' }, keys)).toBe(false);
    expect(isUpcomingCommission(base, keys)).toBe(false);
  });

  it('is false once paid, reversed or already in a payout request', () => {
    expect(isUpcomingCommission({ ...base, bookingId: 'book-1', status: 'PAID' }, keys)).toBe(false);
    expect(isUpcomingCommission({ ...base, bookingId: 'book-1', status: 'REVERSED' }, keys)).toBe(false);
    expect(isUpcomingCommission({ ...base, bookingId: 'book-1', payoutRequestId: 'pr-1' }, keys)).toBe(false);
  });
});
