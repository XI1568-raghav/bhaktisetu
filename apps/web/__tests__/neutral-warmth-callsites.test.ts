/**
 * DU-12 — COOL-GRAY LEAK: gray/slate/zinc/neutral/stone utilities on a product
 * whose neutral ramp is warm.
 *
 * READ THIS BEFORE "FIXING" THE 2,257 CALL SITES.
 *
 * The finding reads like a 2,000-file rename job. It is not, and doing it as
 * one would be pure churn for zero pixel change. globals.css already redefines
 * --color-gray-* to the warm ramp and ALIASES slate/zinc/neutral/stone onto it,
 * so `bg-gray-500` and `bg-stone-500` already paint the same warm #6b6761 that
 * `bg-surface-*` does. __tests__/design-tokens.test.ts locks that mapping
 * step-by-step. Renaming the call sites on top of that would move ~2,257 lines
 * and change not one rendered pixel — and the ramps are NOT index-aligned
 * (gray-500 #6b6761 is surface-400, not surface-500), so a mechanical rename
 * would silently shift tones wherever it guessed the index wrong.
 *
 * So the leak that actually survives the token layer is the one the token layer
 * cannot reach: a hardcoded cool hex. `stroke="#e5e7eb"` resolves to Tailwind's
 * stock cool gray no matter what @theme says. This guard hunts those, and it
 * proves the alias coverage that makes the utilities safe to leave alone.
 *
 * Comments are stripped before any assertion, and __tests__/ is never scanned:
 * design-tokens.test.ts legitimately contains the stock cool hexes as the
 * baseline it compares against, and a naive scan would flag its own fixture.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);
const css = readFileSync(root('app/globals.css'), 'utf8');

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
        walk(p);
      } else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(root('app'));
  walk(root('components'));
  return out;
}

const rel = (f: string) => path.relative(root('.'), f).split(path.sep).join('/');

function code(f: string): string {
  return readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Tailwind v4 stock cool neutrals — every step of all five ramps. */
const STOCK_COOL = new Set(
  [
    '#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af',
    '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712',
    '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8',
    '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617',
    '#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa',
    '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b',
  ].map((h) => h.toLowerCase()),
);

const RAMPS = ['gray', 'slate', 'zinc', 'neutral', 'stone'];

/** The `@theme { … }` block, brace-matched from its opening. */
function themeBlock(): string {
  const start = css.indexOf('@theme');
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i);
  }
  return '';
}
const theme = themeBlock();

describe('DU-12 — no call site hardcodes a cool neutral past the token layer', () => {
  it('source ships no Tailwind stock cool-gray hex literal', () => {
    const offenders: Record<string, string[]> = {};
    for (const f of sources()) {
      const hits = [...code(f).matchAll(/#[0-9a-fA-F]{6}\b/g)]
        .map((m) => m[0].toLowerCase())
        .filter((h) => STOCK_COOL.has(h));
      if (hits.length) offenders[rel(f)] = [...new Set(hits)];
    }
    expect(
      offenders,
      'a hardcoded cool hex ignores the warm ramp entirely — @theme cannot retarget it',
    ).toEqual({});
  });
});

describe('DU-12 — the utilities are safe to leave alone because every shade is aliased', () => {
  /** Every `<prop>-<ramp>-<shade>` actually written in source. */
  function usedShades(): Map<string, Set<string>> {
    const used = new Map<string, Set<string>>();
    const re = new RegExp(
      `\\b(?:bg|text|border|ring|divide|from|via|to|placeholder|outline|decoration|fill|stroke|accent|caret)-(${RAMPS.join('|')})-(\\d{2,3})\\b`,
      'g',
    );
    for (const f of sources()) {
      for (const m of code(f).matchAll(re)) {
        const set = used.get(m[1]!) ?? new Set<string>();
        set.add(m[2]!);
        used.set(m[1]!, set);
      }
    }
    return used;
  }

  it('the finding is live — source really does ship thousands of cool-ramp utilities', () => {
    let n = 0;
    for (const set of usedShades().values()) n += set.size;
    expect(n, 'nothing left to guard').toBeGreaterThan(10);
  });

  it('every ramp+shade written in source has a matching @theme declaration', () => {
    const missing: string[] = [];
    for (const [ramp, shades] of usedShades()) {
      for (const shade of shades) {
        if (!new RegExp(`--color-${ramp}-${shade}\\s*:`).test(theme)) {
          missing.push(`--color-${ramp}-${shade}`);
        }
      }
    }
    expect(
      missing.sort(),
      'an un-aliased shade falls through to Tailwind stock and paints cool on a warm surface',
    ).toEqual([]);
  });

  it('the four aliased ramps point at the gray ramp rather than restating hexes', () => {
    for (const ramp of RAMPS.filter((r) => r !== 'gray')) {
      const entries = [...theme.matchAll(new RegExp(`--color-${ramp}-(\\d+)\\s*:\\s*([^;]+);`, 'g'))];
      expect(entries.length, `${ramp} is not aliased at all`).toBeGreaterThan(0);
      for (const [, shade, value] of entries) {
        expect(value!.trim(), `--color-${ramp}-${shade} drifted off the shared ramp`).toMatch(
          /var\(\s*--color-gray-\d+\s*\)/,
        );
      }
    }
  });
});
