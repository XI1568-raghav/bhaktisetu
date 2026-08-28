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

/*
 * This alternation must list EVERY key heading-recipe.ts exports, and must keep
 * its trailing `\b`.
 *
 * Alternation ORDER is not one of the hazards, and the first draft of this
 * comment said it was: the reasoning was that `portal` matches the prefix of
 * `portalInverse` and then `\b` fails between `l` and `I`. It does — and the
 * engine then backtracks into the next alternative and matches, so
 * `portal|portalInverse` and `portalInverse|portal` behave identically. Checked
 * against the engine rather than reasoned about, which is what the test below
 * now does in CI.
 *
 * The two things that genuinely break it:
 *   - a key added to the recipe and NOT added here. Every adopter of it then
 *     reads as a hand-rolled h1, so this ratchet's number RISES as the backlog
 *     falls, and the natural response is to raise the ceiling.
 *   - dropping the `\b`. `portal` then matches the prefix of anything starting
 *     with it, so `H1.portalish` — a name the recipe never exported — would
 *     count as adopted.
 * Both are asserted below. Listed in the recipe's own declaration order.
 */
const RECIPE = /H1\.(marketing|catalogue|detail|portal|portalInverse)\b/;

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

  it('the detector recognises every archetype the recipe exports, and nothing else', () => {
    /* Derived from the recipe file, so a key added there and forgotten here is
     * a red test rather than a silently inflated backlog. Comment-free source:
     * heading-recipe.ts documents each archetype in prose that names the
     * others. */
    const recipeSrc = code(path.join(WEB, 'components/ui/heading-recipe.ts'));
    const keys = [...recipeSrc.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]!);
    expect(keys.length, 'no archetype parsed off the recipe').toBeGreaterThan(3);
    for (const k of keys) {
      expect(RECIPE.test(`{H1.${k}}`), `RECIPE does not recognise H1.${k}`).toBe(true);
    }
    /* The `\b` half: a prefix of a real key is not a key. */
    expect(RECIPE.test('{H1.portalish}'), 'RECIPE matches a name the recipe never exported').toBe(
      false,
    );
    /* And the claim the comment above corrects: order is irrelevant because the
     * engine backtracks. Asserted so nobody re-derives the wrong conclusion. */
    const shortestFirst = /H1\.(marketing|catalogue|detail|portal|portalInverse)\b/;
    const longestFirst = /H1\.(marketing|catalogue|detail|portalInverse|portal)\b/;
    for (const r of [shortestFirst, longestFirst]) {
      expect(r.test('{H1.portalInverse}')).toBe(true);
      expect(r.test('{H1.portal}')).toBe(true);
      expect(r.test('{H1.portalish}')).toBe(false);
    }
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
     *
     * 2026-08-23 sweep: 199 of the 212 took an archetype, chosen from the h1's
     * own declaration rather than from the route name — light copy over a photo
     * or a dark bar is `detail`; a title whose largest step is 2xl or smaller,
     * and every title on a portal route, is `portal`; 5xl-and-up is the
     * `marketing` ramp and the rest is `catalogue`.
     *
     * 2026-08-28: 13 -> 6. Two groups closed, both of them the kind the
     * previous pass could only describe.
     *
     *   The 5 SMALL WHITE h1s (app/darshan/[id] x2, app/demo/[role] x2,
     *     app/mobile/darshan) — 16-24px light copy on a dark bar — needed a
     *     fifth archetype, because `detail` is a 30/36px display-face hero and
     *     `portal` is text-surface-800, dark ink on a dark surface.
     *     `H1.portalInverse` is that archetype: portal's size and weight,
     *     portal's colour inverted. It landed with the archetype-list pins in
     *     __tests__/design-tokens.test.ts (TWO of them) and
     *     __tests__/page-chrome-uniformity.test.ts (a THIRD the handoff did not
     *     know about) and with the RECIPE alternation in this file, all in one
     *     change — taking fewer than all of them is a red suite either way.
     *   The 2 RAW-HTML h1s (lib/markdown.ts, and the near-identical renderer
     *     inlined in app/help/articles/[lang]/[slug]) were not a class problem
     *     at all. Every consumer of both renderers already renders the page
     *     title as an H1.catalogue, so a `# ` in a body was emitting a SECOND
     *     level-1 heading. The body ladder shifted down one level (# -> h2,
     *     ## -> h3, ### -> h4) with every rendered size unchanged, so they left
     *     the h1 census by being the right tag rather than by wearing a recipe.
     *
     * The 6 that remain each need a person, and none of them is a codemod:
     *
     *   app/about/page.tsx — a bespoke 40px/72px marketing hero with a
     *     decorative underline sized to the type. `marketing` would render it
     *     at 30/48px. That is a design decision, not a migration.
     *   app/pitch/page.tsx x2 — `pitch-h1`, a bespoke class in app/pitch/
     *     pitch.css. Whether the investor deck is part of the product design
     *     system at all is a call nobody has made.
     *   app/auth/login/page.tsx — a flex row of nodes, no size declared.
     *   app/chakras/[slug]/page.tsx — builds its class from a template literal
     *     with a per-chakra colour that collides with the archetype's.
     *   app/global-error.tsx — paints inline because no stylesheet is loaded
     *     under it; DU-13 documents it as the standing exception.
     *
     * RATCHET, at the TRUE count. Lower it after every sweep. Left above the
     * true count it is slack a new bespoke h1 can be authored into without
     * failing anything, which is exactly how 279 files diverged while CI
     * stayed green.
     */
    const BASELINE = 6;
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
