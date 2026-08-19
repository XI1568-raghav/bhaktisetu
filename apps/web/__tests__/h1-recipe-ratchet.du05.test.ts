/**
 * [DU-05] The h1 recipe is adopted repo-wide, and the backlog only shrinks.
 *
 * heading-recipe.ts is the right root-cause fix and the PORTAL archetype is
 * 100% adopted — but the only guard walked the 13 portal route prefixes
 * (__tests__/design-uniformity-sweep.test.ts) plus 10 files pinned by name.
 * Every other h1 in the tree was invisible to CI, so the finding's headline
 * claim — "the h1 is a different thing on every screen" — stayed literally true
 * off the sampled screens: 315 hand-rolled h1s across 279 files in 86 distinct
 * size/weight recipes, two real typefaces, plus 29 inline `style={{fontFamily}}`
 * overrides that bypass the token layer entirely.
 *
 * This file is the missing repo-wide count. It does not demand zero — the tail
 * needs per-directory judgement — it demands the number never grows.
 *
 * COMMENTS STRIPPED FIRST: this file and the pages quote class strings in
 * prose, and the sweep has repeatedly shipped guards that matched their own
 * documentation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const relOf = (f: string) => path.relative(WEB, f).split(path.sep).join('/');

function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '__tests__') continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.(test|spec)\./.test(p)) out.push(p);
  }
  return out;
}

const FILES = [
  ...walk(path.join(WEB, 'app')),
  ...walk(path.join(WEB, 'components')),
  ...walk(path.join(WEB, 'lib')),
];

const RECIPE = /H1\.(marketing|catalogue|detail|portal)\b/;

const openings: Array<{ file: string; attrs: string }> = [];
for (const f of FILES) {
  for (const m of code(f).matchAll(/<h1(\s[^>]*?)?>/gs)) {
    openings.push({ file: relOf(f), attrs: m[1] ?? '' });
  }
}

const HAND_ROLLED = openings.filter((o) => !RECIPE.test(o.attrs));

describe('[DU-05] one h1 recipe per archetype, everywhere', () => {
  it('the scan finds the h1s (a regex regression cannot zero this out)', () => {
    expect(openings.length, 'no <h1> found at all').toBeGreaterThan(300);
    expect(
      openings.length - HAND_ROLLED.length,
      'no h1 uses the recipe — the RECIPE regex broke',
    ).toBeGreaterThan(100);
  });

  it('no NEW hand-rolled h1 is added', () => {
    /*
     * Measured 2026-08-19: 314 hand-rolled of 408. This pass migrated the
     * seven byte-identical clusters (the astrology tool pages, the
     * aditya/ashta-lakshmi/calendar family, and the surface-900 marketing and
     * catalogue recipes) — 102 files — leaving 212 in a long tail of one- and
     * two-off recipes that need per-directory judgement.
     *
     * RATCHET. Lower it after every sweep. Left above the true count it is
     * slack a new bespoke h1 can be authored into without failing anything,
     * which is exactly how 279 files diverged while CI stayed green.
     */
    const BASELINE = 212;
    const byRecipe = new Map<string, string[]>();
    for (const o of HAND_ROLLED) {
      const cls =
        /className="([^"]*)"/.exec(o.attrs)?.[1] ??
        /className=\{`([^`]*)`\}/.exec(o.attrs)?.[1] ??
        '(dynamic)';
      byRecipe.set(cls, [...(byRecipe.get(cls) ?? []), o.file]);
    }
    const worst = [...byRecipe.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .map(([cls, fs_]) => `${fs_.length}x  ${cls.slice(0, 70)}  (${fs_[0]})`);
    expect(
      HAND_ROLLED.length,
      `${HAND_ROLLED.length} hand-rolled <h1> (ceiling ${BASELINE}) in ` +
        `${byRecipe.size} distinct recipes. Use H1.marketing / H1.catalogue / ` +
        'H1.detail / H1.portal from components/ui/heading-recipe; extras are ' +
        'layout-only.\nLargest remaining clusters:\n' + worst.join('\n'),
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('no h1 overrides the type token with an inline font-family', () => {
    /*
     * 47 h1s set font-family inline. An inline
     * style beats every class, so those headings are un-tokenizable: DU-06's
     * display face lands on them by accident today and cannot be changed from
     * the token layer tomorrow. 46 of the 47 asked for var(--font-display) and
     * were converted to the .heading-display class, which renders identically
     * and IS overridable; where the h1 already used an H1 archetype the inline
     * style was simply deleted, because the archetype decides the face on
     * purpose (portal chrome is not on the display face). The 1 survivor sets
     * var(--font-noto-devanagari), a genuine per-script choice. RATCHET.
     */
    const INLINE_FONT_BASELINE = 1;
    const offenders = openings
      .filter((o) => /style=\{\{[^}]*fontFamily/.test(o.attrs))
      .map((o) => o.file);
    expect(
      offenders.length,
      `${offenders.length} h1s set font-family inline, which no token can override ` +
        `(ceiling ${INLINE_FONT_BASELINE}). Delete the style object — .heading-display ` +
        'already supplies the family.\n' + [...new Set(offenders)].slice(0, 20).join('\n'),
    ).toBeLessThanOrEqual(INLINE_FONT_BASELINE);
  });

  it('every recipe call site passes layout-only extras', () => {
    // The recipe's value is that the interpolation slot cannot re-open the
    // sprawl. A text-*/font-* leaking through voids it.
    const bad: string[] = [];
    for (const o of openings) {
      if (!RECIPE.test(o.attrs)) continue;
      const tpl = /className=\{`([^`]*)`\}/.exec(o.attrs)?.[1];
      if (!tpl) continue;
      const extras = tpl.replace(/\$\{[^}]*\}/g, ' ');
      if (/\b(text-(?:xs|sm|base|lg|xl|\dxl)|font-(?:serif|display|bold|semibold|medium)|leading-)/.test(extras)) {
        bad.push(`${o.file} :: ${tpl.slice(0, 80)}`);
      }
    }
    expect(bad, 'these override the archetype from the extras slot').toEqual([]);
  });
});
