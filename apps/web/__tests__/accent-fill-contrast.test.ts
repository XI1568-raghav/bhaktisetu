/**
 * A11Y-10, repo-wide — white text on an accent fill that never reaches 4.5:1.
 *
 * __tests__/cta-contrast.test.ts locks four hand-picked surfaces and says so
 * in its own LANE NOTE ("the same token pairing survives in files outside
 * SURFACES. Widen SURFACES once those land."). This file is that widening,
 * kept separate so the pixel-measured suite stays exactly as the sweep wrote
 * it. It walks every .ts/.tsx under app/ and components/ instead.
 *
 * It also models the CASCADE, which a flat "does this string contain both"
 * grep cannot. `bg-saffron-50 text-saffron-700 group-hover:bg-saffron-700
 * group-hover:text-white` reads as a violation to a flat scan and is not one:
 * the resting state paints dark copper on a tint, and the hovered state pairs
 * white with saffron-700 at 7.04:1. Each variant is resolved against the base
 * it inherits from, then judged on its own.
 *
 * The failing set is DERIVED from globals.css, never listed, so retuning a
 * token automatically retunes this guard.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);
const css = readFileSync(root('app/globals.css'), 'utf8');

/* ── WCAG 2.1 contrast ────────────────────────────────────────────────────── */

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

const AA_BODY = 4.5;
const WHITE = '#ffffff';

const TOKENS: Record<string, string> = {};
for (const m of css.matchAll(/--color-([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) {
  TOKENS[m[1]!] = m[2]!.toLowerCase();
}

/**
 * Fill tokens that cannot legally carry white text. `surface-*` is the neutral
 * ramp — its light steps are page grounds, never a filled control.
 */
const FAILING = new Set(
  Object.entries(TOKENS)
    .filter(([name, hex]) => !name.startsWith('surface-') && contrast(hex, WHITE) < AA_BODY)
    .map(([name]) => name),
);

/**
 * Files this wave could not enter: app/admin/** and app/astrology/** belong to
 * other lanes in this sweep. Each entry is a REAL surviving violation, not an
 * exemption — the list must shrink, never grow.
 */
const NOT_MINE_THIS_WAVE = new Set([
  'app/admin/support/view/page.tsx',
  'app/astrology/dasha/DashaClient.tsx',
  'app/astrology/horoscope/page.tsx',
  'app/astrology/kundli/page.tsx',
  'app/astrology/nakshatra-finder/NakshatraFinderClient.tsx',
]);

/* ── Cascade-aware class-string reader ───────────────────────────────────── */

type Painted = { fill?: string; text?: string };

/**
 * Split a class string into `{ variant -> { fill, text } }`, where the empty
 * string is the resting state. Opacity modifiers (`bg-white/20`) are skipped:
 * a translucent fill composites over whatever is behind it and cannot be
 * judged from source.
 */
function paint(classString: string): Map<string, Painted> {
  const states = new Map<string, Painted>();
  const at = (v: string) => states.get(v) ?? (states.set(v, {}), states.get(v)!);
  for (const raw of classString.split(/\s+/)) {
    if (!raw) continue;
    const i = raw.lastIndexOf(':');
    const variant = i === -1 ? '' : raw.slice(0, i);
    const util = i === -1 ? raw : raw.slice(i + 1);
    if (util.includes('/')) continue;
    let m = /^bg-([\w-]+)$/.exec(util);
    if (m) { at(variant).fill = m[1]!; continue; }
    m = /^text-([\w-]+)$/.exec(util);
    if (m) at(variant).text = m[1]!;
  }
  return states;
}

/** Every quoted string in a source file that looks like it holds classes. */
function classStrings(src: string): string[] {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  return [...stripped.matchAll(/["'`]([^"'`\n]*\b(?:bg|text)-[^"'`\n]*)["'`]/g)].map((m) => m[1]!);
}

type Violation = { file: string; state: string; fill: string; ratio: number; snippet: string };

function scan(): Violation[] {
  const out: Violation[] = [];
  for (const file of sources()) {
    const rel = path.relative(root('.'), file).split(path.sep).join('/');
    for (const s of classStrings(readFileSync(file, 'utf8'))) {
      const states = paint(s);
      const base = states.get('') ?? {};
      for (const [variant, own] of states) {
        const fill = own.fill ?? base.fill;
        const text = own.text ?? base.text;
        if (text !== 'white' || !fill || !FAILING.has(fill)) continue;
        out.push({
          file: rel,
          state: variant || 'resting',
          fill,
          ratio: contrast(TOKENS[fill]!, WHITE),
          snippet: s.slice(0, 90),
        });
      }
    }
  }
  return out;
}

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next') continue;
        walk(p);
      } else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(root('app'));
  walk(root('components'));
  return out;
}

describe('A11Y-10 — the darker weight exists for every failing accent', () => {
  const PAIRS: Array<[string, string]> = [
    ['tulsi-green', 'tulsi-green-dark'],
    ['lotus-pink', 'lotus-pink-dark'],
    ['ganga-blue', 'ganga-blue-dark'],
    ['amber-600', 'amber-700'],
    ['emerald-600', 'emerald-700'],
    ['indigo-500', 'indigo-600'],
  ];

  for (const [weak, strong] of PAIRS) {
    it(`${weak} fails and ${strong} passes, so the swap is a real upgrade`, () => {
      expect(contrast(TOKENS[weak]!, WHITE), `${weak} should be the failing one`).toBeLessThan(
        AA_BODY,
      );
      expect(contrast(TOKENS[strong]!, WHITE)).toBeGreaterThanOrEqual(AA_BODY);
    });
  }
});

describe('A11Y-10 — no white text on a sub-4.5:1 fill anywhere in app/ or components/', () => {
  const violations = scan();

  it('reports every surviving violation with its file and ratio', () => {
    const survivors = violations.filter((v) => !NOT_MINE_THIS_WAVE.has(v.file));
    expect(
      survivors.map((v) => `${v.file} [${v.state}] bg-${v.fill} = ${v.ratio}:1 :: ${v.snippet}`),
      'each of these paints white on a fill below the AA body threshold',
    ).toEqual([]);
  });

  it('the cascade model does not flag a tint whose hovered state is the dark weight', () => {
    // Resting: dark copper on a tint. Hovered: white on saffron-700 (7.04:1).
    const sample =
      'rounded-xl bg-saffron-100 text-saffron-700 group-hover:bg-saffron-700 group-hover:text-white';
    const states = paint(sample);
    const base = states.get('') ?? {};
    const hovered = states.get('group-hover')!;
    expect(hovered.fill).toBe('saffron-700');
    expect(contrast(TOKENS[hovered.fill!]!, WHITE)).toBeGreaterThanOrEqual(AA_BODY);
    expect(base.text).toBe('saffron-700');
  });

  it('the off-lane remainder is still real, so nothing here is being over-claimed', () => {
    const offLane = new Set(violations.filter((v) => NOT_MINE_THIS_WAVE.has(v.file)).map((v) => v.file));
    expect(
      offLane.size,
      'if these are fixed, delete them from NOT_MINE_THIS_WAVE and this guard covers the repo',
    ).toBeGreaterThan(0);
    for (const f of offLane) expect(f).toMatch(/^app\/(admin|astrology)\//);
  });
});
