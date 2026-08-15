/**
 * PF-07 (prod sweep 2026-08-12, P3) — on a phone the first bookable puja sat
 * 2.3 screens below the fold.
 *
 * Measured at 390x844: the first booking control was at absolute top 1932px.
 * The first screen carried hero copy only; then four filter dropdowns and two
 * category cards had to be scrolled past before a single card in the catalogue
 * appeared.
 *
 * The finding offers two remedies — reorder the page below sm, or give the hero
 * a jump control. The jump control is taken here: it costs no client JS, it
 * does not disturb the desktop layout other agents are editing, and it survives
 * the at-home block growing.
 *
 * The hit-area half of the finding ("Book Now is only 34px tall") is separate
 * and already closed by CM-09 — the whole card is the target at min-h-[44px]
 * and the pill inside it is h-11. That is asserted here so it cannot regress
 * silently alongside a layout change.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Source with comments removed, so prose cannot satisfy a code guard. */
function codeOf(rel: string): string {
  return readFileSync(path.resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const src = codeOf('app/pujas/page.tsx');

describe('PF-07 — a phone can reach the catalogue without 2.3 screens of scroll', () => {
  it('the catalogue grid has an anchor to jump to', () => {
    expect(src).toMatch(/id="catalogue"/);
  });

  it('the anchor clears the fixed header when the browser scrolls to it', () => {
    const anchor = src.match(/id="catalogue"[^>]*/);
    expect(anchor).toBeTruthy();
    expect(anchor![0]).toMatch(/scroll-mt-/);
  });

  it('the hero carries the jump control, above the at-home block', () => {
    const jump = src.indexOf('href="#catalogue"');
    const atHome = src.indexOf('Pandits at your home');
    expect(jump, 'no jump control found').toBeGreaterThan(-1);
    expect(atHome).toBeGreaterThan(-1);
    expect(jump).toBeLessThan(atHome);
  });

  it('the jump control is a phone affordance, hidden once the grid is near the fold', () => {
    const el = src.match(/<a[^>]*href="#catalogue"[\s\S]{0,400}?<\/a>/);
    expect(el, 'jump control markup not found').toBeTruthy();
    expect(el![0]).toMatch(/md:hidden/);
  });

  it('the jump target is a real tap target', () => {
    const el = src.match(/<a[^>]*href="#catalogue"[\s\S]{0,400}?<\/a>/);
    expect(el![0]).toMatch(/min-h-\[44px\]/);
  });
});

describe('PF-07 — the card CTA hit area stays at or above 44px', () => {
  it('the card itself declares the floor', () => {
    expect(src).toMatch(/className="group block min-h-\[44px\]/);
  });

  it('the pill inside it is 44px tall', () => {
    expect(src).toMatch(/h-11 items-center/);
  });
});
