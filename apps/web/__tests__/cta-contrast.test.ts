/**
 * A11Y-10 — the filled CTAs and accent badges paint white text on fills that
 * do not reach 4.5:1.
 *
 * Pixel-measured on the live pages (prod sweep 2026-08-12), each read off the
 * element's own painted fill:
 *   /pujas "Book Now"                #ffffff on #b87333 = 3.79:1
 *   cookie banner "Accept all"       #ffffff on #b87333 = 3.79:1   (every page)
 *   badge on /pujas and /store       #ffffff on #0ea5e9 = 2.77:1  (ganga-blue)
 *                                    #ffffff on #d4a438 = 2.29:1  (temple-gold)
 *                                    #ffffff on #ec4899 = 3.53:1  (lotus-pink)
 *                                    #ffffff on #16a34a = 3.30:1  (tulsi-green)
 *   /auth/login "Sign In" (passing)  #ffffff on #9e6229 = 4.96:1  (saffron-600)
 *
 * The failing hexes come from the design tokens, so this suite derives the
 * failing set from app/globals.css rather than hard-coding it, then asserts
 * that the three surfaces the sweep measured never pair a failing fill with
 * white text.
 *
 * LANE NOTE: app/globals.css, app/admin/** and app/pujas/book/page.tsx are
 * owned by other agents in this sweep, so the same token pairing survives in
 * files outside SURFACES. Widen SURFACES once those land.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);
const read = (rel: string) => readFileSync(root(rel), 'utf8');

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
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
}

const AA_BODY = 4.5;
const WHITE = '#ffffff';

/* ── Token table straight out of globals.css ─────────────────────────────── */

const css = read('app/globals.css');

/** Every `--color-<name>: #hex;` in the stylesheet → { name: hex }. */
const TOKENS: Record<string, string> = {};
for (const m of css.matchAll(/--color-([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) {
  TOKENS[m[1]!] = m[2]!.toLowerCase();
}

/** Tailwind palette colours used as fills that this file also knows about. */
const EXTRA: Record<string, string> = {
  'purple-600': '#9333ea',
  'purple-700': '#7e22ce',
};

const PALETTE: Record<string, string> = { ...TOKENS, ...EXTRA, white: WHITE };

/** Fill tokens that cannot legally carry white text. Derived, not listed. */
const FAILS_WITH_WHITE = Object.entries(PALETTE)
  .filter(([name, hex]) => !name.startsWith('surface-') && contrast(hex, WHITE) < AA_BODY)
  .map(([name]) => name);

/**
 * The three surfaces the sweep pixel-measured, plus app/not-found.tsx — its
 * "Back to Home" CTA carries the same inline `background: var(--color-primary)`
 * over white text and is reachable from every route.
 */
const SURFACES = [
  'app/pujas/(index)/page.tsx',
  'app/store/page.tsx',
  'components/CookieBanner.tsx',
  'app/not-found.tsx',
];

/** Every quoted class string in a source file (className="…" and `…`). */
function classStrings(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:className\s*=\s*)?["'`]([^"'`]*\b(?:bg|text)-[^"'`]*)["'`]/g)) {
    out.push(m[1]!);
  }
  return out;
}

/**
 * True when the class string uses `util` as a whole utility. Variant prefixes
 * (`hover:`, `group-hover:`) count; opacity modifiers (`bg-white/20`) do not —
 * a translucent fill composites over whatever is behind it and cannot be
 * judged from source.
 */
const has = (s: string, util: string) =>
  new RegExp(`(?:^|\\s|:)${util}(?![\\w\\-/])`).test(s);

describe('A11Y-10 — the token table itself', () => {
  it('reproduces the measured ratios, so the failing set is real', () => {
    expect(contrast(TOKENS['saffron-500']!, WHITE)).toBe(3.79);
    expect(contrast(TOKENS['saffron-600']!, WHITE)).toBe(4.96);
    expect(contrast(TOKENS['ganga-blue']!, WHITE)).toBe(2.77);
    expect(contrast(TOKENS['temple-gold']!, WHITE)).toBe(2.29);
    expect(contrast(TOKENS['lotus-pink']!, WHITE)).toBe(3.53);
    expect(contrast(TOKENS['tulsi-green']!, WHITE)).toBe(3.3);
  });

  it('offers a passing dark weight for every failing accent', () => {
    for (const base of ['ganga-blue', 'tulsi-green', 'lotus-pink']) {
      expect(contrast(TOKENS[`${base}-dark`]!, WHITE)).toBeGreaterThanOrEqual(AA_BODY);
    }
  });
});

describe('A11Y-10 — no white text on a sub-4.5:1 fill', () => {
  for (const file of SURFACES) {
    it(`${file} pairs no failing fill with white text`, () => {
      const violations: string[] = [];
      for (const s of classStrings(read(file))) {
        if (!has(s, 'text-white')) continue;
        for (const token of FAILS_WITH_WHITE) {
          if (has(s, `bg-${token}`)) {
            violations.push(
              `bg-${token} (${contrast(PALETTE[token]!, WHITE)}:1) + text-white → "${s.slice(0, 80)}"`,
            );
          }
        }
      }
      expect(violations).toEqual([]);
    });

    it(`${file} does not override a button fill with --color-primary inline`, () => {
      const src = read(file);
      const inline = [...src.matchAll(/style=\{\{[^}]*\}\}/g)].map((m) => m[0]);
      const bad = inline.filter((s) => /background\s*:\s*['"]?var\(--color-primary[,)]/.test(s));
      expect(
        bad,
        '--color-primary is saffron-500 (3.79:1) — an inline background beats the bg-saffron-600 class',
      ).toEqual([]);
    });
  }
});

describe('A11Y-10 — /pujas category badges', () => {
  const src = read('app/pujas/(index)/page.tsx');

  /** TAG_COLORS entries carry their own fill AND text colour. */
  function tagColorEntries(): string[] {
    const block = /const TAG_COLORS\s*=\s*\[([\s\S]*?)\]/.exec(src);
    expect(block, 'TAG_COLORS not found in app/pujas/(index)/page.tsx').not.toBeNull();
    return [...block![1]!.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]!);
  }

  it('every rotation entry reaches 4.5:1 for its own text colour', () => {
    const failures: string[] = [];
    for (const entry of tagColorEntries()) {
      const fill = /(?:^|\s)bg-([\w-]+)/.exec(entry)?.[1];
      const text = /(?:^|\s)text-([\w-]+)/.exec(entry)?.[1];
      expect(fill, `no bg-* in TAG_COLORS entry "${entry}"`).toBeTruthy();
      expect(text, `TAG_COLORS entry "${entry}" must carry its own text colour`).toBeTruthy();

      const fillHex = PALETTE[fill!];
      const textHex = PALETTE[text!];
      expect(fillHex, `unknown fill token bg-${fill}`).toBeTruthy();
      expect(textHex, `unknown text token text-${text}`).toBeTruthy();

      const ratio = contrast(fillHex!, textHex!);
      if (ratio < AA_BODY) failures.push(`${entry} = ${ratio}:1`);
    }
    expect(failures).toEqual([]);
  });

  it('the badge element no longer hard-codes text-white over the rotation', () => {
    expect(src).not.toMatch(/\$\{puja\.tagColor\}\s+text-white/);
  });

  // CM-09 renamed this control from "Book Now" (which promised a form and
  // delivered an article) to "View details", and moved the href onto the card
  // wrapper so the whole card is the tap target. The contrast guarantee is
  // unchanged: the pill is still saffron-600 with white text.
  it('the card CTA is painted with the passing saffron weight', () => {
    const cta = /View details/.exec(src);
    expect(cta, 'card CTA not found').not.toBeNull();
    const around = src.slice(Math.max(0, cta!.index - 400), cta!.index);
    expect(around).toMatch(/bg-saffron-(600|700)/);
    expect(around).not.toMatch(/var\(--color-primary\)/);
  });
});

describe('A11Y-10 — /store accent text', () => {
  const src = read('app/store/page.tsx');

  /**
   * SUPERSEDED CONTRACT — rewritten deliberately for LEG-17.
   *
   * This case used to assert the discount badge EXISTS and is painted with the
   * dark green:
   *
   *     const badge = /-\{product\.discount\}%/.exec(src);
   *     expect(badge).not.toBeNull();
   *
   * The badge has since been removed outright. It rendered `product.discount`,
   * a hardcoded seed field in lib/products.ts computed against a
   * `compareAtPrice` that no product was ever sold at — a fabricated discount
   * under the Consumer Protection Act 2019, and one carrying no end date, so it
   * could never expire on its own. A contrast guard must not require the
   * presence of a control that a consumer-protection fix deleted, so the
   * existence assertion is inverted. The A11Y-10 contrast rule itself is not
   * weakened: it is restated in the failure message, and the sibling case below
   * still forbids the bare 3.30:1 `text-tulsi-green` anywhere on this page.
   *
   * Block comments are stripped before scanning: the removal site in
   * app/store/page.tsx carries an explanatory note that names the badge, and a
   * comment-blind source scan would read that prose as live markup.
   */
  it('renders no fabricated discount badge (LEG-17 removed it)', () => {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(
      /-\{product\.discount\}%/.test(code),
      'the fabricated "-NN%" discount badge is back on /store. It measured a ' +
        'hardcoded seed discount against a reference price no product was ever ' +
        'sold at. If a real, dated discount is ever reintroduced, paint it ' +
        'bg-tulsi-green-dark — bare tulsi-green is #16a34a, 3.30:1 with white ' +
        'text, below the 4.5:1 floor.',
    ).toBe(false);
  });

  it('small green copy (rating, free delivery) uses the dark green', () => {
    const bare = [...src.matchAll(/text-tulsi-green(?![\w-])/g)];
    expect(
      bare.length,
      'text-tulsi-green is #16a34a — 3.1:1 on the card tint at 12px',
    ).toBe(0);
  });
});
