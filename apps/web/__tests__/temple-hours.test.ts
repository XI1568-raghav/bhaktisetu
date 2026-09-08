import { describe, it, expect } from 'vitest';
import {
  TEMPLE_HOURS,
  MINUTES_PER_DAY,
  resolveTempleHour,
  minutesUntil,
  formatCountdown,
} from '../lib/temple-hours';

describe('temple hours cover the day exactly once', () => {
  it('every one of the 1440 minutes resolves, and to exactly one window', () => {
    // The bug this catches is a gap or an overlap after someone edits a
    // boundary — either shows a devotee the wrong part of the day, and a gap
    // would fall through to the ratri fallback at, say, 11am.
    for (let m = 0; m < MINUTES_PER_DAY; m++) {
      const hit = TEMPLE_HOURS.filter((h) =>
        h.startMin < h.endMin
          ? m >= h.startMin && m < h.endMin
          : m >= h.startMin || m < h.endMin,
      );
      expect(hit, `minute ${m} matched ${hit.length} windows`).toHaveLength(1);
      expect(resolveTempleHour(m).key).toBe(hit[0]!.key);
    }
  });

  it('names the traditional boundaries', () => {
    expect(resolveTempleHour(4 * 60).key).toBe('brahma'); // 04:00 sharp
    expect(resolveTempleHour(4 * 60 - 1).key).toBe('ratri'); // 03:59 is still night
    expect(resolveTempleHour(5 * 60 + 30).key).toBe('brahma');
    expect(resolveTempleHour(9 * 60).key).toBe('pratah');
    expect(resolveTempleHour(12 * 60).key).toBe('madhyahna');
    expect(resolveTempleHour(15 * 60).key).toBe('aparahna');
    expect(resolveTempleHour(19 * 60).key).toBe('sandhya');
    expect(resolveTempleHour(23 * 60).key).toBe('ratri');
    expect(resolveTempleHour(0).key).toBe('ratri'); // midnight wraps
  });

  it('every window carries a Sanskrit name and a plain-English gloss', () => {
    // The gloss is not decoration: an NRI second-generation devotee may not
    // know "Aparahna", and a nav that assumes they do is a nav that excludes.
    for (const h of TEMPLE_HOURS) {
      expect(h.name.length).toBeGreaterThan(2);
      expect(h.gloss.length).toBeGreaterThan(2);
      expect(h.gloss).not.toBe(h.name);
    }
  });

  it('normalises out-of-range and negative minutes instead of throwing', () => {
    expect(resolveTempleHour(MINUTES_PER_DAY + 9 * 60).key).toBe('pratah');
    expect(resolveTempleHour(-60).key).toBe('ratri'); // 23:00 yesterday
    expect(resolveTempleHour(12.7 * 60).key).toBe('madhyahna');
  });
});

describe('minutesUntil wraps midnight forward', () => {
  it('counts forward within the same day', () => {
    expect(minutesUntil(10 * 60, 10 * 60 + 42)).toBe(42);
  });

  it('wraps past midnight rather than going negative', () => {
    // 23:30 now, next slot 02:30 → 180 minutes, not -1260.
    expect(minutesUntil(23 * 60 + 30, 2 * 60 + 30)).toBe(180);
  });

  it('treats "the slot happening right now" as a full day away', () => {
    // "Next" means the one you are waiting for, not the one in progress.
    expect(minutesUntil(19 * 60, 19 * 60)).toBe(MINUTES_PER_DAY);
  });

  it('never returns a value outside 1..1440', () => {
    for (let from = 0; from < MINUTES_PER_DAY; from += 37) {
      for (let target = 0; target < MINUTES_PER_DAY; target += 53) {
        const d = minutesUntil(from, target);
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThanOrEqual(MINUTES_PER_DAY);
      }
    }
  });
});

describe('formatCountdown reads like a person wrote it', () => {
  it('renders the shapes a devotee sees', () => {
    expect(formatCountdown(0)).toBe('now');
    expect(formatCountdown(0.4)).toBe('now');
    expect(formatCountdown(1)).toBe('in 1 min');
    expect(formatCountdown(42)).toBe('in 42 min');
    expect(formatCountdown(60)).toBe('in 1 hr');
    expect(formatCountdown(185)).toBe('in 3 hr 5 min');
    expect(formatCountdown(180)).toBe('in 3 hr');
  });

  it('never emits "in 0 min" or a bare number', () => {
    for (let m = 0; m <= MINUTES_PER_DAY; m++) {
      const s = formatCountdown(m);
      expect(s).not.toBe('in 0 min');
      expect(s === 'now' || s.startsWith('in ')).toBe(true);
    }
  });
});
