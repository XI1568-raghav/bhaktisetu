import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from './lib/__mocks__/prisma.js';

vi.mock('./lib/prisma.js', () => ({ prisma: prismaMock }));

import { computePanchang, PanchangService } from './services/panchang.service.js';

// Pradosh + Somvar are RECURRING observances, so every assertion here is an
// invariant over a swept date range rather than a spot-check on one date.
// A spot-check would pass against a hardcoded date table; a swept invariant
// over two ranges years apart cannot.
function sweep(startUtc: [number, number, number], days: number) {
  const [y, m, d] = startUtc;
  const out: Array<ReturnType<typeof computePanchang>> = [];
  for (let i = 0; i < days; i++) {
    // Date.UTC keeps the sweep independent of the runner's local zone; the
    // weekday assertions below read .getDay() — the same accessor
    // computePanchang uses (panchang.service.ts:382) — so the test stays
    // self-consistent whatever TZ CI runs in.
    out.push(computePanchang(new Date(Date.UTC(y, m - 1, d + i))));
  }
  return out;
}

const RANGE_A: [number, number, number] = [2026, 8, 24]; // the live 90-day merchandising window
const RANGE_B: [number, number, number] = [2031, 3, 1]; // years away, deliberately outside any plausible table

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each([
  ['range A (2026-08-24 +90d)', RANGE_A],
  ['range B (2031-03-01 +90d)', RANGE_B],
])('recurring Shiva vrats are computed, not tabulated — %s', (_label, start) => {
  const dayList = sweep(start, 90);

  it('emits Pradosh Vrat on trayodashi, roughly twice per lunar month', () => {
    const pradosh = dayList.filter((p) => p.vrat.includes('Pradosh Vrat'));
    // 90 days spans ~3 lunar months x 2 trayodashis (shukla + krishna) = ~6.
    // Floor at 4 to absorb the tithi-skip/repeat that sunrise-referenced
    // tithi sampling produces (panchang.service.ts:224-232).
    expect(pradosh.length).toBeGreaterThanOrEqual(4);
    for (const p of pradosh) {
      expect(p.tithi).toContain('Trayodashi');
    }
  });

  it('never emits Pradosh Vrat on a non-trayodashi day', () => {
    const stray = dayList.filter(
      (p) => p.vrat.includes('Pradosh Vrat') && !p.tithi.includes('Trayodashi')
    );
    expect(stray).toEqual([]);
  });

  it('emits Somvar Vrat on every Monday and only on Mondays', () => {
    const mondays = dayList.filter((p) => p.date.getDay() === 1);
    const somvar = dayList.filter((p) => p.vrat.includes('Somvar Vrat'));
    expect(mondays.length).toBeGreaterThanOrEqual(12); // ~4 per month over 90 days
    expect(somvar.map((p) => p.date.getTime())).toEqual(
      mondays.map((p) => p.date.getTime())
    );
  });

  it('keeps the pre-existing vrat types present and tithi-linked', () => {
    // These four are the vrats that already shipped (panchang.service.ts:336-371).
    // Purely-additive means each must still fire on exactly the tithi it always did.
    for (const p of dayList) {
      if (p.tithi.includes('Ekadashi')) expect(p.vrat).toContain('Ekadashi Vrat');
      if (p.tithi === 'Purnima') expect(p.vrat).toContain('Purnima Vrat');
      if (p.tithi === 'Amavasya') expect(p.vrat).toContain('Amavasya Tarpan');
      if (p.tithi.includes('Chaturthi') && p.tithi.includes('Krishna')) {
        expect(p.vrat).toContain('Sankashti Chaturthi Vrat');
      }
    }
    const seen = new Set(dayList.flatMap((p) => p.vrat));
    expect(seen).toContain('Ekadashi Vrat');
    expect(seen).toContain('Purnima Vrat');
    expect(seen).toContain('Amavasya Tarpan');
    expect(seen).toContain('Sankashti Chaturthi Vrat');
  });
});

describe('GET /panchang/vrats payload', () => {
  it('surfaces Pradosh + Somvar through getUpcomingVrats with the unchanged entry shape', async () => {
    prismaMock.dailyPanchang.findMany.mockResolvedValueOnce([]);

    const out = await new PanchangService().getUpcomingVrats(90);

    const names = new Set(out.vrats.map((v) => v.vrat));
    expect(names).toContain('Pradosh Vrat');
    expect(names).toContain('Somvar Vrat');
    // Envelope must be untouched.
    expect(out).toHaveProperty('vrats');
    expect(out.total).toBe(out.vrats.length);
    // Entry shape must be byte-for-byte the same five keys every consumer reads
    // (panchang.service.ts:617-623) — no new field, none dropped.
    for (const v of out.vrats) {
      expect(Object.keys(v).sort()).toEqual(
        ['date', 'nakshatra', 'specialInfo', 'tithi', 'vrat'].sort()
      );
    }
  });

  it('still surfaces the four pre-existing vrats alongside the new ones', async () => {
    prismaMock.dailyPanchang.findMany.mockResolvedValueOnce([]);

    const out = await new PanchangService().getUpcomingVrats(90);
    const names = new Set(out.vrats.map((v) => v.vrat));

    expect(names).toContain('Ekadashi Vrat');
    expect(names).toContain('Purnima Vrat');
    expect(names).toContain('Amavasya Tarpan');
  });
});
