/**
 * DU-15 — border radius sprawls past the declared scale.
 *
 * The sweep counted 13 radius utilities over 888 uses against a six-token
 * scale, and singled out the un-suffixed `rounded` as "untokenised". That is
 * literally true and provable from the compiler, not just from a grep:
 * Tailwind resolves `rounded` from the theme key `--radius`, which the stock
 * theme sets to 0.25rem inside an `inline` block — so before this stylesheet
 * declared its own, `rounded` compiled to a hardcoded `border-radius: 0.25rem`
 * (4px), a corner that appears nowhere in the declared 0.375 / 0.625 / 1 /
 * 1.375 / 1.75 / 2 rem scale. Verified by compiling globals.css against
 * tailwindcss 4.2.4 both ways:
 *   before -> .rounded { border-radius: 0.25rem }
 *   after  -> .rounded { border-radius: var(--radius) }
 *
 * SCOPE: this guard covers which radius VALUES are reachable. It does not
 * collapse 13 utilities down to the finding's target of three — that is a
 * 4,791-call-site design decision, still open.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);
const css = readFileSync(root('app/globals.css'), 'utf8');

/** The `@theme { … }` block, brace-matched from its opening. */
function themeBlock(): string {
  const start = css.indexOf('@theme');
  expect(start, '@theme block missing').toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i);
  }
  return '';
}

const theme = themeBlock();
const declared = (name: string) =>
  new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(theme)?.[1]?.trim();

/** Every declared step of the radius namespace, e.g. sm / md / lg / … */
const STEPS = [...theme.matchAll(/--radius-([\w-]+)\s*:/g)].map((m) => m[1]!);

describe('DU-15 — the un-suffixed radius is on the declared scale', () => {
  it('source really does ship the bare utility (the finding is live)', () => {
    let hits = 0;
    for (const f of sources()) {
      hits += (readFileSync(f, 'utf8').match(/(?:^|\s|["'`])rounded(?![\w-])/g) ?? []).length;
    }
    expect(hits, 'nothing left to guard').toBeGreaterThan(50);
  });

  it('@theme declares the key Tailwind resolves it from', () => {
    expect(
      declared('radius'),
      'without this key the utility inlines Tailwind stock 0.25rem, which is off-scale',
    ).toBeTruthy();
  });

  it('and it is one of the declared steps, not a twelfth value', () => {
    const bare = declared('radius');
    const values = STEPS.map((s) => declared(`radius-${s}`));
    expect(values, `--radius is ${bare}, which no --radius-* step matches`).toContain(bare);
  });

  it('specifically the smallest step, so nothing grew a bigger corner', () => {
    expect(declared('radius')).toBe(declared('radius-sm'));
  });

  it('the scale it joins ascends', () => {
    const rem = (v?: string) => Number(/([\d.]+)rem/.exec(v ?? '')?.[1] ?? NaN);
    const ordered = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'].map((s) => rem(declared(`radius-${s}`)));
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i], `step ${i} must be larger than step ${i - 1}`).toBeGreaterThan(
        ordered[i - 1]!,
      );
    }
  });
});

describe('DU-15 — no source file reaches for an undeclared step', () => {
  /** `full` and `none` are compiler keywords, not theme steps. */
  const KEYWORDS = new Set(['full', 'none']);
  /** Side prefixes Tailwind strips before resolving the step. */
  const SIDES = new Set(['s', 'e', 't', 'r', 'b', 'l', 'ss', 'se', 'ee', 'es', 'tl', 'tr', 'br', 'bl']);

  it('every rounded-* suffix in source is a declared step or a keyword', () => {
    const bad = new Map<string, string[]>();
    for (const f of sources()) {
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      for (const m of src.matchAll(/rounded-([a-z0-9-]+)/g)) {
        let suffix = m[1]!;
        const head = suffix.split('-')[0]!;
        if (SIDES.has(head)) suffix = suffix.slice(head.length + 1);
        if (suffix === '') continue; // bare directional -> resolves via --radius
        if (KEYWORDS.has(suffix) || STEPS.includes(suffix)) continue;
        const list = bad.get(suffix) ?? [];
        list.push(path.relative(root('.'), f).split(path.sep).join('/'));
        bad.set(suffix, list);
      }
    }
    expect(
      Object.fromEntries([...bad].map(([k, v]) => [k, v.slice(0, 3)])),
      'a radius utility with no matching --radius-* token compiles to nothing or to a stock value',
    ).toEqual({});
  });
});

function sources(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next') continue;
        walk(p);
      } else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  })(root('app'));
  (function walk(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  })(root('components'));
  return out;
}
