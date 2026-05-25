import { describe, it, expect } from 'vitest';
import { __testing } from './lessons.js';

const { BADGE_RULES, daysBetween, todayUTC } = __testing;

describe('lessons — daysBetween', () => {
  it('returns 0 for same day', () => {
    const a = new Date(Date.UTC(2026, 4, 21));
    expect(daysBetween(a, a)).toBe(0);
  });
  it('returns 1 for consecutive days', () => {
    const a = new Date(Date.UTC(2026, 4, 21));
    const b = new Date(Date.UTC(2026, 4, 22));
    expect(daysBetween(a, b)).toBe(1);
  });
  it('handles month boundary', () => {
    const a = new Date(Date.UTC(2026, 4, 31));
    const b = new Date(Date.UTC(2026, 5, 1));
    expect(daysBetween(a, b)).toBe(1);
  });
});

describe('lessons — todayUTC', () => {
  it('returns midnight UTC', () => {
    const t = todayUTC();
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCMinutes()).toBe(0);
    expect(t.getUTCSeconds()).toBe(0);
  });
});

describe('lessons — badge rules', () => {
  it('awards first-lesson on first completion', () => {
    const rule = BADGE_RULES.find((r) => r.key === 'first-lesson')!;
    expect(rule.predicate({ lessonCount: 1, score: 50, streakDays: 1 })).toBe(true);
    expect(rule.predicate({ lessonCount: 0, score: 50, streakDays: 1 })).toBe(false);
  });
  it('awards perfect-score only at 100', () => {
    const rule = BADGE_RULES.find((r) => r.key === 'perfect-score')!;
    expect(rule.predicate({ lessonCount: 1, score: 100, streakDays: 1 })).toBe(true);
    expect(rule.predicate({ lessonCount: 1, score: 99, streakDays: 1 })).toBe(false);
  });
  it('awards streak-7 at 7 days exactly', () => {
    const rule = BADGE_RULES.find((r) => r.key === 'streak-7')!;
    expect(rule.predicate({ lessonCount: 1, score: 50, streakDays: 7 })).toBe(true);
    expect(rule.predicate({ lessonCount: 1, score: 50, streakDays: 6 })).toBe(false);
  });
  it('rules are unique and cover lesson count tiers', () => {
    const keys = BADGE_RULES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('lessons-10');
    expect(keys).toContain('lessons-25');
    expect(keys).toContain('lessons-50');
  });
});
