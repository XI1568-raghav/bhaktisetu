import { describe, it, expect } from 'vitest';
import {
  astrologerSupplyLabel,
  onlineAstrologerCount,
  verifiedAstrologerCount,
} from '../astrologer-supply-label';

/**
 * AW-02 — the devotee astrology screen must not state supply that is not there.
 *
 * It read `data.total` (every APPROVED astrologer) and printed
 * "{n} astrologers online". The three real astrologers all read
 * `isOnline: false`, so the app said "3 astrologers online" while zero were.
 */

describe('AW-02 — astrologer supply label', () => {
  it('never calls approved astrologers "online" when none is online', () => {
    const supply = {
      total: 3,
      astrologers: [{ isOnline: false }, { isOnline: false }, { isOnline: false }],
    };
    // The exact string the finding names.
    expect(astrologerSupplyLabel(supply)).not.toMatch(/online/);
    expect(astrologerSupplyLabel(supply)).toBe(' • 3 verified astrologers');
  });

  it('says online only for the astrologers actually online', () => {
    const supply = {
      total: 3,
      astrologers: [{ isOnline: true }, { isOnline: false }, { isOnline: true }],
    };
    expect(astrologerSupplyLabel(supply)).toBe(' • 2 astrologers online');
  });

  it('singularises rather than printing "1 astrologers"', () => {
    expect(astrologerSupplyLabel({ total: 1, astrologers: [{ isOnline: true }] })).toBe(
      ' • 1 astrologer online',
    );
    expect(astrologerSupplyLabel({ total: 1, astrologers: [{ isOnline: false }] })).toBe(
      ' • 1 verified astrologer',
    );
  });

  it('says nothing at all when there is no supply', () => {
    expect(astrologerSupplyLabel({ total: 0, astrologers: [] })).toBe('');
    expect(astrologerSupplyLabel(null)).toBe('');
    expect(astrologerSupplyLabel(undefined)).toBe('');
  });

  it('falls back to the verified count when rows are absent', () => {
    // A payload with a total but no rows tells us how many EXIST, never how
    // many are online — so the label must not claim the latter.
    const label = astrologerSupplyLabel({ total: 5 });
    expect(label).toBe(' • 5 verified astrologers');
    expect(onlineAstrologerCount({ total: 5 })).toBeNull();
  });

  it('treats a missing/garbage total as the row count, not NaN', () => {
    expect(verifiedAstrologerCount({ astrologers: [{}, {}] })).toBe(2);
    expect(verifiedAstrologerCount({ total: Number.NaN, astrologers: [{}] })).toBe(1);
    expect(verifiedAstrologerCount(null)).toBe(0);
  });
});
