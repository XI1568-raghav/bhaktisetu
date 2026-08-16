/**
 * [I-06 / I18N-06] Every script the product advertises must have a webfont.
 *
 * The prod sweep measured 11 of 20 temple names rendering in a script with no
 * loaded font, and Devanagari / Tamil / Telugu / Bengali all falling through to
 * whatever the operating system happened to ship. The footer advertises five
 * Indian languages on every page, so "the OS will have something" is the
 * product's actual typography strategy for four writing systems.
 *
 * WHY A LOADED FAMILY IS NOT ENOUGH, AND WHAT THIS TEST ACTUALLY CHECKS.
 * app/layout.tsx already downloaded Noto Sans Devanagari before this fix, and
 * Devanagari still painted in an OS font — because the only stack that named
 * it was `--font-devanagari`, reachable only through globals.css's
 * `html[lang="hi"]` rule. The root layout renders `lang="en"` on the server for
 * every route, so on the 1,780 English pages that carry Devanagari temple names
 * that rule never matched and the downloaded woff2 painted nothing. That is the
 * same defect PERF-03 recorded from the other side ("201.9 KB of font bytes,
 * rendered in Arial anyway").
 *
 * So this test does not ask "is a Devanagari family imported". It RESOLVES the
 * three stacks a page can actually inherit — `--font-body`, `--font-display`,
 * `--font-serif` in globals.css — one `var()` at a time, through the CSS
 * variables next/font declares in app/layout.tsx, and asserts that each of the
 * four scripts is reachable from all three. A face that is downloaded but not
 * reachable fails here exactly as loudly as one that is missing.
 *
 * next/font/google is the required delivery mechanism: it fetches the woff2 at
 * BUILD time and self-hosts it under /_next/static, so there is no runtime
 * request to fonts.googleapis.com. That distinction is load-bearing here —
 * PERF-03 removed a CDN stylesheet (api.fontshare.com) that had started
 * answering 200 with a comment and zero @font-face rules, silently un-styling
 * the whole site.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { SUPPORTED_LOCALES } from '../../lib/i18n/locales';

const WEB = path.resolve(__dirname, '../..');
const LAYOUT = path.join(WEB, 'app/layout.tsx');
const GLOBALS = path.join(WEB, 'app/globals.css');

/**
 * Strip comments before parsing anything. Four guards in the 2026-08 sweep
 * matched their own documentation; this file's own prose names every font
 * variable it asserts on, so an unstripped scan would pass on the comment
 * above rather than on the code.
 */
function stripJs(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
function stripCss(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

const layoutSrc = stripJs(fs.readFileSync(LAYOUT, 'utf8'));
const globalsSrc = stripCss(fs.readFileSync(GLOBALS, 'utf8'));

/* ── what app/layout.tsx loads ────────────────────────────────────────────── */

interface LoadedFace {
  /** The next/font/google export, e.g. `Noto_Sans_Tamil`. */
  family: string;
  /** The CSS custom property it publishes, if any. */
  variable: string | null;
  subsets: string[];
  preload: boolean | null;
  /** Verbatim entries next/font appends after the family (see below). */
  fallback: string[];
}

/**
 * Parse `const x = Family({ … });` calls whose callee was imported from
 * `next/font/google`. Brace-matched rather than regexed end-to-end so a nested
 * array or object inside the options cannot truncate the match.
 */
function parseLoadedFaces(src: string): LoadedFace[] {
  const importMatch = /import\s*\{([^}]*)\}\s*from\s*["']next\/font\/google["']/.exec(src);
  if (!importMatch) return [];
  const imported = importMatch[1]!
    .split(',')
    .map((s) => s.trim().split(/\s+as\s+/)[0]!.trim())
    .filter(Boolean);

  const faces: LoadedFace[] = [];
  for (const family of imported) {
    const call = new RegExp(`\\b${family}\\s*\\(\\s*\\{`, 'g');
    let m: RegExpExecArray | null;
    while ((m = call.exec(src))) {
      const open = src.indexOf('{', m.index);
      let depth = 0;
      let end = open;
      for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const opts = src.slice(open, end + 1);
      const list = (key: string): string[] => {
        const lm = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(opts);
        if (!lm) return [];
        return [...lm[1]!.matchAll(/["']([^"']+)["']/g)].map((x) => x[1]!);
      };
      const variable = /variable\s*:\s*["'](--[\w-]+)["']/.exec(opts)?.[1] ?? null;
      const preloadRaw = /preload\s*:\s*(true|false)/.exec(opts)?.[1];
      faces.push({
        family,
        variable,
        subsets: list('subsets'),
        preload: preloadRaw === undefined ? null : preloadRaw === 'true',
        fallback: list('fallback'),
      });
    }
  }
  return faces;
}

const FACES = parseLoadedFaces(layoutSrc);

/**
 * next/font emits the variable as
 *   `--x: '<hashed family>', '<metric fallback>', …fallback`
 * with the `fallback` entries inserted VERBATIM and unquoted
 * (next/dist/build/webpack/loaders/next-font-loader/postcss-next-font.js:110-116
 * — `[formatFamily(fontFamily), ...adjustFontFallbackFamily, ...fallbackFonts]
 * .join(', ')`). That is what lets one family's variable carry `var(--other)`
 * and so extend a stack it does not own.
 */
function faceStack(face: LoadedFace): string[] {
  return [`@${face.family}`, ...face.fallback];
}

/* ── resolving a globals.css stack down to concrete faces ─────────────────── */

/** `--name: value;` declarations anywhere in the comment-free CSS. */
const CSS_VARS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const m of globalsSrc.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]/g)) {
    if (!(m[1]! in out)) out[m[1]!] = m[2]!.trim();
  }
  return out;
})();

const FACE_BY_VAR = new Map(FACES.filter((f) => f.variable).map((f) => [f.variable!, f]));

/**
 * Expand a font stack into its leaf entries, following `var()` through both the
 * globals.css tokens and the variables app/layout.tsx publishes. Depth-capped
 * so a token cycle fails as a bad stack instead of hanging the suite.
 */
function resolveStack(value: string, depth = 0): string[] {
  if (depth > 12) return ['@@cycle'];
  const out: string[] = [];
  for (const part of value.split(',').map((s) => s.trim()).filter(Boolean)) {
    const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(part);
    if (!ref) {
      out.push(part);
      continue;
    }
    const name = ref[1]!;
    const face = FACE_BY_VAR.get(name);
    if (face) {
      for (const entry of faceStack(face)) out.push(...resolveStack(entry, depth + 1));
      continue;
    }
    if (CSS_VARS[name]) {
      out.push(...resolveStack(CSS_VARS[name]!, depth + 1));
      continue;
    }
    out.push(`@@undeclared(${name})`);
  }
  return out;
}

/** The scripts each supported locale is written in. */
const SCRIPT_FOR_LOCALE: Record<string, string> = {
  en: 'latin',
  hi: 'devanagari',
  mr: 'devanagari',
  ta: 'tamil',
  te: 'telugu',
  bn: 'bengali',
};

const INDIC_SCRIPTS = ['devanagari', 'tamil', 'telugu', 'bengali'] as const;

/** Which loaded faces cover a script, by the `subsets` they declare. */
function facesForScript(script: string): LoadedFace[] {
  return FACES.filter((f) => f.subsets.includes(script));
}

/** Stacks a page can inherit without opting into anything. */
const INHERITED_STACKS = ['--font-body', '--font-display', '--font-serif'];

describe('[I-06/I18N-06] every advertised script has a self-hosted webfont', () => {
  it('app/layout.tsx loads its faces through next/font/google, not a CDN stylesheet', () => {
    expect(FACES.length, 'no next/font/google faces parsed out of app/layout.tsx').toBeGreaterThan(
      0,
    );
    for (const host of ['fonts.googleapis.com', 'fonts.gstatic.com', 'api.fontshare.com']) {
      expect(
        layoutSrc.includes(host),
        `${host} is a runtime font request — next/font self-hosts the woff2 at build time`,
      ).toBe(false);
    }
  });

  it.each(INDIC_SCRIPTS)('a downloaded face declares the %s subset', (script) => {
    const covering = facesForScript(script).map((f) => f.family);
    expect(
      covering,
      `no next/font family in app/layout.tsx declares subsets: ['${script}'], so every ` +
        `${script} glyph on the site paints in whatever the OS happens to ship`,
    ).not.toEqual([]);
  });

  it('every locale the product advertises is written in a script the app loads', () => {
    const missing = SUPPORTED_LOCALES.filter((l) => {
      const script = SCRIPT_FOR_LOCALE[l];
      return !script || facesForScript(script).length === 0;
    });
    expect(
      missing,
      'the footer offers these languages on every page but loads no font for their script',
    ).toEqual([]);
  });
});

describe('[I-06/I18N-06] the Indic faces are REACHABLE from the stacks a page inherits', () => {
  it.each(INHERITED_STACKS)('%s resolves to at least one downloaded face', (token) => {
    const value = CSS_VARS[token];
    expect(value, `${token} is not declared in app/globals.css`).toBeTruthy();
    const leaves = resolveStack(value!);
    expect(
      leaves.filter((l) => l.startsWith('@') && !l.startsWith('@@')),
      `${token} = ${value} resolves to ${JSON.stringify(leaves)} — no next/font face in it`,
    ).not.toEqual([]);
  });

  for (const token of INHERITED_STACKS) {
    it.each(INDIC_SCRIPTS)(`${token} reaches a %s face`, (script) => {
      const leaves = resolveStack(CSS_VARS[token] ?? '');
      const covering = new Set(facesForScript(script).map((f) => `@${f.family}`));
      const hit = leaves.some((l) => covering.has(l));
      expect(
        hit,
        `${token} = ${CSS_VARS[token]} resolves to ${JSON.stringify(leaves)}, which contains no ` +
          `${script} face. A downloaded family that no inherited stack names paints nothing: ` +
          `that is exactly how Noto Sans Devanagari shipped for months behind the ` +
          `html[lang="hi"] rule while the server rendered lang="en" on every route.`,
      ).toBe(true);
    });
  }

  it('no resolved stack points at a variable nothing declares', () => {
    // A dangling var() makes the WHOLE font-family declaration invalid at
    // computed-value time, which is worse than the wrong font: the element
    // silently drops to the inherited family.
    const dangling: string[] = [];
    for (const token of INHERITED_STACKS) {
      for (const leaf of resolveStack(CSS_VARS[token] ?? '')) {
        if (leaf.startsWith('@@')) dangling.push(`${token} → ${leaf}`);
      }
    }
    expect(dangling).toEqual([]);
  });
});

describe('[I-06/I18N-06] the Indic faces cost nothing on the pages that never use them', () => {
  it('no Indic face is preloaded on every route', () => {
    // next/font preloads by default, and a face imported by the ROOT layout is
    // preloaded on all ~1,785 routes. Devanagari/Tamil/Telugu/Bengali are
    // needed by a handful of them; the browser fetches a webfont only when a
    // glyph actually needs it, so opting out of preload is the difference
    // between "free" and "a font download on every page in the product".
    const preloaded = FACES.filter(
      (f) => INDIC_SCRIPTS.some((s) => f.subsets.includes(s)) && f.preload !== false,
    ).map((f) => f.family);
    expect(
      preloaded,
      'these Indic faces preload on every route; pass preload: false so they download on demand',
    ).toEqual([]);
  });

  it('the Latin faces still preload — they paint above the fold on every page', () => {
    const latin = FACES.filter(
      (f) => f.subsets.includes('latin') && !INDIC_SCRIPTS.some((s) => f.subsets.includes(s)),
    );
    expect(latin.length).toBeGreaterThan(0);
    for (const f of latin) {
      expect(f.preload, `${f.family} must not opt out of preload`).not.toBe(false);
    }
  });
});
