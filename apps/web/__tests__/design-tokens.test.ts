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

/** Distinct whole utilities matching a pattern, as they appear in source. */
function utilities(re: RegExp): string[] {
  return [...new Set([...SOURCE.matchAll(re)].map((m) => m[0]))].sort();
}

/* ═══ DU-01 / DU-06 / DU-11 — font tokens ═════════════════════════════════ */

describe('DU-01/06/11 — brand font tokens live in the namespace Tailwind reads', () => {
  /** next/font `variable:` names actually declared in app/layout.tsx. */
  const LOADED = new Set(
    [...layout.matchAll(/variable:\s*["'](--[\w-]+)["']/g)].map((m) => m[1]!),
  );

  it('layout.tsx really does download the faces the tokens will point at', () => {
    expect([...LOADED].sort()).toEqual([
      '--font-noto-devanagari',
      '--font-noto-sans',
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
