/**
 * DU-13 — the recovery screens were the one corner of the product that was
 * visibly not the product.
 *
 * The sweep measured /pujas/[slug] at 390x844 and 1280x800: four leaf nodes in
 * `system-ui` and one in `monospace` (the only screen of the ten where either
 * appeared), a "Try again" control at 42.4px tall with an 8px corner — a
 * radius on no other button in the app — 14px/500 type matching no other
 * button style, a fill of #b87333 (3.79:1 under white text), and
 * `document.querySelectorAll('h1').length === 0`.
 *
 * Its five siblings were byte-for-byte the same inline style object.
 *
 * Everything here reads SOURCE WITH COMMENTS STRIPPED. Three guards in this
 * sweep were caught matching a comment that quoted the very string the guard
 * searched for, so nothing in this file may be satisfied by prose.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);

/** Source with `//` and block comments removed — assertions see code only. */
function code(rel: string): string {
  return readFileSync(root(rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Every route-segment boundary. app/global-error.tsx is deliberately absent:
 * it REPLACES the root layout, so the stylesheet the shared component depends
 * on is never loaded under it and inline styles are the only thing that paints.
 */
const BOUNDARIES = [
  'app/error.tsx',
  'app/blog/[slug]/error.tsx',
  'app/pujas/[slug]/error.tsx',
  'app/store/[handle]/error.tsx',
  'app/temples/[slug]/error.tsx',
  'app/yatra/[slug]/error.tsx',
];

/* ── WCAG contrast, same maths as cta-contrast.test.ts ────────────────────── */

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const s = parseInt(full.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

describe('DU-13 — the shared recovery screen exists and is built from tokens', () => {
  const src = code('components/ui/ErrorState.tsx');

  it('renders the title as an h1 wearing a declared archetype', () => {
    expect(src, 'the recovery screen must have a page title').toMatch(/<h1[^>]*H1\.\w+/);
  });

  it('takes both controls from the one button recipe', () => {
    expect(src).toMatch(/buttonClass\(/);
    const calls = [...src.matchAll(/buttonClass\(\s*'(\w+)'\s*,\s*'(\w+)'/g)];
    expect(calls.length, 'retry + back should both use the recipe').toBeGreaterThanOrEqual(2);
    for (const [, , size] of calls) {
      expect(['md', 'lg'], `size "${size}" is below the 44px tap floor`).toContain(size);
    }
  });

  it('paints nothing with a literal hex', () => {
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });

  it('sets no font-family and no border-radius of its own', () => {
    expect(src).not.toMatch(/fontFamily/);
    expect(src).not.toMatch(/borderRadius/);
  });
});

describe('DU-13 — every route-segment boundary is on that screen', () => {
  for (const file of BOUNDARIES) {
    const src = code(file);

    it(`${file} renders the shared recovery screen`, () => {
      expect(src, 'must import the shared component').toMatch(
        /import\s+ErrorState\s+from\s+'[^']*components\/ui\/ErrorState'/,
      );
      expect(src).toMatch(/<ErrorState\b/);
    });

    it(`${file} no longer carries an inline style object`, () => {
      expect(src, 'inline styles are how the six drifted apart').not.toMatch(/style=\{\{/);
      expect(src).not.toMatch(/fontFamily/);
      expect(src).not.toMatch(/borderRadius/);
    });

    it(`${file} hardcodes no colour`, () => {
      const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hexes, 'colour belongs to the token layer').toEqual([]);
    });

    it(`${file} still reports the failure to Sentry and offers a retry`, () => {
      expect(src, 'the boundary must keep capturing').toMatch(/captureBrowserException/);
      expect(src).toMatch(/onRetry=\{\(\)\s*=>\s*reset\(\)\}/);
    });
  }
});

describe('DU-13 — the fill the sweep measured is gone', () => {
  it('#b87333 under white text is 3.79:1, which is why it cannot come back', () => {
    expect(contrast('#b87333', '#ffffff')).toBe(3.79);
  });

  it('the recipe the boundaries now use is the passing weight', () => {
    const recipe = code('components/ui/button-recipe.ts');
    const primary = /primary:\s*'([^']+)'/.exec(recipe)?.[1] ?? '';
    expect(primary).toMatch(/bg-saffron-600/);
    const css = readFileSync(root('app/globals.css'), 'utf8');
    const hex = /--color-saffron-600:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1] ?? '';
    expect(contrast(hex, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('DU-13 — global-error.tsx is the documented exception', () => {
  const src = code('app/global-error.tsx');

  it('still paints inline, because no stylesheet is loaded under it', () => {
    expect(src).toMatch(/style=\{\{/);
  });

  it('and it already had the page title the others were missing', () => {
    expect(src).toMatch(/<h1\b/);
  });
});
