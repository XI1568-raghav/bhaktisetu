import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Design-token contract for the Tailwind v4 theme layer.
 *
 * Every assertion below is "both sides of the contract": a utility class that
 * source code actually ships must have a token the browser can resolve, and a
 * token must name a font/colour that is actually loaded or declared. The prod
 * sweep 2026-08-12 found the two halves had drifted apart in five places:
 *
 *   DU-01 — the four brand font families were declared as `--font-family-*`,
 *           a namespace Tailwind v4 never reads, so `font-serif` (445 uses)
 *           fell through to `ui-serif` and `--font-family-sans` resolved to
 *           the empty string in the browser.
 *   DU-02 — `shadow-warm` / `-sm` / `-md` / `-lg` (51 uses) had no
 *           `--shadow-*` token at all, so every one painted `box-shadow: none`.
 *   DU-04 — #b87333 and #9e6229 were both shipping as "the primary".
 *   DU-06 — `.font-display` was not a generated utility, so its 41 call sites
 *           silently inherited the body stack.
 *   DU-09 — Tailwind's stock cool `orange-*` shipped next to the saffron ramp.
 *   DU-10 — two competing type scales (`--text-*` and `--type-*`) with
 *           different base sizes.
 *   DU-11 — the font stacks named Satoshi / Cabinet Grotesk / JetBrains Mono /
 *           Fira Code, none of which is loaded anywhere in the app, while the
 *           Crimson Pro that layout.tsx does download was referenced nowhere.
 *   DU-12 — 2,128 cool gray/slate/stone utilities on a warm cream product.
 *   RESP-05 — `--text-xs` floors at 11px on a 390px viewport.
 *   RESP-06/07/08/09/11 — controls under the 44px tap-target floor on mobile.
 */

const WEB = path.resolve(__dirname, '..');
const css = readFileSync(path.join(WEB, 'app/globals.css'), 'utf8');
const layout = readFileSync(path.join(WEB, 'app/layout.tsx'), 'utf8');

/* ── tiny CSS helpers ─────────────────────────────────────────────────────── */

function block(selector: string, source = css): string {
  const start = source.indexOf(selector);
  expect(start, `\`${selector}\` not found in app/globals.css`).toBeGreaterThan(-1);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated block for \`${selector}\``);
}

/** Comments in this file quote token names and values verbatim; a naive
 *  declaration scan would read the prose as CSS. Parse tokens from the
 *  comment-free source (the raw text is still used for marker lookups). */
const CSS_NC = css.replace(/\/\*[\s\S]*?\*\//g, '');
const THEME = block('@theme', CSS_NC);
const ROOT = block('\n:root {', CSS_NC);

/** All `--name: value;` declarations in a block, value trimmed. */
function decls(scope: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of scope.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

const THEME_VARS = decls(THEME);
const ROOT_VARS = decls(ROOT);

/* ── WCAG contrast ────────────────────────────────────────────────────────── */

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
}

/* ── source scan (the "other side" of every contract) ─────────────────────── */

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name)) out.push(full);
    }
  };
  for (const d of ['app', 'components', 'lib']) walk(path.join(WEB, d));
  return out;
}

const SOURCE = sourceFiles().map((f) => readFileSync(f, 'utf8')).join('\n');

/**
 * The same corpus with comments removed. Guards that count call sites MUST use
 * this: five guards in this sweep matched the prose documenting the rule they
 * were enforcing and reported phantom offenders. `SOURCE` is kept as-is because
 * the DU-02/DU-09/DU-12 scans above are already green against it and re-basing
 * them is a separate change.
 */
const CODE = sourceFiles()
  .map((f) =>
    readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1'),
  )
  .join('\n');

/** Distinct whole utilities matching a pattern, as they appear in source. */
function utilities(re: RegExp): string[] {
  return [...new Set([...SOURCE.matchAll(re)].map((m) => m[0]))].sort();
}

/** One level of `var(--x)` indirection resolved against the theme block. */
function resolveVar(value: string | undefined): string | undefined {
  if (!value) return value;
  const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
  return m ? (THEME_VARS[m[1]!] ?? ROOT_VARS[m[1]!]) : value.trim();
}

/**
 * Body of the rule whose selector is EXACTLY `sel`, from comment-free CSS.
 *
 * `block()` above scans the raw stylesheet, which is right for its marker
 * lookups and wrong here twice over: the prose above these rules names the
 * selectors it is documenting, and `.container-wide` also heads a grouped rule
 * that carries only the shared gutters. Both would return the wrong body.
 */
function ruleFor(sel: string): string {
  for (const m of CSS_NC.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
    if (m[1]!.trim() === sel) return m[2]!;
  }
  return '';
}

/* ═══ DU-01 / DU-06 / DU-11 — font tokens ═════════════════════════════════ */

describe('DU-01/06/11 — brand font tokens live in the namespace Tailwind reads', () => {
  /** next/font `variable:` names actually declared in app/layout.tsx. */
  const LOADED = new Set(
    [...layout.matchAll(/variable:\s*["'](--[\w-]+)["']/g)].map((m) => m[1]!),
  );

  it('layout.tsx really does download the faces the tokens will point at', () => {
    // I-06/I18N-06 (2026-08-15) added Tamil, Telugu and Bengali. This list is an
    // INVENTORY, not a cap: its job is to make a silently-dropped face fail
    // here. The reachability half — that a downloaded face is actually named by
    // a stack a page inherits, which is where Noto Sans Devanagari failed for
    // months — lives in __tests__/seo/indic-webfonts.test.ts.
    expect([...LOADED].sort()).toEqual([
      '--font-noto-bengali',
      '--font-noto-devanagari',
      '--font-noto-sans',
      '--font-noto-tamil',
      '--font-noto-telugu',
      '--font-reader-serif',
    ]);
  });

  for (const token of ['--font-sans', '--font-serif', '--font-display', '--font-mono', '--font-devanagari']) {
    it(`@theme declares ${token}, so the matching utility is generated`, () => {
      expect(
        THEME_VARS[token],
        `${token} is missing from @theme — Tailwind v4 generates font utilities from the --font-* namespace only`,
      ).toBeTruthy();
    });
  }

  it('the dead --font-family-* namespace is gone', () => {
    expect(
      [...css.matchAll(/--font-family-[\w-]+\s*:/g)].map((m) => m[0]),
      '--font-family-* resolves to the empty string in the browser',
    ).toEqual([]);
  });

  /**
   * Satoshi and Cabinet Grotesk are PERF-03's deliberate self-hosting
   * placeholders (see __tests__/seo/head-resource-budget.test.ts): drop the
   * licensed woff2 in with an @font-face of that name and the brand face takes
   * over. That only works if a downloaded face sits directly behind them, so a
   * placeholder is legal ONLY as the first entry with a loaded next/font
   * variable immediately after it. Everything else must be loaded or generic.
   */
  it('no font token names a face the app never loads', () => {
    const PLACEHOLDERS = ['Satoshi', 'Cabinet Grotesk'];
    const NEVER_LOADED = ['JetBrains Mono', 'Fira Code', 'Inter', 'Crimson Pro'];
    const offenders: string[] = [];
    for (const [name, value] of Object.entries({ ...THEME_VARS, ...ROOT_VARS })) {
      if (!name.startsWith('--font-')) continue;
      for (const face of NEVER_LOADED) {
        if (value.includes(face)) {
          offenders.push(
            `${name} names ${face} — next/font exposes a family only through its CSS variable`,
          );
        }
      }
      const parts = value.split(',').map((s) => s.trim());
      for (const [i, part] of parts.entries()) {
        const face = PLACEHOLDERS.find((f) => part.includes(f));
        if (!face) continue;
        if (i !== 0) offenders.push(`${name}: ${face} must lead the stack, not sit at position ${i}`);
        if (!/var\(\s*--font-noto/.test(parts[i + 1] ?? '')) {
          offenders.push(`${name}: ${face} is a placeholder — a downloaded face must follow it`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every next/font variable a token references is one layout.tsx declares', () => {
    const dangling: string[] = [];
    for (const [name, value] of Object.entries({ ...THEME_VARS, ...ROOT_VARS })) {
      if (!name.startsWith('--font-')) continue;
      for (const m of value.matchAll(/var\(\s*(--font-[\w-]+)\s*\)/g)) {
        const ref = m[1]!;
        if (LOADED.has(ref)) continue;
        if (THEME_VARS[ref] || ROOT_VARS[ref]) continue; // internal alias
        dangling.push(`${name} → ${ref}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('font-serif paints the Crimson Pro that layout.tsx already downloads', () => {
    expect(THEME_VARS['--font-serif']).toMatch(/var\(\s*--font-reader-serif\s*\)/);
  });

  it('font-mono falls back to a face every OS ships', () => {
    expect(THEME_VARS['--font-mono']).toMatch(/ui-monospace/);
  });

  it('the body stack and the font-sans utility are one definition, not two', () => {
    expect(THEME_VARS['--font-sans']).toMatch(/var\(\s*--font-body\s*\)/);
    expect(ROOT_VARS['--font-body']).toMatch(/var\(\s*--font-noto-sans\s*\)/);
  });
});

/* ═══ DU-02 — shadow-warm ═════════════════════════════════════════════════ */

describe('DU-02 — every shadow-* utility in source resolves to a token', () => {
  const used = utilities(/\bshadow-warm(?:-(?:sm|md|lg|xl))?(?![\w-])/g);

  it('source still ships the shadow-warm family (finding is live)', () => {
    expect(used.length).toBeGreaterThan(0);
  });

  for (const util of used) {
    it(`${util} has a --${util.replace(/^shadow-/, 'shadow-')} token in @theme`, () => {
      const token = `--${util}`;
      expect(
        THEME_VARS[token],
        `${util} is used in app source but ${token} is undefined — the utility compiles to box-shadow: none`,
      ).toBeTruthy();
    });
  }
});

/* ═══ DU-04 — one primary ═════════════════════════════════════════════════ */

describe('DU-04 — exactly one colour is "the primary"', () => {
  const saffron = Object.fromEntries(
    Object.entries(THEME_VARS)
      .filter(([n]) => /^--color-saffron-\d+$/.test(n))
      .map(([n, v]) => [n.replace('--color-saffron-', ''), v.toLowerCase()]),
  );

  it('--color-primary is one of the saffron ramp steps, not a free-floating hex', () => {
    expect(Object.values(saffron)).toContain(ROOT_VARS['--color-primary']!.toLowerCase());
  });

  it('--color-primary carries white text at AA (it is a resting fill)', () => {
    expect(contrast(ROOT_VARS['--color-primary']!, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('the hover weight is darker than the resting weight', () => {
    expect(luminance(ROOT_VARS['--color-primary-hover']!)).toBeLessThan(
      luminance(ROOT_VARS['--color-primary']!),
    );
  });

  it('.gradient-saffron is single-hue, not a blend of two "primaries"', () => {
    const rule = block('.gradient-saffron');
    expect(rule).toMatch(/var\(\s*--color-primary\s*\)/);
    expect(
      rule,
      'the gradient blended --color-primary into --color-primary-hover, painting both candidates at once',
    ).not.toMatch(/--color-primary-hover/);
  });
});

/* ═══ DU-09 — no Tailwind stock orange next to the saffron ramp ═══════════ */

describe('DU-09 — orange utilities are aliased into the brand ramp', () => {
  const steps = [
    ...new Set(
      [...SOURCE.matchAll(/\b(?:bg|text|border|from|to|via|ring)-orange-(\d{2,3})(?![\w-])/g)].map(
        (m) => m[1]!,
      ),
    ),
  ].sort();

  it('source still ships orange-* utilities (finding is live)', () => {
    expect(steps.length).toBeGreaterThan(0);
  });

  for (const step of steps) {
    it(`--color-orange-${step} is redefined onto the saffron ramp`, () => {
      const value = THEME_VARS[`--color-orange-${step}`];
      expect(value, `orange-${step} is used in source but still resolves to Tailwind stock orange`).toBeTruthy();
      expect(value).toMatch(/var\(\s*--color-saffron-\d+\s*\)/);
    });
  }
});

/* ═══ DU-10 / RESP-05 — one type scale, with a 12px floor ═════════════════ */

describe('DU-10 / RESP-05 — a single type scale that never floors below 12px', () => {
  /** min of `clamp(min, …, max)` in rem. */
  function clampMin(value: string): number {
    const m = /clamp\(\s*([\d.]+)rem/.exec(value);
    expect(m, `not a clamp(): ${value}`).not.toBeNull();
    return parseFloat(m![1]!);
  }

  it('--text-xs floors at 12px, not 11px (190+ elements measured under 12px at 390px)', () => {
    expect(clampMin(THEME_VARS['--text-xs']!) * 16).toBeGreaterThanOrEqual(12);
  });

  it('--text-sm floors at 13px or more (13.4px body copy was the sweep complaint)', () => {
    expect(clampMin(THEME_VARS['--text-sm']!) * 16).toBeGreaterThanOrEqual(13);
  });

  it('--text-base floors at 16px', () => {
    expect(clampMin(THEME_VARS['--text-base']!) * 16).toBeGreaterThanOrEqual(16);
  });

  it('the scale ascends', () => {
    const order = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    const mins = order.map((k) => clampMin(THEME_VARS[`--text-${k}`]!));
    for (let i = 1; i < mins.length; i++) {
      expect(mins[i], `--text-${order[i]} must be larger than --text-${order[i - 1]}`).toBeGreaterThan(
        mins[i - 1]!,
      );
    }
  });

  it('--type-* is an alias of --text-*, not a second competing scale', () => {
    const typeTokens = Object.entries(ROOT_VARS).filter(([n]) => /^--type-/.test(n));
    expect(typeTokens.length).toBeGreaterThan(0);
    const literal = typeTokens.filter(([, v]) => !/var\(\s*--text-/.test(v)).map(([n]) => n);
    expect(
      literal,
      '--type-base was clamp(0.875rem…0.9375rem) while --text-base was clamp(0.9375rem…1.0625rem) — two scales, two answers',
    ).toEqual([]);
  });
});

/* ═══ DU-10 — one leading ratio for prose ═════════════════════════════════ */

/**
 * The half of DU-10 the size scale could not close.
 *
 * `--text-*` was rewritten to a single fluid scale, but Tailwind v4 pairs every
 * size token with a SEPARATE `--text-*--line-height` token, and redefining the
 * size does not touch the pairing. Compiling app/globals.css through
 * @tailwindcss/postcss showed the stock pairings still shipping:
 *
 *   text-xs   calc(1 / 0.75)      = 1.333
 *   text-sm   calc(1.25 / 0.875)  = 1.429
 *   text-base calc(1.5 / 1)       = 1.5
 *   text-lg   calc(1.75 / 1.125)  = 1.556
 *   text-xl   calc(1.75 / 1.25)   = 1.4
 *
 * against `body { line-height: var(--leading-relaxed) }` = 1.6. So the same
 * paragraph role led at five different ratios depending on which size class it
 * happened to carry, and an unclassed <p> led differently again — which is
 * exactly the sweep's measurement ("the line-height ratio also swings: 1.33 on
 * /priest vs 1.60 on /pujas"). Note the body range was also INVERTED: the
 * smallest type, which needs the most leading, got the least.
 *
 * Declaring the pairings is a token-layer fix — it reaches every call site that
 * does not set its own `leading-*`, without editing one of them.
 */
describe('DU-10 — the type scale ships its own line-heights, not Tailwind stock', () => {
  /** Prose sizes. All four must lead identically — "one reading ratio". */
  const BODY = ['xs', 'sm', 'base', 'lg'];
  /** Display sizes, where leading tightens as the type grows. */
  const DISPLAY = ['xl', '2xl', '3xl', '4xl', '5xl'];
  const STEPS = [...BODY, ...DISPLAY];

  function ratio(step: string): number {
    const raw = THEME_VARS[`--text-${step}--line-height`];
    expect(
      raw,
      `--text-${step}--line-height is undeclared, so text-${step} inherits Tailwind's stock pairing`,
    ).toBeTruthy();
    const resolved = resolveVar(raw);
    const n = Number(resolved);
    expect(Number.isFinite(n), `--text-${step}--line-height must be a unitless ratio, got ${resolved}`)
      .toBe(true);
    return n;
  }

  for (const step of STEPS) {
    it(`--text-${step} declares its own line-height pairing`, () => {
      expect(ratio(step)).toBeGreaterThan(0);
    });
  }

  it('every prose size leads at the one reading ratio', () => {
    const ratios = new Set(BODY.map(ratio));
    expect(
      [...ratios],
      'the same paragraph must not lead differently because it carries text-sm rather than text-base',
    ).toHaveLength(1);
  });

  it('that reading ratio is the one `body` already inherits, so an unclassed <p> matches', () => {
    const bodyRule = block('\nbody {');
    const declared = /line-height:\s*([^;]+);/.exec(bodyRule)?.[1]?.trim();
    expect(declared, 'body must still declare a line-height').toBeTruthy();
    expect(Number(resolveVar(declared))).toBe(ratio('base'));
  });

  it('leading tightens as type grows — it never goes back up', () => {
    const ramp = STEPS.map(ratio);
    for (let i = 1; i < ramp.length; i++) {
      expect(
        ramp[i],
        `--text-${STEPS[i]} leads looser than --text-${STEPS[i - 1]}; the body range used to be inverted this way`,
      ).toBeLessThanOrEqual(ramp[i - 1]!);
    }
  });

  it('display type is genuinely tighter than prose, not merely not-looser', () => {
    expect(Math.max(...DISPLAY.map(ratio))).toBeLessThan(Math.min(...BODY.map(ratio)));
  });
});

/* ═══ DU-14 — the widest container step ═══════════════════════════════════ */

/**
 * DU-14 counted eleven container widths over 679 centred declarations; the
 * recount at HEAD is 725 over the same eleven. `.container-wide` (72rem) and
 * `.container-prose` (48rem) exist and four routes are migrated onto them —
 * __tests__/container-scale.test.ts owns that half and the ~700 unmigrated
 * declarations are still open.
 *
 * What CAN be closed without touching a call site is the widest step.
 * `--container-7xl` has exactly one consumer family in this app: `max-w-7xl`,
 * and every one of those occurrences is a centred page shell — no `w-7xl`,
 * `min-w-7xl`, `basis-7xl` or `@7xl` container query anywhere. So retargeting
 * the token from Tailwind's stock 80rem to the declared wide width snaps all of
 * them onto `.container-wide` with zero edits and zero collateral, and removes
 * the widest of the eleven. The other ten steps all have non-container
 * consumers (a `max-w-md` reading measure on a <p>, for one), so the same move
 * would be wrong for them — they stay a call-site migration.
 *
 * Every scan below runs on comment-stripped source.
 */
describe('DU-14 — the widest container step is the declared wide width', () => {
  const CENTRED_7XL = /(?:mx-auto[^"'`]{0,40}max-w-7xl|max-w-7xl[^"'`]{0,40}mx-auto)(?![\w-])/g;
  const ANY_7XL = /\b(?:[a-z0-9]+:)?max-w-7xl(?![\w-])/g;

  it('source still ships max-w-7xl page shells (the finding is live)', () => {
    expect([...CODE.matchAll(ANY_7XL)].length).toBeGreaterThan(20);
  });

  it('every max-w-7xl in the app is a centred page shell, so retargeting is safe', () => {
    const all = [...CODE.matchAll(ANY_7XL)].length;
    const centred = [...CODE.matchAll(CENTRED_7XL)].length;
    expect(
      all - centred,
      'a max-w-7xl that is NOT a centred container would be silently narrowed by the token change',
    ).toBe(0);
  });

  /**
   * The other families Tailwind v4 generates from the --container-* namespace.
   * Each is matched on its own: a single alternation with a leading `\b` looks
   * right and silently never fires on `@7xl:`, because `@` is not a word
   * character and there is no boundary in front of it.
   */
  const COLLATERAL: Array<[string, RegExp]> = [
    ['w-7xl', /(?<![\w-])w-7xl(?![\w-])/g],
    ['min-w-7xl', /(?<![\w-])min-w-7xl(?![\w-])/g],
    ['basis-7xl', /(?<![\w-])basis-7xl(?![\w-])/g],
    ['@7xl', /@7xl(?=[:/])/g],
  ];

  it('the collateral patterns actually match the thing they are hunting', () => {
    // Without this the guard below is green because it never fires at all.
    const FIXTURE = 'w-7xl min-w-7xl basis-7xl @7xl:flex lg:w-7xl';
    for (const [name, re] of COLLATERAL) {
      expect([...FIXTURE.matchAll(re)].length, `${name} pattern matches nothing`).toBeGreaterThan(0);
    }
    // …and none of them may fire on a plain centred container.
    for (const [name, re] of COLLATERAL) {
      expect([...'mx-auto max-w-7xl px-4'.matchAll(re)], `${name} misreads max-w-7xl`).toEqual([]);
    }
  });

  it('no other utility family reads --container-7xl', () => {
    const collateral = COLLATERAL.flatMap(([, re]) => [...CODE.matchAll(re)].map((m) => m[0]));
    expect(
      collateral,
      'redefining --container-7xl would also move these, which the finding never asked for',
    ).toEqual([]);
  });

  it('--container-7xl is redefined onto the declared wide width', () => {
    const value = THEME_VARS['--container-7xl'];
    expect(
      value,
      '--container-7xl is not redefined — max-w-7xl still resolves to Tailwind stock 80rem, an eleventh width',
    ).toBeTruthy();
    const wide = /max-width:\s*([\d.]+rem)/.exec(ruleFor('.container-wide'))?.[1];
    expect(wide, '.container-wide must declare a rem max-width').toBeTruthy();
    expect(
      resolveVar(value),
      `max-w-7xl must land on the same edge as .container-wide (${wide})`,
    ).toBe(wide);
  });

  it('the prose width still differs from the wide one (this is not a collapse to one)', () => {
    const rem = (s: string) => Number(/max-width:\s*([\d.]+)rem/.exec(s)?.[1] ?? NaN);
    expect(rem(ruleFor('.container-wide'))).toBeGreaterThan(rem(ruleFor('.container-prose')));
  });
});

/* ═══ DU-12 — the neutral ramp is warm ════════════════════════════════════ */

describe('DU-12 — cool gray ramps are remapped onto the warm neutral', () => {
  /** Tailwind v4 stock hexes, so "no contrast regression" is checkable. */
  const STOCK: Record<string, string> = {
    '50': '#f9fafb',
    '100': '#f3f4f6',
    '200': '#e5e7eb',
    '300': '#d1d5db',
    '400': '#9ca3af',
    '500': '#6b7280',
    '600': '#4b5563',
    '700': '#374151',
    '800': '#1f2937',
    '900': '#111827',
    '950': '#030712',
  };
  const RAMPS = ['gray', 'slate', 'zinc', 'neutral', 'stone'];

  it('source still ships cool-gray utilities (finding is live)', () => {
    const used = [...SOURCE.matchAll(/\b(?:bg|text|border|divide|ring)-gray-\d{2,3}(?![\w-])/g)];
    expect(used.length).toBeGreaterThan(100);
  });

  for (const step of Object.keys(STOCK)) {
    it(`--color-gray-${step} is a warm hex, no cooler than the stock ramp`, () => {
      const hex = THEME_VARS[`--color-gray-${step}`];
      expect(hex, `--color-gray-${step} is not redefined — Tailwind's cool gray still ships`).toBeTruthy();
      const [r, , b] = rgb(hex!);
      expect(r, `gray-${step} ${hex} is still cool (blue ≥ red)`).toBeGreaterThan(b);
      expect(
        contrast(hex!, '#ffffff'),
        `gray-${step} must not read worse on white than Tailwind's ${STOCK[step]}`,
      ).toBeGreaterThanOrEqual(contrast(STOCK[step]!, '#ffffff'));
    });
  }

  for (const ramp of RAMPS.filter((r) => r !== 'gray')) {
    it(`--color-${ramp}-* is aliased onto the same warm ramp`, () => {
      const entries = Object.entries(THEME_VARS).filter(([n]) =>
        new RegExp(`^--color-${ramp}-\\d+$`).test(n),
      );
      expect(entries.length, `${ramp} is not remapped`).toBeGreaterThan(0);
      for (const [name, value] of entries) {
        expect(value, `${name} should alias the gray ramp`).toMatch(/var\(\s*--color-gray-\d+\s*\)/);
      }
    });
  }

  it('the warm ramp darkens monotonically', () => {
    const lums = Object.keys(STOCK).map((s) => luminance(THEME_VARS[`--color-gray-${s}`]!));
    for (let i = 1; i < lums.length; i++) expect(lums[i]).toBeLessThan(lums[i - 1]!);
  });
});

/* ═══ RESP-06/07/08/09/11 — tap-target floor ══════════════════════════════ */

describe('RESP-06/07/08/09/11 — mobile tap-target floor', () => {
  /** The comment terminator immediately above the rule — unique in the file. */
  const MARKER = 'tap-target floor */';

  it('globals.css carries a small-viewport tap-target block', () => {
    expect(css, `expected a rule commented "${MARKER}"`).toContain(MARKER);
  });

  const from = css.indexOf(MARKER);
  const scope = from < 0 ? '' : block('@media', css.slice(css.indexOf('@media', from)));

  it('it is scoped to viewports at or below 1023px', () => {
    const m = /max-width:\s*(\d+)px/.exec(css.slice(from, css.indexOf('{', from)));
    expect(m, 'the tap-target block must be inside a max-width media query').not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(767);
  });

  for (const selector of [
    'button',
    '[role="button"]',
    'select',
    'summary',
    'footer li > a',
    'nav li > a',
    'header a[aria-label]',
    'header button[aria-label]',
  ]) {
    it(`${selector} gets a 44px floor`, () => {
      expect(scope, `${selector} missing from the tap-target rule`).toContain(selector);
    });
  }

  it('the floor is 44px', () => {
    expect(scope).toMatch(/min-height:\s*44px/);
  });

  it('icon-only controls also get a 44px horizontal floor', () => {
    expect(scope).toMatch(/min-width:\s*44px/);
  });

  it('list links become flex so the floor actually applies to them', () => {
    expect(scope, 'display:inline links ignore min-height').toMatch(/inline-flex/);
  });

  /**
   * Caught live at 390x844 while building this: `button:has(> svg:only-child)`
   * has specificity 0-1-2 and `header a[aria-label]` 0-1-2, both ABOVE
   * Tailwind's `.hidden` at 0-1-0. Setting `display` on them un-hid the
   * desktop-only search field and pushed Search, Cart and Open-menu off the
   * right edge of the phone (right edge 548px on a 398px viewport). Only
   * class-free selectors may touch `display` in here.
   */
  it('no attribute or :has() selector in the block overrides display', () => {
    const offenders: string[] = [];
    for (const m of scope.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const selector = m[1]!.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!/(^|[\s;])display\s*:/.test(m[2]!)) continue;
      if (/\[|:has\(|\./.test(selector)) offenders.push(selector.replace(/\s+/g, ' '));
    }
    expect(
      offenders,
      'a selector with an attribute, :has() or a class outranks Tailwind `.hidden` — setting display there un-hides desktop-only controls on mobile',
    ).toEqual([]);
  });
});
