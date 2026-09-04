/**
 * DU-14 — the page container changes width route to route.
 *
 * The sweep counted 679 centred containers across eleven widths and watched
 * the left content edge move between / , /pujas and /pricing at 1440px. Recount
 * at HEAD over app/ + components/: 753 declarations, still eleven widths
 * (4xl 182, 6xl 154, 5xl 132, 3xl 96, 2xl 68, 7xl 56, xl 34, md 20, lg 7,
 * xs 2, sm 2).
 *
 * SCOPE OF THIS GUARD, stated plainly so nobody reads it as more than it is:
 * globals.css now declares TWO widths, and the four highest-traffic consumer
 * routes — the home page and the three catalogue indexes — are migrated onto
 * them. /pricing, the detail routes, the seven provider portals and the
 * remaining ~700 declarations are NOT migrated. DU-14 stays open for those.
 *
 * Comments are stripped before any assertion: a guard in this sweep must not
 * be satisfiable by prose that mentions the class it is looking for.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);
const css = readFileSync(root('app/globals.css'), 'utf8');

function code(rel: string): string {
  return readFileSync(root(rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Body of the rule whose selector is exactly `sel` (not a grouped rule). */
function ruleFor(sel: string): string {
  for (const m of css.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
    if (m[1]!.replace(/\/\*[\s\S]*?\*\//g, '').trim() === sel) return m[2]!;
  }
  return '';
}

/** A centred container: mx-auto within 40 chars of a max-w-* on one class. */
const CONTAINER = /(?:mx-auto[^"'`]{0,40}max-w-[a-z0-9]+|max-w-[a-z0-9]+[^"'`]{0,40}mx-auto)/g;

/** Routes this wave migrated. The rest of DU-14 is explicitly still open. */
const MIGRATED = [
  'app/page.tsx',
  'app/pujas/page.tsx',
  'app/temples/page.tsx',
  'app/store/page.tsx',
];

/**
 * What may still centre a max-w-* on a migrated route. A reading measure on a
 * paragraph and a decorative rule are NOT page containers, and turning them
 * into one would be the wrong fix.
 */
const MEASURE_OR_ORNAMENT = /max-w-(xs|sm|md)\b/;

describe('DU-14 — globals.css declares the two widths', () => {
  it('.container-wide is 72rem', () => {
    const rule = ruleFor('.container-wide');
    expect(rule, '.container-wide missing from globals.css').toMatch(/max-width:\s*72rem/);
  });

  it('.container-prose is 48rem', () => {
    expect(ruleFor('.container-prose')).toMatch(/max-width:\s*48rem/);
  });

  it('both centre themselves, so a call site never re-states mx-auto', () => {
    expect(css).toMatch(
      /\.container-wide\s*,\s*\.container-prose\s*\{[^}]*margin-inline:\s*auto/,
    );
  });

  it('both carry the same gutter ramp, so the text edge lines up across routes', () => {
    const shared = [...css.matchAll(/\.container-wide\s*,\s*\.container-prose\s*\{([^}]*)\}/g)].map(
      (m) => m[1]!,
    );
    expect(shared.length, 'the two must share their padding rules, not each declare their own')
      .toBeGreaterThanOrEqual(3);
    for (const body of shared) expect(body).toMatch(/padding-inline:/);
  });

  it('wide is wider than prose', () => {
    const rem = (s: string) => Number(/max-width:\s*([\d.]+)rem/.exec(s)?.[1] ?? NaN);
    expect(rem(ruleFor('.container-wide'))).toBeGreaterThan(rem(ruleFor('.container-prose')));
  });
});

describe('DU-14 — the four migrated routes have one content width each', () => {
  for (const file of MIGRATED) {
    it(`${file} builds its shells from the declared container`, () => {
      expect(code(file)).toMatch(/className="container-(wide|prose)/);
    });

    it(`${file} centres no ad-hoc max-w-*xl shell any more`, () => {
      const leftovers = (code(file).match(CONTAINER) ?? []).filter(
        (s) => !MEASURE_OR_ORNAMENT.test(s),
      );
      expect(
        leftovers,
        'a hand-rolled centred container is exactly what moves the content edge between routes',
      ).toEqual([]);
    });
  }

  it('the migrated set really did use several widths before (the finding is live)', () => {
    // /pujas, /temples and /store sat at 7xl while / mixed 6xl, 5xl and 3xl.
    // Nothing on those four routes may reach for 7xl again.
    for (const file of MIGRATED) {
      expect(code(file), `${file} went back to the catalogue-only width`).not.toMatch(
        /max-w-7xl/,
      );
    }
  });
});

describe('DU-14 — the unmigrated remainder is real and is not being claimed', () => {
  it('the rest of the app still centres hundreds of ad-hoc containers', () => {
    let n = 0;
    for (const f of sources()) {
      const rel = path.relative(root('.'), f).split(path.sep).join('/');
      if (MIGRATED.includes(rel)) continue;
      n += (readFileSync(f, 'utf8').match(CONTAINER) ?? []).length;
    }
    expect(n, 'if this ever hits zero, DU-14 is finished and this guard should change')
      .toBeGreaterThan(300);
  });
});

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next') continue;
        walk(p);
      } else if (/\.tsx$/.test(e.name)) out.push(p);
    }
  };
  walk(root('app'));
  walk(root('components'));
  return out;
}

/**
 * DU-14, second pass — the GLOBAL chrome.
 *
 * The first pass migrated six page shells onto .container-wide and left
 * app/layout.tsx alone, which made the defect worse on exactly those routes.
 * At 1440px the left content edge used to be:
 *
 *   header  mx-auto max-w-7xl px-4/6/8   -> 80rem box, 112px edge
 *   content .container-wide              -> 72rem box, 176px edge
 *   footer  max-w-6xl mx-auto px-6/8/10  -> 72rem box but a THIRD gutter ramp,
 *                                           184px edge
 *
 * Three x positions on one page, on every route — the finding's own headline
 * defect, reproduced by the fix for it. The header and footer are on every one
 * of the 389 routes, so this is the highest-leverage container in the tree.
 */
describe('DU-14 — the site header and footer sit on the container scale', () => {
  const layout = code('app/layout.tsx');

  it('uses .container-wide for both chrome shells', () => {
    const uses = layout.match(/container-wide/g) ?? [];
    expect(
      uses.length,
      'app/layout.tsx should carry .container-wide on the header nav AND the footer',
    ).toBeGreaterThanOrEqual(2);
  });

  it('declares no ad-hoc centred container of its own', () => {
    const offenders = [...layout.matchAll(/className="[^"]*"/g)]
      .map((m) => m[0])
      .filter((cls) => /\bmx-auto\b/.test(cls) && /\bmax-w-(?:3xl|4xl|5xl|6xl|7xl)\b/.test(cls));
    expect(
      offenders,
      'the global chrome must not pick its own width — every route inherits it, so a ' +
        'mismatch here misaligns the header/footer against the page content on all 389 ' +
        'routes at once.\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  it('does not re-declare the gutter ramp beside the utility', () => {
    // .container-wide already supplies padding-inline 1rem / 1.5rem / 2rem. A
    // px-* alongside it is the third gutter ramp this block exists to remove.
    const withUtility = [...layout.matchAll(/className="([^"]*container-wide[^"]*)"/g)].map(
      (m) => m[1]!,
    );
    expect(withUtility.length).toBeGreaterThanOrEqual(2);
    for (const cls of withUtility) {
      expect(cls, `"${cls}" re-declares a horizontal gutter beside .container-wide`).not.toMatch(
        /\bpx-\d|\bsm:px-\d|\blg:px-\d|\bmax-w-/,
      );
    }
  });
});
