import { describe, it, expect } from 'vitest';
import {
  ASTROLOGER_PLATFORM_RATE,
  ASTROLOGER_SHARE,
  computeAstrologerSplit,
  setAstrologerOnline,
  getAstrologerPresence,
} from './astrologer.service.js';

describe('astrologer.service — commission split', () => {
  it('platform takes 20%, astrologer keeps 80% (aligned with priest cut)', () => {
    expect(ASTROLOGER_PLATFORM_RATE).toBe(0.2);
    expect(ASTROLOGER_SHARE).toBe(0.8);
  });

  it('computes correct split on a round number', () => {
    const s = computeAstrologerSplit(1000);
    expect(s.platformAmount).toBe(200);
    expect(s.astrologerAmount).toBe(800);
  });

  it('split always sums to the total (rounding-safe)', () => {
    for (const total of [50, 137, 999.99, 51, 12345.67]) {
      const s = computeAstrologerSplit(total);
      expect(s.platformAmount + s.astrologerAmount).toBeCloseTo(total, 2);
    }
  });
});

describe('astrologer.service — online presence', () => {
  it('defaults to offline', () => {
    const p = getAstrologerPresence('user-never-seen');
    expect(p.online).toBe(false);
  });

  it('setAstrologerOnline flips online + records heartbeat', () => {
    setAstrologerOnline('user-1', true);
    const p = getAstrologerPresence('user-1');
    expect(p.online).toBe(true);
    expect(p.lastSeenAt).toBeGreaterThan(0);
  });

  it('can go back offline', () => {
    setAstrologerOnline('user-2', true);
    setAstrologerOnline('user-2', false);
    expect(getAstrologerPresence('user-2').online).toBe(false);
  });

  it('mode toggles (chat/call) are tracked', () => {
    setAstrologerOnline('user-3', true, { chat: false, call: true });
    const p = getAstrologerPresence('user-3');
    expect(p.mode.chat).toBe(false);
    expect(p.mode.call).toBe(true);
  });
});
