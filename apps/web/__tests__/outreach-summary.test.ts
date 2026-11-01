import { describe, it, expect } from 'vitest';
import { summarizeOutreachRun } from '../lib/outreach-summary';

describe('summarizeOutreachRun', () => {
  it('reads the zero run from prod as "nobody was due"', () => {
    const z = { attempted: 0, ok: 0, failed: 0 };
    const s = summarizeOutreachRun({ firstTouch: z, followup3day: z, followup7day: z, followup14day: z, durationMs: 737 });
    expect(s.headline).toMatch(/Nobody was due/);
    expect(s.durationSeconds).toBe(0.7);
    expect(s.stages).toHaveLength(4);
  });
  it('counts sent and failed across stages', () => {
    const s = summarizeOutreachRun({
      firstTouch: { attempted: 5, ok: 4, failed: 1 },
      followup3day: { attempted: 2, ok: 2, failed: 0 },
      durationMs: 12_345,
    });
    expect(s.totalSent).toBe(6);
    expect(s.totalFailed).toBe(1);
    expect(s.headline).toBe('Outreach run finished: 6 sent, 1 failed.');
    expect(s.durationSeconds).toBe(12.3);
  });
  it('survives a malformed result', () => {
    expect(summarizeOutreachRun(null).totalSent).toBe(0);
    expect(summarizeOutreachRun('x').durationSeconds).toBeNull();
  });
});
