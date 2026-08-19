/**
 * [DU-03] The primary CTA recipe is adopted, and the backlog only shrinks.
 *
 * The recipe (components/ui/button-recipe.ts) is the right root-cause fix and
 * is genuinely good: 3 heights, 1 radius, 4 variants, and not one of the ~64
 * call sites overrides h-*, px-*, py-* or rounded-*. But adoption stopped at 8 named
 * files, and the ONLY guards were:
 *
 *   - "these 8 files contain the substring `buttonClass(`" — a bare
 *     whole-file match, so app/pujas/page.tsx passed while hand-rolling 8 CTAs
 *     beside its 5 recipe calls; and
 *   - "no MIGRATED file hand-rolls a CTA" — real, but hardcoded to those same
 *     8 files, blind to the other 181.
 *
 * Nothing counted the rest, so a new page could add a ninth pixel height today
 * and every suite stayed green. This file supplies the missing repo-wide
 * ceiling, using the project's own detector rather than a second one.
 *
 * COMMENTS ARE STRIPPED FIRST. This file and the pages both quote CTA class
 * strings in prose; matching raw source would let a comment create or satisfy a
 * violation. That bug has appeared repeatedly in this sweep.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const rel = (f: string) => path.relative(WEB, f).split(path.sep).join('/');

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '__tests__') continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const FILES = [...sources(path.join(WEB, 'app')), ...sources(path.join(WEB, 'components'))];

/**
 * The project's own detector from __tests__/design-uniformity-sweep.test.ts — a
 * labelled interactive element painted with the SOLID brand fill and carrying
 * its own padding — with ONE addition, fillIsConditional() below.
 *
 * That addition matters for honesty, not convenience: run repo-wide, the
 * original detector reports 242 offenders, but 29 of those are segmented
 * filter chips whose saffron fill lives inside a ternary. They are a selected
 * STATE, which the detector already means to exclude (its own comment says so)
 * and only half-succeeds at, because its literal test looks for the words
 * active/selected/current beside a `===`. A ceiling built on 242 would have
 * 29 units of built-in slack and would demand that filter rows be turned into
 * button rows to close.
 */
/**
 * A className written as a template literal can paint the brand fill inside a
 * `${cond ? 'bg-saffron-600 …' : '…'}` interpolation. That is a SELECTED STATE
 * on a segmented filter (the deity filter on /temples, the specialities row on
 * the priest profile), not a resting CTA style — the recipe has no chip variant,
 * and forcing those into a fixed-height button would turn a filter row into a
 * button row. The literal `active|selected|current ===` test catches some of
 * them; this catches the rest, by asking whether the fill is conditional at all.
 */
function fillIsConditional(cls: string): boolean {
  const at = cls.search(/\bbg-saffron-600(?![\w\-/])/);
  if (at < 0) return false;
  for (const m of cls.matchAll(/\$\{[\s\S]*?\}/g)) {
    if (at > m.index! && at < m.index! + m[0].length) return true;
  }
  return false;
}

function bespokeCtas(file: string): string[] {
  const src = stripComments(readFileSync(file, 'utf8'));
  const found: string[] = [];
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const cls = m[1] ?? m[2] ?? '';
    if (!/\bbg-saffron-600(?![\w\-/])/.test(cls)) continue;
    if (!/\bpx-\d/.test(cls)) continue;
    if (/\b(active|selected|current)\w*\s*===?/i.test(cls)) continue;
    if (fillIsConditional(cls)) continue;
    const before = src.slice(Math.max(0, m.index! - 220), m.index!);
    if (![...before.matchAll(/<(button|a|Link)\b/g)].pop()) continue;
    found.push(`${rel(file)} :: ${cls.replace(/\s+/g, ' ').slice(0, 90)}`);
  }
  return found;
}

const OFFENDERS = FILES.flatMap(bespokeCtas);

describe('[DU-03] the CTA backlog has a ceiling and it only falls', () => {
  it('the detector still finds things (a regex regression cannot zero this out)', () => {
    // If bespokeCtas silently stopped matching, the ratchet below would pass
    // forever. Prove it bites on the exact shape it is written for.
    expect(OFFENDERS.length).toBeGreaterThan(0);
  });

  it('no new hand-rolled primary CTA is added', () => {
    /*
     * Measured 2026-08-19. The raw detector reported 242 across 181 files; 29
     * of those are conditional-fill state chips (see fillIsConditional), and 6
     * genuine CTAs were migrated in this pass — the empty-state CTA in the
     * temples browser, the stacked Book / Book Puja pair on /temples/<slug>,
     * and three on the priest profile. That leaves 213.
     *
     * RATCHET — lower it after every sweep; raising it needs a written reason.
     * Left above the true count it is slack a new off-scale button can be
     * authored into without failing anything, which is how DU-03 stayed open
     * while every suite was green.
     */
    const BASELINE = 213;
    expect(
      OFFENDERS.length,
      `${OFFENDERS.length} labelled saffron CTAs carry their own padding (ceiling ${BASELINE}). ` +
        "Use buttonClass('primary', 'sm'|'md'|'lg', '<layout-only extras>') from " +
        'components/ui/button-recipe — and pass NO h-*, px-*, py-* or rounded-* in the ' +
        'extras slot, which is the invariant every existing call site holds.\n' +
        OFFENDERS.slice(0, 40).join('\n'),
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('the screens DU-03 measured carry no hand-rolled CTA at all', () => {
    // The finding named ten screens. These are the ones that were still
    // hand-rolling when this ratchet was written, including the stacked
    // Book / Book Puja pair on /temples/<slug> that the finding called out by
    // name — two buttons with identical padding and different type sizes,
    // 31.2px against ~33px, one above the other.
    const NAMED = [
      'components/temples/TemplesBrowser.tsx',
      'app/temples/[slug]/page.tsx',
      'app/priest/profile/page.tsx',
    ];
    const still = NAMED.flatMap((r) => bespokeCtas(path.join(WEB, r)));
    expect(still, `${still.length} left on the measured screens`).toEqual([]);
  });

  it('every migrated call site passes layout-only extras', () => {
    // The recipe's whole value is that the third argument cannot re-open the
    // sprawl. One call site slipping an h-* or px-* through voids it.
    const bad: string[] = [];
    for (const f of FILES) {
      const src = stripComments(readFileSync(f, 'utf8'));
      for (const m of src.matchAll(/buttonClass\(([^)]*)\)/g)) {
        const args = m[1]!.split(',');
        const extra = args[2] ?? '';
        if (/\b(h-\d|px-\d|py-\d|rounded-)/.test(extra)) bad.push(`${rel(f)} :: ${m[0]}`);
      }
    }
    expect(bad, 'these override the recipe from the extras slot').toEqual([]);
  });
});
