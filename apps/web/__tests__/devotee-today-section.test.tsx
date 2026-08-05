/**
 * Devotee dashboard revamp (2026-08-05) — regression guards.
 *
 * Locks two things: (1) the four hardcoded mock widgets are GONE from the
 * dashboard, and (2) the new DevoteeTodaySection fetches live data (panchang,
 * horoscope, reading-progress, store orders) and never renders fake arrays.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Devotee dashboard — mock widgets removed', () => {
  it('dashboard no longer renders hardcoded mock activity arrays', () => {
    const src = read('app/dashboard/page.tsx');
    // The literal demo rows must be gone.
    expect(src).not.toContain('Kashi Vishwanath');
    expect(src).not.toContain('Somnath Jyotirlinga');
    expect(src).not.toContain('Brass Diya Set + Agarbatti');
    expect(src).not.toContain('Rudraksha Mala (5 mukhi)');
    expect(src).not.toContain('Best muhurat for griha pravesh?');
  });

  it('dashboard mounts the live DevoteeTodaySection', () => {
    const src = read('app/dashboard/page.tsx');
    expect(src).toContain('DevoteeTodaySection');
  });
});

describe('DevoteeTodaySection — live data only', () => {
  it('fetches today panchang, horoscope, reading-progress and store orders', () => {
    const src = read('components/dashboard/DevoteeTodaySection.tsx');
    expect(src).toContain('/panchang/today');
    expect(src).toContain('/astrology/horoscope/daily');
    expect(src).toContain('/me/reading-progress');
    expect(src).toContain('/store/orders');
  });

  it('personalizes the horoscope by the devotee rashi', () => {
    const src = read('components/dashboard/DevoteeTodaySection.tsx');
    expect(src).toContain('rashi');
    expect(src).toMatch(/horoscope\/daily\?sign=/);
  });

  it('has no hardcoded fake data arrays', () => {
    const src = read('components/dashboard/DevoteeTodaySection.tsx');
    expect(src).not.toContain('Kashi Vishwanath');
    expect(src).not.toContain('Rudraksha Mala');
    expect(src).not.toContain('Tirupati Balaji');
  });
});
