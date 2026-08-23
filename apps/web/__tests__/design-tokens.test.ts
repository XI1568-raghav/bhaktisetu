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

/* ═══ DU-14 — the SECOND container step with no non-shell consumer ════════ */

/**
 * Every `className` string literal in comment-free source, whitespace
 * collapsed. The guards below ask "what else is on this element?", which the
 * joined-corpus scans above cannot answer — a bare `max-w-5xl` match tells you
 * nothing about whether the element is a page shell or a paragraph measure.
 */
const CLASS_STRINGS: string[] = [
  ...CODE.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g),
]
  .map((m) => (m[1] ?? m[2] ?? '').replace(/\s+/g, ' ').trim())
  .filter(Boolean);

/**
 * The 7xl block above closed the WIDEST of the eleven container steps, and its
 * prose then said "the other ten steps all have non-container consumers, so
 * the same move would be wrong for them". Re-measured at HEAD over app/,
 * components/ and lib/, that is not true of 5xl:
 *
 *     step        total   centred   carries a text-* size class
 *     max-w-4xl     188     182       2
 *     max-w-5xl     152     125       0
 *     max-w-6xl     148     144       1
 *     max-w-7xl      47      47       0
 *
 * All 27 non-centred `max-w-5xl` are portal page shells written
 * `space-y-6 max-w-5xl` — a shell left-aligned inside the portal column rather
 * than centred, not a reading measure — and ZERO of the 152 carry a type size,
 * which is the signature of a measure. There is no `w-5xl`, `min-w-5xl`,
 * `basis-5xl` or `@5xl` container query anywhere in the tree either, so
 * `--container-5xl` has exactly one consumer family: `max-w-5xl`.
 *
 * Retargeting it from Tailwind's stock 64rem to the declared wide width snaps
 * 152 more declarations onto `.container-wide` with zero call-site edits, and
 * puts the seven provider portals on the same content edge as the header and
 * footer that already sit on `.container-wide` above them — the exact defect
 * the app/layout.tsx pass fixed for the marketing routes.
 *
 * 4xl is the obvious next one and is deliberately NOT done here: 2 of its 188
 * occurrences are genuine headline measures (`max-w-4xl` beside `text-[2.5rem]`
 * in app/about/page.tsx and beside `lg:text-6xl` in
 * components/motion/StickyHeadlinePin.tsx), so the token move would silently
 * widen two headlines by 16rem. Those two have to become explicit
 * `max-w-[56rem]` measures first.
 */
describe('DU-14 — max-w-5xl resolves to the declared wide width', () => {
  const ANY_5XL = /\b(?:[a-z0-9]+:)?max-w-5xl(?![\w-])/g;
  const TYPE_SIZE = /(?:^|\s)(?:[a-z0-9]+:)?text-(?:xs|sm|base|lg|xl|\dxl|\[)/;

  it('source still ships max-w-5xl page shells (the finding is live)', () => {
    expect([...CODE.matchAll(ANY_5XL)].length).toBeGreaterThan(100);
  });

  it('the measure detector actually fires on a measure', () => {
    // Without this the guard below is green because it never matches anything.
    const one = new RegExp(ANY_5XL.source);
    expect(one.test('mt-4 max-w-5xl text-lg text-surface-600')).toBe(true);
    expect(TYPE_SIZE.test('mt-4 max-w-5xl text-lg text-surface-600')).toBe(true);
    expect(TYPE_SIZE.test('mx-auto max-w-5xl px-4 py-10 sm:px-6')).toBe(false);
  });

  it('no max-w-5xl is a reading measure, so retargeting cannot resize prose', () => {
    // Non-global copy: `.test()` on a /g regex carries lastIndex between calls
    // and would skip candidates at random.
    const one = new RegExp(ANY_5XL.source);
    const measures = CLASS_STRINGS.filter(
      (cls) => one.test(cls) && TYPE_SIZE.test(cls),
    ).map((cls) => cls.slice(0, 90));
    expect(
      measures,
      'a max-w-5xl that sets its own type is a measure on a paragraph or a headline, ' +
        'not a page shell — widening it to 72rem would change the line length of prose',
    ).toEqual([]);
  });

  /** The other families Tailwind v4 generates from the --container-* namespace. */
  const COLLATERAL_5XL: Array<[string, RegExp]> = [
    ['w-5xl', /(?<![\w-])w-5xl(?![\w-])/g],
    ['min-w-5xl', /(?<![\w-])min-w-5xl(?![\w-])/g],
    ['basis-5xl', /(?<![\w-])basis-5xl(?![\w-])/g],
    ['@5xl', /@5xl(?=[:/])/g],
  ];

  it('the collateral patterns match the thing they are hunting', () => {
    const FIXTURE = 'w-5xl min-w-5xl basis-5xl @5xl:flex lg:w-5xl';
    for (const [name, re] of COLLATERAL_5XL) {
      expect([...FIXTURE.matchAll(re)].length, `${name} pattern matches nothing`).toBeGreaterThan(
        0,
      );
    }
    for (const [name, re] of COLLATERAL_5XL) {
      expect([...'mx-auto max-w-5xl px-4'.matchAll(re)], `${name} misreads max-w-5xl`).toEqual([]);
    }
  });

  it('no other utility family reads --container-5xl', () => {
    const collateral = COLLATERAL_5XL.flatMap(([, re]) => [...CODE.matchAll(re)].map((m) => m[0]));
    expect(
      collateral,
      'redefining --container-5xl would also move these, which the finding never asked for',
    ).toEqual([]);
  });

  it('--container-5xl is redefined onto the declared wide width', () => {
    const value = THEME_VARS['--container-5xl'];
    expect(
      value,
      '--container-5xl is not redefined — max-w-5xl still resolves to Tailwind stock 64rem, ' +
        'a width no page shell in this product declares on purpose',
    ).toBeTruthy();
    const wide = /max-width:\s*([\d.]+rem)/.exec(ruleFor('.container-wide'))?.[1];
    expect(wide, '.container-wide must declare a rem max-width').toBeTruthy();
    expect(
      resolveVar(value),
      `max-w-5xl must land on the same edge as .container-wide (${wide})`,
    ).toBe(wide);
  });

  it('the two retargeted steps land on the same edge as each other', () => {
    expect(resolveVar(THEME_VARS['--container-5xl'])).toBe(
      resolveVar(THEME_VARS['--container-7xl']),
    );
  });

  it('the prose width still differs from the wide one (this is not a collapse to one)', () => {
    const rem = (s: string) => Number(/max-width:\s*([\d.]+)rem/.exec(s)?.[1] ?? NaN);
    expect(rem(ruleFor('.container-wide'))).toBeGreaterThan(rem(ruleFor('.container-prose')));
  });
});

/* ═══ DU-10 — the size an unclassed paragraph actually reads at ═══════════ */

/**
 * DU-10's expected state is "ONE body reading size (16px+) with one
 * line-height ratio, used for all prose". The line-height half shipped — every
 * `--text-*` step declares its pairing and `body` declares the same ratio, so
 * an unclassed <p> leads correctly. The SIZE half did not: `body` declared no
 * `font-size` at all, so an unclassed paragraph fell through to the user-agent
 * default of a flat 16px while every `text-base` / `.prose-body` paragraph
 * rendered `clamp(1rem, 0.97rem + 0.15vw, 1.0625rem)` — identical at 390px,
 * 16px against 17px from about 1440px up.
 *
 * That is the finding's own symptom produced by the token layer rather than by
 * a call site, and the population is not small: measured at HEAD over app/, 42
 * of the 219 <p> elements carrying a reading measure set no size class at all —
 * the largest bucket after text-sm.
 *
 * Declaring it on `body` fixes all 42 plus every unclassed <p> outside the
 * measure heuristic, with no call-site edits. Anything carrying an explicit
 * `text-*` is a class selector and still wins.
 */
describe('DU-10 — an unclassed paragraph reads at the declared body size', () => {
  /**
   * COMMENT-FREE source. The `body` rule now carries a comment that explains
   * this exact fix, and a scan of the raw block would be satisfiable by the
   * prose documenting the rule it is enforcing — the bug class this sweep has
   * shipped repeatedly.
   */
  const bodyRule = block('\nbody {', CSS_NC);

  it('unclassed prose really exists (the finding is live)', () => {
    const PROSE_P = /<p\s[^>]*className="([^"]*\bmax-w-[a-z0-9]+[^"]*)"/g;
    const unsized = [...CODE.matchAll(PROSE_P)]
      .map((m) => m[1]!)
      .filter((cls) => !/\bprose-body\b/.test(cls))
      .filter((cls) => !/(?:^|\s)(?:[a-z0-9]+:)?text-(?:xs|sm|base|lg|xl|\dxl|\[)/.test(cls));
    expect(
      unsized.length,
      'no unclassed prose paragraph found — either the census regex broke or the ' +
        'call-site migration finished, in which case this guard should change',
    ).toBeGreaterThan(20);
  });

  it('body declares a font-size, so prose is never left at the UA default', () => {
    expect(
      /(?:^|[\s;])font-size\s*:/.test(bodyRule),
      'body sets line-height but no font-size, so an unclassed <p> reads a flat 16px ' +
        'while text-base reads up to 17px — two sizes for one role, from the token layer',
    ).toBe(true);
  });

  it('and it is the declared base step, not a literal', () => {
    const declared = /font-size:\s*([^;]+);/.exec(bodyRule)?.[1]?.trim();
    expect(declared, 'body must declare a font-size').toBeTruthy();
    expect(
      declared!,
      'a hard-coded px/rem here would be a type size sitting outside the declared scale',
    ).toBe('var(--text-base)');
  });

  it('.prose-body and the document body resolve to the same step', () => {
    const prose = /font-size:\s*([^;]+);/.exec(ruleFor('.prose-body'))?.[1]?.trim();
    const doc = /font-size:\s*([^;]+);/.exec(bodyRule)?.[1]?.trim();
    expect(
      resolveVar(doc),
      'the class that exists so prose has one name to reach for must not differ from ' +
        'the size prose gets when it reaches for nothing',
    ).toBe(resolveVar(prose));
  });
});

/* ═══ DU-03 / DU-05 — the shared UI layer may not re-open the sprawl ══════ */

/**
 * Measured at HEAD, the whole DU-03 backlog (213 hand-rolled saffron CTAs) and
 * the whole DU-05 backlog (212 hand-rolled h1s of 408) lives in app/ and in
 * components/ subtrees other than components/ui. components/ui itself is
 * clean: every CTA in it goes through `buttonClass` and every h1 through an
 * `H1` archetype.
 *
 * That is worth a HARD ZERO rather than a ratchet. components/ui is the one
 * directory whose contents render on many routes at once, so a bespoke CTA or
 * h1 authored here does not add one to the backlog — it adds one per consumer,
 * invisibly. The repo-wide ratchets
 * (__tests__/cta-uniformity-ratchet.du03.test.ts,
 * __tests__/h1-recipe-ratchet.du05.test.ts) sit at the repo-wide count and
 * would absorb it without a word.
 */
describe('DU-03 / DU-05 — the shared components/ui layer stays on the recipes', () => {
  function uiSources(): string[] {
    const out: string[] = [];
    const walk = (d: string) => {
      for (const name of readdirSync(d)) {
        const full = path.join(d, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name)) out.push(full);
      }
    };
    walk(path.join(WEB, 'components/ui'));
    return out;
  }

  const UI = uiSources().map((f) => ({
    rel: path.relative(WEB, f).split(path.sep).join('/'),
    src: readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1'),
  }));

  it('the directory is actually being scanned', () => {
    expect(UI.length, 'components/ui vanished, or the walk broke').toBeGreaterThan(3);
    expect(UI.some((f) => f.rel.endsWith('button-recipe.ts'))).toBe(true);
    expect(UI.some((f) => f.rel.endsWith('heading-recipe.ts'))).toBe(true);
  });

  /**
   * The project's own DU-03 detector: a labelled control painted with the
   * solid brand fill that also carries its own padding.
   */
  function bespokeCta(src: string): string[] {
    const found: string[] = [];
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = m[1] ?? m[2] ?? '';
      if (!/\bbg-saffron-600(?![\w\-/])/.test(cls)) continue;
      if (!/\bpx-\d/.test(cls)) continue;
      const before = src.slice(Math.max(0, m.index! - 220), m.index!);
      if (![...before.matchAll(/<(button|a|Link)\b/g)].pop()) continue;
      found.push(cls.replace(/\s+/g, ' ').slice(0, 90));
    }
    return found;
  }

  it('the CTA detector fires on the shape it is written for', () => {
    const FIXTURE =
      '<a href="/x" className="bg-saffron-600 text-white px-6 py-3 rounded-full">Book</a>';
    expect(bespokeCta(FIXTURE).length).toBe(1);
    expect(bespokeCta('<a className="text-saffron-600 px-6">x</a>').length).toBe(0);
  });

  it('no shared UI component hand-rolls a primary CTA', () => {
    const bad = UI.flatMap((f) => bespokeCta(f.src).map((c) => `${f.rel} :: ${c}`));
    expect(
      bad,
      "use buttonClass('primary', 'sm'|'md'|'lg') from components/ui/button-recipe — a " +
        'bespoke CTA here ships on every route that renders the component',
    ).toEqual([]);
  });

  it('no shared UI component hand-rolls an h1', () => {
    const RECIPE = /H1\.(marketing|catalogue|detail|portal)\b/;
    const bad: string[] = [];
    for (const f of UI) {
      for (const m of f.src.matchAll(/<h1(\s[^>]*?)?>/gs)) {
        if (!RECIPE.test(m[1] ?? '')) bad.push(`${f.rel} :: ${(m[1] ?? '').slice(0, 80)}`);
      }
    }
    expect(
      bad,
      'use H1.marketing / H1.catalogue / H1.detail / H1.portal from ' +
        'components/ui/heading-recipe',
    ).toEqual([]);
  });
});

/* ═══ DU-05 — the archetypes derive from the scale, never redefine it ═════ */

/**
 * The four archetypes ARE the DU-05 fix, so a magic number inside one of them
 * is worse than a magic number at a call site: it ships to every adopter at
 * once.
 *
 * `H1.marketing` carried `leading-[1.1]`, an arbitrary value pinned across all
 * three of its steps. The type scale already pairs a leading with each step
 * (`--text-3xl--line-height: 1.2`, `4xl: 1.1`, `5xl: 1.05`) and the block above
 * asserts that pairing tightens as type grows — which `leading-[1.1]` defeated
 * in both directions at once: looser than declared at text-5xl on a desktop,
 * tighter than declared at text-3xl on a phone. In Tailwind v4 `text-*` emits
 * `line-height: var(--tw-leading, var(--text-*--line-height))` and `leading-*`
 * sets `--tw-leading`, so the override wins regardless of source order — the
 * responsive steps could not reach their own pairings.
 */
describe('DU-05 — no h1 archetype hard-codes a value the scale already declares', () => {
  const recipe = readFileSync(path.join(WEB, 'components/ui/heading-recipe.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const archetypes: Record<string, string> = {};
  for (const m of recipe.matchAll(/^ {2}(\w+):\s*\n?\s*'([^']+)',/gm)) {
    archetypes[m[1]!] = m[2]!.replace(/\s+/g, ' ').trim();
  }

  it('all four archetypes were parsed off the recipe', () => {
    expect(Object.keys(archetypes).sort()).toEqual([
      'catalogue',
      'detail',
      'marketing',
      'portal',
    ]);
  });

  it('the arbitrary-value detector fires on an arbitrary value', () => {
    const BAD = 'heading-display text-3xl leading-[1.1] tracking-tight';
    expect([...BAD.matchAll(/(?:^|\s)(?:[a-z0-9]+:)?[\w-]+-\[[^\]]+\]/g)].length).toBe(1);
    expect(
      [...'heading-display text-3xl tracking-tight'.matchAll(
        /(?:^|\s)(?:[a-z0-9]+:)?[\w-]+-\[[^\]]+\]/g,
      )].length,
    ).toBe(0);
  });

  it('none of them uses an arbitrary bracket value', () => {
    const bad = Object.entries(archetypes).flatMap(([k, cls]) =>
      [...cls.matchAll(/(?:^|\s)(?:[a-z0-9]+:)?[\w-]+-\[[^\]]+\]/g)].map(
        (m) => `H1.${k} :: ${m[0].trim()}`,
      ),
    );
    expect(
      bad,
      'an arbitrary value inside an archetype is a magic number shipped to every ' +
        'adopter of it. Leading comes from the --text-*--line-height pairing; size and ' +
        'tracking come from the declared steps.',
    ).toEqual([]);
  });

  it('none of them pins a leading at all — the step pairing decides it', () => {
    const bad = Object.entries(archetypes)
      .filter(([, cls]) => /(?:^|\s)(?:[a-z0-9]+:)?leading-/.test(cls))
      .map(([k]) => `H1.${k}`);
    expect(
      bad,
      'a leading-* here overrides --text-*--line-height at every responsive step of ' +
        "the archetype at once, which is what made a marketing h1 lead at 1.1 whether " +
        'it rendered at 30px or at 72px',
    ).toEqual([]);
  });

  it('each archetype declares exactly one weight and at least one size step', () => {
    for (const [k, cls] of Object.entries(archetypes)) {
      const weights = [...cls.matchAll(/(?:^|\s)font-(?:bold|semibold|medium|normal)/g)];
      expect(weights.length, `H1.${k} declares ${weights.length} font weights`).toBe(1);
      const steps = [...cls.matchAll(/(?:^|\s)text-(?:xs|sm|base|lg|xl|\dxl)/g)];
      expect(steps.length, `H1.${k} declares no size step`).toBeGreaterThanOrEqual(1);
    }
  });

  it('no two archetypes are the same string', () => {
    const values = Object.values(archetypes);
    expect(new Set(values).size, 'two archetypes collapsed onto one recipe').toBe(values.length);
  });
});

/* ═══ DU-03 — the focus ring may not re-shape the control it rings ════════ */

/**
 * The one radius the button recipe cannot pin.
 *
 * `components/ui/button-recipe.ts` pins ONE corner for every primary CTA —
 * `rounded-lg`, i.e. `--radius-lg` = 1rem — and __tests__/cta-uniformity-
 * ratchet.du03.test.ts refuses any call site that passes a `rounded-*` through
 * the extras slot. Both were correct and both were being overridden.
 *
 * app/globals.css declares a global focus ring, and that rule also carried
 * `border-radius: 4px`. Two facts make it win:
 *
 *   1. `@import "tailwindcss"` puts every utility inside `@layer utilities`,
 *      and this stylesheet declares no `@layer` of its own — so the focus rule
 *      is UNLAYERED. In the CSS cascade an unlayered declaration beats every
 *      layered one regardless of specificity, so `border-radius: 4px` outranks
 *      `.rounded-lg` even though both are (0,1,0).
 *   2. `:focus-visible` matches the element itself, not a ring pseudo-element,
 *      so the property re-shapes the CONTROL, not the outline.
 *
 * Compiled through @tailwindcss/postcss at HEAD, exactly that:
 *
 *   .rounded-lg     layer=utilities   { border-radius: var(--radius-lg) }
 *   :focus-visible  layer=(unlayered) { outline: ...; border-radius: 4px }
 *
 * So every focused control in the app — every buttonClass() CTA, every
 * `rounded-full` pill, every `rounded-2xl` modal — snapped to a 4px corner
 * while focused. 4px is not a step on the DU-15 radius scale (0.375 / 0.625 /
 * 1 / 1.375 / 1.75 / 2rem); it is the stock Tailwind value DU-15 removed from
 * `--radius`. Keyboard users saw the corner pop on focus, and saw the one
 * radius the recipe exists to guarantee replaced by a seventh.
 *
 * A ring does not need it. `outline` follows the element's own
 * `border-radius` in every browser the app supports, so removing the
 * declaration rounds the ring correctly AND leaves the control shape alone.
 *
 * COMMENT-FREE source: this block quotes `border-radius` in prose several
 * times over, and the rule it guards now carries a comment saying why the
 * property is absent. A raw-text scan would be satisfiable — and falsifiable —
 * by its own documentation.
 */
describe('DU-03 — the focus ring may not re-shape the control it rings', () => {
  const focusRule = ruleFor(':focus-visible');

  it('the app really ships one global focus ring (the finding is live)', () => {
    expect(focusRule, ':focus-visible not found in app/globals.css').toBeTruthy();
    expect(focusRule, 'the ring itself must survive — this is not licence to delete it').toMatch(
      /outline:\s*\d/,
    );
  });

  it('the stylesheet is unlayered, so anything it sets outranks every utility', () => {
    expect(
      /@layer\s[\w\s,-]*\{/.test(CSS_NC),
      'app/globals.css grew an @layer. The reasoning here assumes it has none: an ' +
        'unlayered rule beats all of Tailwind layered utilities, which is why a property ' +
        'set on :focus-visible reaches past rounded-*.',
    ).toBe(false);
  });

  it('the button recipe really does pin exactly one corner (the other side)', () => {
    const recipe = readFileSync(path.join(WEB, 'components/ui/button-recipe.ts'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const radii = [
      ...new Set([...recipe.matchAll(/(?:^|\s|')rounded-[\w-]+/g)].map((m) => m[0].trim())),
    ];
    expect(radii, 'the recipe pins one radius; that is the invariant being defended').toEqual([
      'rounded-lg',
    ]);
  });

  it('the focus ring declares no border-radius of its own', () => {
    const declared = /(?:^|[\s;])border-radius\s*:\s*([^;]+)/.exec(focusRule)?.[1]?.trim();
    expect(
      declared,
      `:focus-visible sets border-radius: ${declared}. Unlayered, that beats every ` +
        'rounded-* utility, so every focused control in the app repaints its corners at ' +
        'this value — the primary CTA included, whose one radius is the whole point of ' +
        'components/ui/button-recipe.ts. An outline already follows the border-radius of ' +
        'the element it rings; delete the declaration rather than picking a corner here.',
    ).toBeUndefined();
  });
});

/* ═══ DU-10 — metadata is one declared size, not a free choice ════════════ */

/**
 * `.prose-body` gave body copy one name. Metadata never got one.
 *
 * Census at HEAD over `<p>` elements under app/ carrying a `max-w-*` reading
 * measure — 219 of them:
 *
 *     .prose-body 3 · text-xs 7 · text-sm 83 · text-base 60 · text-lg 25 · none 41
 *
 * The `text-base`, `none` and `.prose-body` columns are all the one reading
 * size (body declares `font-size: var(--text-base)`), so the body half of
 * DU-10 is essentially closed at the token layer. What is left is 90
 * paragraphs of METADATA split across two steps — 12.0-13.0px on `text-xs`
 * against 13.0-14.0px on `text-sm` — with nothing to tell an author which one
 * their caption is. The finding allows "small sizes reserved for metadata"; it
 * does not allow two of them.
 *
 * `.prose-meta` is the missing name. `--text-sm` is the answer rather than
 * `--text-xs` because RESP-05 put the xs floor at exactly the 12px legibility
 * floor: a caption is still read, so it should not sit ON the floor.
 *
 * This is a UTILITY, not a sweep — the 90 call sites live in app/ and belong to
 * other lanes. What it buys today is that the next caption has one name to
 * reach for instead of a coin flip, and that the size it names is a token.
 */
describe('DU-10 — metadata has one declared size, not two', () => {
  /*
   * CHANGED DELIBERATELY, 2026-08-23, on this guard's own written instruction.
   *
   * It used to assert `xs > 0 && sm > 0` — "the two-step split is still live" —
   * with the note "if the sweep finished, this guard should change rather than
   * be deleted". The 2026-08-23 DU-10 sweep finished the xs half: every <p>
   * that carried a reading measure at text-xs was read and moved to
   * .prose-meta or .prose-body, and the census is now xs 0 / sm 86. The old
   * assertion is therefore an old fiction, and leaving it red would push the
   * next author to re-introduce a 12px caption to make CI green — the exact
   * inversion this file keeps warning about.
   *
   * So it becomes the two halves of the same claim, and both are stronger than
   * what it replaced: the closed half may not reopen, and the open half may
   * only shrink.
   */
  const PROSE_P = /<p\s[^>]*className="([^"]*\bmax-w-[a-z0-9]+[^"]*)"/g;
  const measuredProse = [...CODE.matchAll(PROSE_P)].map((m) => m[1]!);

  it('the census is live (a regex regression cannot vacuously pass the two below)', () => {
    expect(measuredProse.length, 'no measured <p> found at all').toBeGreaterThan(150);
  });

  it('the 12px step is gone from measured prose and may not come back', () => {
    const xs = measuredProse.filter((c) => /(?:^|\s)text-xs(?![\w-])/.test(c));
    expect(
      xs,
      `${xs.length} measured paragraphs are back on text-xs, which RESP-05 put exactly ON ` +
        'the 12px legibility floor. Captions are still read: use .prose-meta.\n' +
        xs.slice(0, 10).join('\n'),
    ).toEqual([]);
  });

  it('the text-sm half only shrinks', () => {
    /*
     * RATCHET, and the other half of the same finding. 86 measured paragraphs
     * still say text-sm where they mean "this is metadata". They are not a
     * blind sweep — .prose-meta IS --text-sm, so each one is a rename that
     * needs someone to confirm the paragraph is a caption and not body copy
     * that was shrunk. Lower this as they convert; it may not rise.
     */
    const BASELINE = 86;
    const sm = measuredProse.filter((c) => /(?:^|\s)text-sm(?![\w-])/.test(c));
    expect(
      sm.length,
      `${sm.length} measured paragraphs pick text-sm by hand (ceiling ${BASELINE}). ` +
        '.prose-meta declares that same step by name.',
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('.prose-meta is declared in globals.css', () => {
    expect(
      ruleFor('.prose-meta'),
      '.prose-meta missing — metadata copy has no name, so every caption author picks ' +
        'text-xs or text-sm by eye',
    ).toBeTruthy();
  });

  it('it names a scale step, not a literal', () => {
    const size = /font-size:\s*([^;]+);/.exec(ruleFor('.prose-meta'))?.[1]?.trim();
    expect(size, '.prose-meta must declare a font-size').toBeTruthy();
    expect(size!, 'a px/rem here would be a size sitting outside the declared scale').toMatch(
      /^var\(--text-[\w-]+\)$/,
    );
  });

  it('it sits above the 12px legibility floor, not on it', () => {
    const size = resolveVar(/font-size:\s*([^;]+);/.exec(ruleFor('.prose-meta'))?.[1]?.trim());
    const floorRem = parseFloat(/clamp\(\s*([\d.]+)rem/.exec(size ?? '')?.[1] ?? 'NaN');
    expect(
      floorRem * 16,
      'RESP-05 put --text-xs exactly ON the 12px floor. A caption is still read, so the ' +
        'one metadata size has to clear it.',
    ).toBeGreaterThan(12);
  });

  it('it leads at the same reading ratio as body copy', () => {
    const lead = /line-height:\s*([^;]+);/.exec(ruleFor('.prose-meta'))?.[1]?.trim();
    const bodyLead = /line-height:\s*([^;]+);/.exec(ruleFor('.prose-body'))?.[1]?.trim();
    expect(resolveVar(lead), 'one leading ratio for prose is the closed half of DU-10').toBe(
      resolveVar(bodyLead),
    );
  });

  it('it stays smaller than .prose-body, so it cannot become a second body size', () => {
    const rem = (sel: string) =>
      parseFloat(
        /clamp\(\s*([\d.]+)rem/.exec(
          resolveVar(/font-size:\s*([^;]+);/.exec(ruleFor(sel))?.[1]?.trim()) ?? '',
        )?.[1] ?? 'NaN',
      );
    expect(rem('.prose-meta')).toBeLessThan(rem('.prose-body'));
  });
});

/* ═══ DU-14 — the container scale is declared, not inherited ══════════════ */

/**
 * DU-14 counted eleven container widths over 679 centred declarations.
 * Recounted at HEAD across app/, components/ and lib/: 723 centred
 * declarations, still ELEVEN `max-w-*` steps —
 *
 *   4xl 182 · 6xl 143 · 5xl 126 · 3xl 92 · 2xl 69 · 7xl 47 · xl 33 · md 20 ·
 *   lg 7 · xs 2 · sm 2
 *
 * — but only NINE distinct RESOLVED widths, because two earlier passes
 * retargeted `--container-7xl` and `--container-5xl` onto the declared wide
 * width. That is the number that matters: a devotee sees rendered widths, not
 * class names.
 *
 * What was never checked is where the OTHER matching steps take their value
 * from. `.container-wide` is 72rem and `.container-prose` is 48rem, and
 * `max-w-6xl` (143 shells) and `max-w-3xl` (92 shells) land on exactly those
 * two numbers — by coincidence. Neither token is declared in `@theme`; both
 * fall through to the Tailwind stock scale. A Tailwind release that renumbers
 * that scale, or a `@theme` edit that touches one and not the other, silently
 * moves 235 page shells off the two declared widths with nothing in CI to
 * notice. Declaring them is a zero-diff lock: same values, now owned.
 *
 * The remaining real gap is `--container-4xl` — 182 centred shells at 56rem, a
 * third content width. It is NOT retargeted here and DU-14 stays open for it:
 * two of its 188 occurrences are genuine headline measures
 * (app/about/page.tsx beside `text-[2.5rem]`,
 * components/motion/StickyHeadlinePin.tsx beside `lg:text-6xl`) and would be
 * widened by 16rem. Those two have to become explicit `max-w-[56rem]` measures
 * first — a call-site edit in app/ and components/motion, not a token edit.
 */
describe('DU-14 — every container step the app centres on is a declared width', () => {
  /** Tailwind v4 stock container scale, in rem. A step absent from @theme falls
   *  through to these — the fragility this block exists to close. */
  const STOCK: Record<string, number> = {
    xs: 20,
    sm: 24,
    md: 28,
    lg: 32,
    xl: 36,
    '2xl': 42,
    '3xl': 48,
    '4xl': 56,
    '5xl': 64,
    '6xl': 72,
    '7xl': 80,
  };

  const declaredRem = (step: string): number | undefined => {
    const v = THEME_VARS[`--container-${step}`] ?? ROOT_VARS[`--container-${step}`];
    return v ? parseFloat(/([\d.]+)rem/.exec(v)?.[1] ?? 'NaN') : undefined;
  };
  const resolvedRem = (step: string): number => declaredRem(step) ?? STOCK[step]!;
  const utilityRem = (sel: string): number =>
    parseFloat(/max-width:\s*([\d.]+)rem/.exec(ruleFor(sel))?.[1] ?? 'NaN');

  /** A centred container: mx-auto within 40 chars of a max-w-* on one class. */
  const CONTAINER =
    /(?:mx-auto[^"'`]{0,40}max-w-([a-z0-9]+)|max-w-([a-z0-9]+)[^"'`]{0,40}mx-auto)/g;
  const steps = [...CODE.matchAll(CONTAINER)].map((m) => (m[1] ?? m[2])!);

  it('the census is live: the app still centres hundreds of ad-hoc containers', () => {
    expect(steps.length, 'the container detector stopped matching').toBeGreaterThan(300);
    expect(new Set(steps).size, 'more than one step is still in play').toBeGreaterThan(1);
  });

  it('--container-6xl is declared, not inherited from the Tailwind stock scale', () => {
    expect(
      declaredRem('6xl'),
      '143 centred shells use max-w-6xl and land on .container-wide only because the ' +
        'Tailwind stock 6xl happens to be 72rem. Declare it so the match is owned.',
    ).toBeDefined();
    expect(declaredRem('6xl')).toBe(utilityRem('.container-wide'));
  });

  it('--container-3xl is declared, not inherited from the Tailwind stock scale', () => {
    expect(
      declaredRem('3xl'),
      '92 centred shells use max-w-3xl and land on .container-prose only because the ' +
        'Tailwind stock 3xl happens to be 48rem. Declare it so the match is owned.',
    ).toBeDefined();
    expect(declaredRem('3xl')).toBe(utilityRem('.container-prose'));
  });

  it('every step that resolves to the wide width resolves to the SAME wide width', () => {
    const wide = utilityRem('.container-wide');
    for (const step of ['5xl', '6xl', '7xl']) {
      expect(resolvedRem(step), `max-w-${step} no longer lands on .container-wide`).toBe(wide);
    }
  });

  it('the resolved-width census never grows', () => {
    /*
     * RATCHET on RENDERED widths, not class names. Measured at HEAD: 9 distinct
     * widths over 723 centred declarations —
     *   72rem 316 · 56rem 182 · 48rem 92 · 42rem 69 · 36rem 33 · 28rem 20 ·
     *   32rem 7 · 20rem 2 · 24rem 2
     * The tail (42rem and below) is reading measures on cards and forms, not
     * page shells; the live defect is 56rem, and closing it takes 9 to 8.
     * Lower this after every sweep. Never raise it.
     */
    const BASELINE = 9;
    const widths = new Map<number, number>();
    for (const s of steps) {
      const w = resolvedRem(s);
      widths.set(w, (widths.get(w) ?? 0) + 1);
    }
    const listing = [...widths.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([w, n]) => `${w}rem x${n}`)
      .join(' | ');
    expect(
      widths.size,
      `${steps.length} centred containers resolve to ${widths.size} distinct widths ` +
        `(ceiling ${BASELINE}): ${listing}. Use .container-wide / .container-prose, or ` +
        'retarget the step in @theme once every one of its consumers is a page shell.',
    ).toBeLessThanOrEqual(BASELINE);
  });
});

/* ═══ DU-05 — an archetype that does not name its colour does not own it ══ */

/**
 * Three of the four h1 archetypes declare the colour they paint in
 * (`catalogue` and `portal` on `text-surface-800`, `detail` on `text-white`
 * over its image). `marketing` declared none, so its nineteen call sites —
 * /chakras, /chants, /faqs, /muhurat, /nakshatra, /nava-graha, /pilgrimage,
 * /pricing, /rashi, /sacred-trees, /vrat, /why-darshya, their eight [slug]
 * detail pages and the home hero — rendered at whatever `color` they
 * inherited. Today that is `body { color: var(--color-text) }`, and
 * `--color-text` IS `--color-surface-800`, so the rendered result matches the
 * other two exactly: declaring it is a zero-pixel change.
 *
 * It is not a zero-RISK omission. DU-05 counted SEVEN colour tokens across ten
 * h1s; the archetypes exist so that number cannot grow back. An archetype
 * whose colour comes from an ancestor is one coloured section away from an
 * eighth — and the failure is silent, because nothing in the recipe says what
 * the colour was supposed to be.
 *
 * Verified before declaring: none of the nineteen sits on a dark surface, and
 * none carries a colour class of its own, so no call site is being overridden.
 * components/home/HeroCopyVariant.tsx additionally pins
 * `style={{ color: 'var(--color-text)' }}` inline, which outranks any class
 * either way.
 */
describe('DU-05 — every h1 archetype declares the colour it renders in', () => {
  const recipeSrc = readFileSync(path.join(WEB, 'components/ui/heading-recipe.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const arche: Record<string, string> = {};
  for (const m of recipeSrc.matchAll(/^ {2}(\w+):\s*\n?\s*'([^']+)',/gm)) {
    arche[m[1]!] = m[2]!.replace(/\s+/g, ' ').trim();
  }

  /** A resting text colour. Deliberately not `text-<step>` — `text-3xl` is a size. */
  const COLOUR =
    /(?:^|\s)text-(?:white|black|surface-\d{2,3}|saffron-\d{2,3}|maroon-\d{2,3}|vermillion-\d{2,3}|gold-\d{2,3})(?![\w-])/;

  it('all four archetypes were parsed (a parse regression cannot vacuously pass this)', () => {
    expect(Object.keys(arche).sort()).toEqual(['catalogue', 'detail', 'marketing', 'portal']);
  });

  it('the colour detector tells a colour from a size step', () => {
    expect(COLOUR.test('heading-display text-3xl font-semibold')).toBe(false);
    expect(COLOUR.test('text-3xl text-surface-800')).toBe(true);
    expect(COLOUR.test('text-white drop-shadow-lg')).toBe(true);
  });

  it('no archetype leaves its colour to whatever ancestor it lands under', () => {
    const bare = Object.entries(arche)
      .filter(([, cls]) => !COLOUR.test(cls))
      .map(([k]) => `H1.${k}`);
    expect(
      bare,
      'these archetypes inherit their colour. DU-05 counted seven colour tokens for one ' +
        'role; an archetype that does not name its own is how the eighth arrives. Declare ' +
        'the token the call sites already render at.',
    ).toEqual([]);
  });

  it('the light-surface archetypes agree on one token', () => {
    const of = (k: string) => COLOUR.exec(arche[k] ?? '')?.[0]?.trim();
    expect(of('marketing'), 'marketing and catalogue are both light-surface page titles').toBe(
      of('catalogue'),
    );
    expect(of('portal')).toBe(of('catalogue'));
  });

  it('that token is the colour the body already renders at, so declaring it moved nothing', () => {
    const token = COLOUR.exec(arche.catalogue ?? '')?.[0]?.trim()?.replace(/^text-/, '');
    expect(token, 'catalogue lost its colour token').toBeTruthy();
    const bodyColour = resolveVar(/(?:^|[\s;])color:\s*([^;]+);/.exec(ruleFor('body'))?.[1]?.trim());
    const archeColour = resolveVar(THEME_VARS[`--color-${token}`] ?? ROOT_VARS[`--color-${token}`]);
    expect(archeColour, `--color-${token} is not declared`).toBeTruthy();
    expect(
      bodyColour,
      `body renders at ${bodyColour} but the h1 archetypes declare --color-${token} = ` +
        `${archeColour}. Once those differ, declaring the token on H1.marketing is no longer ` +
        'a zero-pixel change and the nineteen marketing call sites need a look.',
    ).toBe(archeColour);
  });
});

/* ═══ DU-14 — no container width is borrowed from the upstream default ════ */

/**
 * The block above locked the four steps that matter most — `7xl` and `5xl`
 * retargeted onto the wide width, `6xl` and `3xl` declared at the values they
 * already had. Seven steps the app actually ships were still absent from
 * `@theme` and resolved out of `tailwindcss/theme.css`:
 *
 *   max-w-4xl 188 · max-w-2xl 140 · max-w-md 52 · max-w-xl 50 · max-w-sm 16 ·
 *   max-w-lg 14 · max-w-xs 7     (measured at HEAD across app/, components/, lib/)
 *
 * That is 467 declarations — 182 of them centred page shells at 56rem — whose
 * rendered width was a property of the installed Tailwind version rather than
 * of this product. Declaring each at the value it already resolves to is a
 * zero-pixel change; the only thing it changes is that a `tailwindcss` upgrade
 * which renumbers the scale now moves nothing.
 *
 * `--container-4xl` is the one step declared but deliberately NOT retargeted
 * onto the wide width, and the last test is why: two of its 188 occurrences are
 * genuine headline measures rather than page shells (app/about/page.tsx beside
 * `text-[2.5rem]`, components/motion/StickyHeadlinePin.tsx beside
 * `lg:text-6xl`), and folding 4xl into 72rem would widen those two headlines by
 * 16rem. That test closes itself: the moment no `max-w-4xl` consumer sets its
 * own type size, it stops permitting 56rem and starts demanding the retarget.
 */
describe('DU-14 — every container step the app ships is declared in @theme', () => {
  const STEPS = [
    '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl',
    '2xl', '3xl', '4xl', '5xl', '6xl', '7xl',
  ];
  const declared = (step: string): string | undefined =>
    THEME_VARS[`--container-${step}`] ?? ROOT_VARS[`--container-${step}`];
  const rem = (v: string | undefined): number =>
    parseFloat(/([\d.]+)rem/.exec(v ?? '')?.[1] ?? 'NaN');
  const utilityRem = (sel: string): number =>
    parseFloat(/max-width:\s*([\d.]+)rem/.exec(ruleFor(sel))?.[1] ?? 'NaN');

  /** Every `max-w-<step>` / `min-w-<step>` written in source, comment-free. */
  const used = new Map<string, number>();
  for (const m of CODE.matchAll(/\b(?:max|min)-w-([a-z0-9]+)\b/g)) {
    if (!STEPS.includes(m[1]!)) continue;
    used.set(m[1]!, (used.get(m[1]!) ?? 0) + 1);
  }

  it('the census is live (a regex regression cannot vacuously pass this)', () => {
    expect(used.size, 'no container-scale utility found at all').toBeGreaterThan(6);
    expect([...used.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(500);
  });

  it('no step the app ships takes its width from tailwindcss/theme.css', () => {
    const inherited = [...used.entries()]
      .filter(([step]) => declared(step) === undefined)
      .sort((a, b) => b[1] - a[1])
      .map(([step, n]) => `--container-${step} (${n} uses)`);
    expect(
      inherited,
      'these widths are a property of the installed Tailwind version, not of this product: ' +
        'a release that renumbers the container scale moves them with nothing in CI to ' +
        'notice. Declare each at the value it already resolves to — that is a zero-pixel ' +
        'change — in the @theme block of app/globals.css.',
    ).toEqual([]);
  });

  it('the declared scale stays monotonic, so a bigger step is never a narrower box', () => {
    const ladder = STEPS.filter((s) => declared(s) !== undefined).map(
      (s) => [s, rem(declared(s))] as const,
    );
    expect(ladder.length, 'nothing declared to check').toBeGreaterThan(4);
    for (let i = 1; i < ladder.length; i++) {
      expect(
        ladder[i]![1],
        `--container-${ladder[i]![0]} (${ladder[i]![1]}rem) is narrower than ` +
          `--container-${ladder[i - 1]![0]} (${ladder[i - 1]![1]}rem)`,
      ).toBeGreaterThanOrEqual(ladder[i - 1]![1]);
    }
  });

  it('--container-4xl sits between the two declared content widths', () => {
    expect(rem(declared('4xl'))).toBeGreaterThan(utilityRem('.container-prose'));
    expect(rem(declared('4xl'))).toBeLessThanOrEqual(utilityRem('.container-wide'));
  });

  it('once max-w-4xl has no headline measure left, it must fold into the wide width', () => {
    /*
     * A consumer that sets its own type size beside max-w-4xl is a measure for
     * that headline, not a page shell, and retargeting the token would widen
     * it. While any survive, 56rem is the correct value. When the last one
     * becomes an explicit max-w-[56rem] this flips and demands the retarget
     * that takes the resolved-width census from 9 distinct widths to 8.
     */
    const measures: string[] = [];
    for (const m of CODE.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = m[1] ?? m[2] ?? '';
      if (!/\bmax-w-4xl\b/.test(cls)) continue;
      if (!/\b(?:[a-z0-9]+:)?text-(?:\[|xs\b|sm\b|base\b|lg\b|xl\b|\dxl\b)/.test(cls)) continue;
      measures.push(cls.replace(/\s+/g, ' ').slice(0, 100));
    }
    if (measures.length === 0) {
      expect(
        rem(declared('4xl')),
        'every max-w-4xl is a page shell now, so the 182 centred ones must land on the ' +
          'declared wide width like max-w-5xl/6xl/7xl already do. Retarget --container-4xl ' +
          'and drop the DU-14 resolved-width BASELINE from 9 to 8.',
      ).toBe(utilityRem('.container-wide'));
    } else {
      expect(
        rem(declared('4xl')),
        `${measures.length} max-w-4xl consumers still set their own type size and would be ` +
          `widened by a retarget:\n${measures.join('\n')}`,
      ).toBeLessThan(utilityRem('.container-wide'));
    }
  });
});

/* ═══ DU-10 — the lead paragraph is the third role, and it had no name ════ */

/**
 * `.prose-body` named the reading size and `.prose-meta` named the caption
 * size. The role between them — the deck under an h1, the one-sentence
 * standfirst that introduces a section — was never named, so every author
 * picked a step. Measured at HEAD across app/, components/ and lib/:
 *
 *   <p> at text-lg 143 · text-xl 51 · text-2xl 76      (270 across 156+ files)
 *
 * Three sizes for one role, one level up from the body copy the finding
 * measured at five. `.prose-lead` is `--text-lg`, the step 143 of those 270
 * already use, on the `--leading-relaxed` the rest of the prose range shares.
 *
 * The guards below are what stop it becoming a fourth body size: strictly
 * larger than `.prose-body`, strictly smaller than the smallest step any h1
 * archetype uses, and no arbitrary value.
 *
 * The last test is the other end of the finding — "12px/13.4px is below
 * comfortable reading size". A paragraph carrying a `max-w-*` reading measure
 * is body copy by construction, and eleven of them still render at `--text-xs`,
 * whose clamp floors at exactly the 12px legibility floor. Those are call-site
 * edits under app/, so this is a ceiling rather than a ban: it can only fall.
 */
describe('DU-10 — the lead paragraph has one declared size', () => {
  const size = (sel: string) =>
    resolveVar(/font-size:\s*([^;]+);/.exec(ruleFor(sel))?.[1]?.trim());
  /** The floor of a clamp() step, which is what a phone actually renders. */
  const floorPx = (v: string | undefined): number => {
    const c = /clamp\(\s*([\d.]+)rem/.exec(v ?? '');
    if (c) return parseFloat(c[1]!) * 16;
    const r = /([\d.]+)rem/.exec(v ?? '');
    return r ? parseFloat(r[1]!) * 16 : NaN;
  };

  it('.prose-lead is declared in globals.css', () => {
    expect(
      ruleFor('.prose-lead'),
      '.prose-lead missing — the deck under an h1 has no name, so its 270 call sites go on ' +
        'choosing between text-lg, text-xl and text-2xl for one role',
    ).toBeTruthy();
  });

  it('it is a declared step, not a hand-picked value', () => {
    const raw = /font-size:\s*([^;]+);/.exec(ruleFor('.prose-lead'))?.[1]?.trim();
    expect(raw, '.prose-lead must declare a font-size').toBeTruthy();
    expect(raw, 'a literal size here is the magic number the finding is about').toMatch(
      /^var\(--text-[\w-]+\)$/,
    );
    expect(resolveVar(raw), 'the step it names is not declared in @theme').toBeTruthy();
  });

  it('it cannot become a second body size — it is strictly larger than .prose-body', () => {
    expect(floorPx(size('.prose-lead'))).toBeGreaterThan(floorPx(size('.prose-body')));
    expect(floorPx(size('.prose-body'))).toBeGreaterThan(floorPx(size('.prose-meta')));
  });

  it('it cannot become a heading — it stays under the smallest step any h1 uses', () => {
    const recipeSrc = readFileSync(path.join(WEB, 'components/ui/heading-recipe.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const steps = [
      ...recipeSrc.matchAll(/(?:^|\s)(?:[a-z0-9]+:)?text-(xs|sm|base|lg|xl|\dxl)(?![\w-])/g),
    ].map((m) => m[1]!);
    expect(steps.length, 'no h1 size step parsed off the recipe').toBeGreaterThan(0);
    const smallest = Math.min(
      ...steps.map((s) => floorPx(THEME_VARS[`--text-${s}`] ?? ROOT_VARS[`--text-${s}`])),
    );
    expect(floorPx(size('.prose-lead'))).toBeLessThan(smallest);
  });

  it('the whole prose range shares one leading ratio', () => {
    const lead = /line-height:\s*([^;]+);/.exec(ruleFor('.prose-lead'))?.[1]?.trim();
    const body = /line-height:\s*([^;]+);/.exec(ruleFor('.prose-body'))?.[1]?.trim();
    expect(lead, '.prose-lead must declare a line-height').toBeTruthy();
    expect(lead).toBe(body);
  });

  it('body copy under a reading measure never floors below the metadata size', () => {
    /*
     * RATCHET — lower after every sweep, never raise. Measured at HEAD: of the
     * 237 <p> elements carrying a max-w-* reading measure, eleven are text-xs.
     * Those are the "12px body copy" half of DU-10 and every one is a
     * call-site edit under app/.
     *
     * 2026-08-23 sweep: enumerated and closed. Twelve survived to this pass
     * (one of the eleven had already gone, and two more had appeared). Each was
     * read before it was moved: the four truncated ids/emails in the admin
     * tables and the three pieces of legal micro-copy took `.prose-meta`, the
     * five that are section decks or a scholarly note took `.prose-body`.
     * Zero, and it stays zero.
     */
    const BASELINE = 0;
    const metaFloor = floorPx(size('.prose-meta'));
    expect(metaFloor, '.prose-meta lost its size, so this guard has no floor').toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const m of CODE.matchAll(/<p\b([^>]*)>/g)) {
      const attrs = m[1]!;
      if (!/\bmax-w-/.test(attrs)) continue;
      const step = /\btext-(xs|sm|base|lg|xl|\dxl)\b/.exec(attrs)?.[1];
      if (!step) continue;
      const f = floorPx(THEME_VARS[`--text-${step}`] ?? ROOT_VARS[`--text-${step}`]);
      if (f < metaFloor) {
        offenders.push(`text-${step} :: ${attrs.replace(/\s+/g, ' ').trim().slice(0, 80)}`);
      }
    }
    expect(
      offenders.length,
      `${offenders.length} measured paragraphs render below the ${metaFloor}px floor ` +
        `.prose-meta declares (ceiling ${BASELINE}). Use .prose-body, or .prose-meta if it ` +
        `is genuinely metadata.\n${offenders.slice(0, 15).join('\n')}`,
    ).toBeLessThanOrEqual(BASELINE);
  });
});

/* ═══ DU-03 — the CTA census must count every channel the fill arrives on ══ */

/**
 * The DU-03 ratchet (__tests__/cta-uniformity-ratchet.du03.test.ts) counts one
 * spelling of the resting primary fill: the literal class `bg-saffron-600`. At
 * HEAD that finds 213 hand-rolled CTAs. It is blind to three other spellings
 * that paint THE SAME PIXEL on the same kind of control:
 *
 *   `bg-orange-600`             — DU-09 aliased --color-orange-600 onto
 *                                 --color-saffron-600, so this IS #9e6229.
 *   `bg-[var(--color-primary)]` — --color-primary IS #9e6229 (DU-04 picked it).
 *   `style={{ background: 'var(--color-primary)' }}` — the same value again,
 *                                 and an inline style beats every class, so
 *                                 these are the un-tokenizable ones. DU-05
 *                                 ratcheted the identical defect for inline
 *                                 `fontFamily` on h1 down to 1.
 *
 * Two things follow, and both are why this is a guard rather than a note in a
 * handoff. First the backlog is understated: 213 counted against 77 uncounted
 * is a 36% shortfall, so "213 left" is not the size of DU-03. Second, and
 * worse, the ratchet is GAMEABLE in the wrong direction — rewriting
 * `className="… bg-saffron-600 …"` as `style={{ background:
 * 'var(--color-primary)' }}` lowers the DU-03 number while making that CTA
 * strictly harder to fix, and every suite stays green. A ceiling that can be
 * met by making the defect worse is the failure mode this sweep keeps hitting.
 *
 * So each channel gets its own ratchet, and the UNION gets one too — that last
 * one is the assertion laundering cannot satisfy.
 *
 * Comments are stripped before any scan: the pages and this file both quote CTA
 * class strings in prose.
 */
describe('DU-03 — every channel the resting primary fill arrives on is counted', () => {
  const relOf = (f: string) => path.relative(WEB, f).split(path.sep).join('/');
  const strip = (s: string) =>
    s
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  /** The DU-03 population rule: a labelled `<button|a|Link>` opened just above. */
  const labelled = (src: string, at: number, back: number): boolean =>
    /<(?:button|a|Link)\b/.test(src.slice(Math.max(0, at - back), at));

  /**
   * A fill written inside a `${cond ? … : …}` slot is a selected STATE on a
   * segmented control, not a resting CTA — the same carve-out the class ratchet
   * makes with its fillIsConditional().
   */
  const interpolated = (cls: string, re: RegExp): boolean => {
    const at = cls.search(re);
    if (at < 0) return false;
    for (const m of cls.matchAll(/\$\{[\s\S]*?\}/g)) {
      if (at > m.index! && at < m.index! + m[0].length) return true;
    }
    return false;
  };

  const SAFFRON = /\bbg-saffron-600(?![\w\-/])/;
  const ALIAS = /\bbg-(?:orange-600|\[var\(--color-primary\)\])(?![\w\-/])/;
  const INLINE = /background(?:Color)?\s*:\s*['"`]\s*var\(\s*--color-primary\s*(?:,[^)]*)?\)/;

  /** Class-spelled resting fills on a self-padded labelled control. */
  function scanClasses(src: string, fill: RegExp, skipSaffron: boolean): string[] {
    const hits: string[] = [];
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = m[1] ?? m[2] ?? '';
      if (!fill.test(cls)) continue;
      if (skipSaffron && SAFFRON.test(cls)) continue;
      if (!/\bpx-\d/.test(cls)) continue;
      if (/\b(active|selected|current)\w*\s*===?/i.test(cls)) continue;
      if (interpolated(cls, fill)) continue;
      if (!labelled(src, m.index!, 220)) continue;
      hits.push(cls.replace(/\s+/g, ' ').slice(0, 90));
    }
    return hits;
  }

  /** Inline-styled resting fills on a labelled control. */
  function scanInline(src: string): string[] {
    const hits: string[] = [];
    for (const m of src.matchAll(/style=\{\{[^{}]*\}\}/g)) {
      const seg = m[0];
      if (!INLINE.test(seg)) continue;
      if (seg.includes('?')) continue;
      if (!labelled(src, m.index!, 320)) continue;
      hits.push(seg.replace(/\s+/g, ' ').slice(0, 90));
    }
    return hits;
  }

  const alias: string[] = [];
  const inline: string[] = [];
  const classic: string[] = [];
  for (const f of sourceFiles()) {
    const src = strip(readFileSync(f, 'utf8'));
    for (const h of scanClasses(src, ALIAS, true)) alias.push(`${relOf(f)} :: ${h}`);
    for (const h of scanClasses(src, SAFFRON, false)) classic.push(`${relOf(f)} :: ${h}`);
    for (const h of scanInline(src)) inline.push(`${relOf(f)} :: ${h}`);
  }

  it('the three spellings resolve to one pixel, so they are one role', () => {
    // If they ever stop being the same colour, this block is measuring two
    // different things and the union ceiling below means nothing.
    const saffron = THEME_VARS['--color-saffron-600'];
    expect(saffron, '--color-saffron-600 missing from @theme').toMatch(/^#/);
    expect(
      resolveVar(THEME_VARS['--color-orange-600']),
      'DU-09 aliased orange onto the saffron ramp; if that is undone, bg-orange-600 is a ' +
        'second brand orange again and belongs to DU-09, not here',
    ).toBe(saffron);
    expect(
      resolveVar(ROOT_VARS['--color-primary']),
      '--color-primary is the token DU-04 picked as THE resting fill; it has to be the ' +
        'same weight the CTA class paints',
    ).toBe(saffron);
  });

  it('the detectors bite on the exact shapes they are written for', () => {
    // Proved against fixtures, not against the live count: a "> 0" assertion on
    // real offenders becomes a landmine the day the backlog is cleared.
    expect(
      scanClasses('<button className="rounded bg-orange-600 px-4 py-2 text-white">Save</button>', ALIAS, true),
    ).toHaveLength(1);
    expect(
      scanClasses('<Link href="/x" className="px-4 py-2 bg-[var(--color-primary)] text-white">Go</Link>', ALIAS, true),
    ).toHaveLength(1);
    expect(
      scanInline("<a href=\"/x\" className=\"px-4 py-2\" style={{ background: 'var(--color-primary)' }}>Go</a>"),
    ).toHaveLength(1);

    // …and must NOT bite on a selected filter chip, which is a state, not a CTA.
    expect(
      scanClasses(
        "<button className={`px-3 py-1 ${on ? 'bg-[var(--color-primary)] text-white' : ''}`}>All</button>",
        ALIAS,
        true,
      ),
    ).toEqual([]);

    // …nor on the highlight token, which is a different value.
    expect(
      scanInline("<button className=\"px-4 py-2\" style={{ background: 'var(--color-primary-highlight)' }}>x</button>"),
    ).toEqual([]);

    // …and the classic scan must still reproduce the DU-03 population, or the
    // union ceiling below is quietly counting fewer things than it claims.
    expect(scanClasses('<a className="bg-saffron-600 px-5 py-2">Book</a>', SAFFRON, false)).toHaveLength(1);
  });

  it('the aliased-class channel only shrinks', () => {
    /*
     * RATCHET. Measured at HEAD: 10 — five `bg-[var(--color-primary)]` in the
     * gaushala portal (cows x2, donations, profile, volunteers) and five
     * `bg-orange-600` in app/org (members, page, settings) and
     * app/pancha-bhoota (index, [slug]). Every one is a call-site edit outside
     * the design lane; the target is buttonClass('primary','md') like the 213.
     *
     * 2026-08-23 sweep: all 10 adopted buttonClass('primary','md'). The
     * channel is closed and may not reopen — a new aliased fill on a padded
     * control fails here immediately.
     */
    const BASELINE = 0;
    expect(
      alias.length,
      `${alias.length} primary CTAs paint the fill with an aliased class the DU-03 ratchet ` +
        `cannot see (ceiling ${BASELINE}). Same pixel, same role — use ` +
        "buttonClass('primary','md') from components/ui/button-recipe.\n" +
        alias.join('\n'),
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('the inline-style channel only shrinks', () => {
    /*
     * RATCHET, and the one that should reach zero first: an inline style beats
     * every class, so these CTAs cannot be moved by ANY token change — the
     * recipe is powerless against them. That is exactly the argument DU-05 made
     * when it ratcheted inline `fontFamily` on h1 down to 1.
     *
     * Measured at HEAD: 67 across 38 files, heaviest in app/wellness (15),
     * app/yatra + /yatra-packages (17) and app/pujas/home-puja + /marriage (10).
     *
     * 2026-08-23 sweep: 65 of the 67 adopted buttonClass('primary','md') and
     * their style objects are gone. The 2 survivors are square icon-only
     * controls — the 56px round play/pause on /wellness/meditation and the
     * 44px send button in AiChat — where the recipe's `px-5` and `rounded-lg`
     * would reshape an icon target that has no label to pad. They need a
     * genuine icon-button variant on the recipe (components/ui, not this
     * lane), so they stay counted rather than laundered into a class.
     */
    const BASELINE = 2;
    expect(
      inline.length,
      `${inline.length} primary CTAs paint the fill with an inline style (ceiling ` +
        `${BASELINE}). An inline style outranks every class, so no token and no recipe can ` +
        "ever reach these. Delete the style object and use buttonClass('primary','md').\n" +
        [...new Set(inline.map((s) => s.split(' :: ')[0]))].slice(0, 20).join('\n'),
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('the total cannot be lowered by moving a CTA between channels', () => {
    /*
     * THE ANTI-LAUNDERING CEILING, and the reason the three subtotals above are
     * not enough on their own. Rewriting one `bg-saffron-600` CTA as an inline
     * style lowers the DU-03 ratchet by one and raises the inline ratchet by
     * one — both ceilings still hold, CI is green, and the app got worse. This
     * total is flat under that move and falls only when a CTA adopts the
     * recipe.
     *
     * Measured at HEAD: 213 class + 10 aliased + 67 inline = 290.
     * 2026-08-23 sweep: 65 inline CTAs adopted the recipe → 213 + 10 + 2 = 225.
     * Same sweep, class channels: 212 + 10 more adopted it → 1 + 0 + 2 = 3.
     * The 3 that remain are named in the three subtotal ratchets above: one
     * `<span>` badge the detector mis-attributes to the <Link> above it, and
     * two square icon-only controls with no label to pad.
     */
    const BASELINE = 3;
    const total = classic.length + alias.length + inline.length;
    expect(
      total,
      `${total} hand-rolled primary CTAs across all three fill channels ` +
        `(${classic.length} bg-saffron-600 + ${alias.length} aliased + ${inline.length} ` +
        `inline), ceiling ${BASELINE}. This number falls only when a CTA adopts ` +
        'buttonClass(); it does not move when one is respelled.',
    ).toBeLessThanOrEqual(BASELINE);
  });
});

/* ═══ DU-10 — a prose utility silently outranks the size class beside it ══ */

/**
 * `.prose-body` / `.prose-meta` / `.prose-lead` are declared in a stylesheet
 * that opens no `@layer` of its own, while `@import "tailwindcss"` puts every
 * utility inside `@layer utilities`. Unlayered beats layered regardless of
 * specificity or source order, so those three classes outrank `text-xs` …
 * `text-2xl` AND every responsive step of them.
 *
 * That is deliberate — it is what lets one class name end the size sprawl
 * without an `!important` — but it has a sharp edge the sweep has to survive: a
 * paragraph written `className="prose-lead text-2xl"` READS as 24px and RENDERS
 * at 18px, and `className="prose-body md:text-lg"` reads as a responsive lift
 * that never happens. The DU-10 handoff states the rule in prose ("remove the
 * old text-* when adding .prose-lead, do not stack them") and prose is not a
 * guard: 270 lead paragraphs are still to be converted, by whichever lane owns
 * each page, and a stacked leftover is invisible in review.
 *
 * Zero today. Held at zero.
 */
describe('DU-10 — a prose utility is never stacked on the size class it beats', () => {
  const relOf = (f: string) => path.relative(WEB, f).split(path.sep).join('/');
  const strip = (s: string) =>
    s
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  /** Every `text-<step>` in a class string, responsive prefixes included. */
  const SIZE = /(?:^|\s)(?:[a-z0-9]+:)?(text-(?:xs|sm|base|lg|xl|\dxl))(?![\w-])/g;
  const PROSE = /\bprose-(?:body|meta|lead)\b/;

  function stacked(src: string): string[] {
    const hits: string[] = [];
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = m[1] ?? m[2] ?? '';
      if (!PROSE.test(cls)) continue;
      const sizes = [...cls.matchAll(SIZE)].map((s) => s[1]!);
      if (sizes.length) {
        hits.push(`${sizes.join(' ')}  ::  ${cls.replace(/\s+/g, ' ').slice(0, 90)}`);
      }
    }
    return hits;
  }

  it('the premise holds: globals.css opens no layer, so these classes outrank utilities', () => {
    expect(
      (CSS_NC.match(/@layer\b/g) ?? []).length,
      'globals.css declares an @layer. Everything in this stylesheet just dropped below ' +
        'Tailwind utilities in the cascade: .prose-body now LOSES to text-lg, the tap-target ' +
        'floor loses to h-9, and .container-wide loses to max-w-7xl. None of that is visible ' +
        'in a diff of the call sites.',
    ).toBe(0);
  });

  it('the detector bites (a regex regression cannot vacuously pass this)', () => {
    expect(stacked('<p className="prose-lead text-2xl max-w-2xl">x</p>')).toHaveLength(1);
    expect(stacked('<p className="prose-body md:text-lg">x</p>')).toHaveLength(1);
    expect(stacked('<p className="prose-body max-w-2xl text-surface-600">x</p>')).toEqual([]);
    expect(stacked('<p className="text-lg max-w-2xl">x</p>')).toEqual([]);
  });

  it('no element carries a prose utility and a size utility at once', () => {
    const offenders: string[] = [];
    for (const f of sourceFiles()) {
      const src = strip(readFileSync(f, 'utf8'));
      for (const h of stacked(src)) offenders.push(`${relOf(f)} :: ${h}`);
    }
    expect(
      offenders,
      `${offenders.length} elements stack a Tailwind size on a prose utility. The prose ` +
        'utility is unlayered and wins, so the size class beside it is dead text describing ' +
        'a render that does not happen. Delete the text-* — that is the whole point of the ' +
        'swap.\n' + offenders.slice(0, 20).join('\n'),
    ).toEqual([]);
  });
});
