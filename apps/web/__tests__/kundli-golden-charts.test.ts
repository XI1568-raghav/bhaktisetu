// @vitest-environment node
//
// Kundli accuracy regression — 3 golden reference charts verified against astrosage.com.
// Locks Moon sign, nakshatra, pada, dasha lord, and Lahiri ayanamsa drift fix (commit fc52ea5).
//
// Mirror copy at lib/__tests__/kundli-golden-charts.test.ts (per request); this copy lives
// under the vitest include glob (__tests__/**/*.test.{ts,tsx}) so the runner picks it up.
//
// Field-name adaptations vs prompt:
// - KundliData has `nakshatra` (not `nakshatraName`).
// - There is no `currentDasha` field; current dasha = dashas.find(d => d.isCurrent).
//
// Uses node environment (not jsdom) — vedic-astrology.ts is pure compute, no DOM needed.

import { describe, it, expect } from 'vitest';
import { calculateKundli } from '../lib/vedic-astrology';

describe('Kundli Golden Charts', () => {
  it('Chart 1: Panipat 1995-01-05 14:40 — Aquarius/Shatabhisha pada 2, Saturn mahadasha', () => {
    const result = calculateKundli('Test', '1995-01-05', '14:40', 'Panipat', {
      lat: 29.3909,
      lng: 76.9635,
      tzOffset: 5.5,
    });

    expect(result.moonSign).toBe('Aquarius');
    expect(result.nakshatra).toContain('Shatabhisha');
    expect(result.nakshatraPada).toBe(2);

    // Saturn Mahadasha 2021-2040 per hand re-derivation in TASKS.md HANDOFF 2026-06-02.
    const currentDasha = result.dashas.find((d) => d.isCurrent);
    expect(currentDasha).toBeDefined();
    expect(currentDasha?.planet).toBe('Saturn');

    // Lahiri ayanamsa for 1995 — locks drift-coefficient fix (commit fc52ea5).
    expect(result.ayanamsa).toBeGreaterThan(23.7);
    expect(result.ayanamsa).toBeLessThan(23.85);
  });

  it('Chart 2: Mumbai 1990-08-15 12:00 — Lahiri ayanamsa 1990 range', () => {
    const result = calculateKundli('Test2', '1990-08-15', '12:00', 'Mumbai', {
      lat: 19.076,
      lng: 72.8777,
      tzOffset: 5.5,
    });

    expect(result.ayanamsa).toBeGreaterThan(23.7);
    expect(result.ayanamsa).toBeLessThan(23.8);
  });

  it('Chart 3: New Delhi 2000-01-01 06:00 — Lahiri ayanamsa 2000 range', () => {
    const result = calculateKundli('Test3', '2000-01-01', '06:00', 'New Delhi', {
      lat: 28.6139,
      lng: 77.209,
      tzOffset: 5.5,
    });

    expect(result.ayanamsa).toBeGreaterThan(23.82);
    expect(result.ayanamsa).toBeLessThan(23.92);
  });
});
