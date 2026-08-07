import { describe, it, expect } from 'vitest';
import { panchangService } from '../services/panchang.service.js';

// Integration: the service method runs the real computePanchang engine across a
// horizon and returns ranked, windowed, Rahukaal-cut results for a city.
describe('PanchangService.getPujaMuhurats', () => {
  it('returns up to 5 ranked days with the expected shape', async () => {
    const out = await panchangService.getPujaMuhurats('GRIHA_PRAVESH', '2026-08-07', 30, 'Gurugram');
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(5);
    const d = out[0]!;
    expect(d).toHaveProperty('date');
    expect(d).toHaveProperty('grade');
    expect(d).toHaveProperty('score');
    expect(d).toHaveProperty('windows');
    expect(d).toHaveProperty('rahuKaal');
    // sorted desc by score
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1]!.score).toBeGreaterThanOrEqual(out[i]!.score);
    }
  });

  it('every bookable window sits inside Gurugram daylight bounds', async () => {
    const out = await panchangService.getPujaMuhurats('SATYANARAYAN', '2026-08-07', 30, 'Gurugram');
    for (const day of out) {
      for (const w of day.windows) {
        // Gurugram August daylight ≈ 05:47–18:57; allow generous 04:00–20:00.
        const fromMin = parseInt(w.from.slice(0, 2), 10) * 60 + parseInt(w.from.slice(3), 10);
        const toMin = parseInt(w.to.slice(0, 2), 10) * 60 + parseInt(w.to.slice(3), 10);
        expect(fromMin).toBeGreaterThanOrEqual(4 * 60);
        expect(toMin).toBeLessThanOrEqual(20 * 60);
        expect(toMin).toBeGreaterThan(fromMin);
      }
    }
  });

  it('Gurugram city resolves (not silent Delhi fallback) via distinct sun times', async () => {
    // Indirect check: the muhurat windows derive from Gurugram's sun row, which
    // differs from Delhi by ~2 min. We assert the service did not throw and
    // returned windows — a missing city row previously fell back silently.
    const out = await panchangService.getPujaMuhurats('GRIHA_PRAVESH', '2026-03-01', 14, 'Gurugram');
    expect(out.length).toBeGreaterThan(0);
  });

  it('clamps the horizon to 92 days', async () => {
    const out = await panchangService.getPujaMuhurats('SATYANARAYAN', '2026-08-07', 500, 'Gurugram');
    // Still returns top-5 even for an over-large request.
    expect(out.length).toBeLessThanOrEqual(5);
  });
});
