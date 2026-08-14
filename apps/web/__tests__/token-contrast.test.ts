import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * WCAG 2.1 contrast regression guard for the design-token layer.
 *
 * Findings this locks down (prod sweep 2026-08-12):
 *   A11Y-01 — --color-surface-500 / --color-text-muted (the default muted-text
 *             token, 1,236 uses across 236 files) measured 3.78–4.34:1 on the
 *             light surfaces and 3.32:1 on the dark footer.
 *   A11Y-02 — --color-surface-400 / --color-text-faint is the global
 *             ::placeholder colour and measured 2.05:1 on #faf9f6.
 *   A11Y-05 — the footer copyright line (text-surface-600 on #2a2520)
 *             measured 1.60:1.
 *
 * The tokens are the fix surface for all three, so the assertions read the
 * real hex values straight out of globals.css rather than a duplicated table.
 */

const CSS_PATH = path.resolve(__dirname, '../app/globals.css');
const css = readFileSync(CSS_PATH, 'utf8');

/* ── WCAG 2.1 relative luminance + contrast ratio ─────────────────────────── */

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Rounded the way an audit tool reports it, so failure messages are readable. */
const ratio = (fg: string, bg: string) => Math.round(contrast(fg, bg) * 100) / 100;

/* ── Minimal CSS block reader (brace-counting, no dependency) ─────────────── */

function block(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `selector \`${selector}\` not found in app/globals.css`).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated block for \`${selector}\``);
}

function hexVar(scope: string, name: string): string {
  const m = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`).exec(scope);
  expect(m, `\`${name}\` (hex value) not found in the expected block`).not.toBeNull();
  return m![1].toLowerCase();
}

const THEME = block('@theme');
const ROOT = block('\n:root {');
const PLACEHOLDER = block('::placeholder');
const FOOTER_SELECTOR = 'footer[aria-labelledby="footer-heading"]';

/** Resolve `color: var(--x)` inside a rule against the :root token block. */
function resolvedColor(rule: string): string {
  const direct = /color\s*:\s*(#[0-9a-fA-F]{3,8})/.exec(rule);
  if (direct) return direct[1].toLowerCase();
  const viaVar = /color\s*:\s*var\(\s*(--[\w-]+)\s*\)/.exec(rule);
  expect(viaVar, 'rule declares no resolvable `color`').not.toBeNull();
  return hexVar(ROOT, viaVar![1]);
}

/* ── Backgrounds these tokens are actually rendered on ────────────────────── */

const LIGHT_SURFACES: Record<string, string> = {
  'surface-2 #ffffff': '#ffffff',
  'surface-100 (cards) #faf9f6': '#faf9f6',
  'surface-50 (body bg) #f5f3ef': '#f5f3ef',
  'surface-200 (section bands) #ede9e3': '#ede9e3',
};

/** app/layout.tsx renders the site footer as `bg-[#2a2520]`. */
const FOOTER_BG = '#2a2520';

const AA_BODY = 4.5;

describe('design tokens meet WCAG 2.1 AA contrast', () => {
  describe('A11Y-01 — muted text token on every light surface', () => {
    const scaleToken = hexVar(THEME, '--color-surface-500');
    const semanticToken = hexVar(ROOT, '--color-text-muted');

    it('--color-surface-500 and --color-text-muted stay in sync', () => {
      expect(semanticToken).toBe(scaleToken);
    });

    for (const [label, bg] of Object.entries(LIGHT_SURFACES)) {
      it(`--color-surface-500 reaches ${AA_BODY}:1 on ${label}`, () => {
        expect(
          ratio(scaleToken, bg),
          `${scaleToken} on ${bg} — body text needs ${AA_BODY}:1`,
        ).toBeGreaterThanOrEqual(AA_BODY);
      });
    }
  });

  describe('A11Y-02 — faint text token and the global ::placeholder colour', () => {
    const faint = hexVar(THEME, '--color-surface-400');

    it('--color-surface-400 and --color-text-faint stay in sync', () => {
      expect(hexVar(ROOT, '--color-text-faint')).toBe(faint);
    });

    for (const [label, bg] of Object.entries(LIGHT_SURFACES)) {
      it(`--color-surface-400 reaches ${AA_BODY}:1 on ${label}`, () => {
        expect(
          ratio(faint, bg),
          `${faint} on ${bg} — text-surface-400 is used as real copy (strike-through prices, review counts, wizard step labels)`,
        ).toBeGreaterThanOrEqual(AA_BODY);
      });
    }

    it('::placeholder resolves to a colour readable on a card surface', () => {
      const placeholder = resolvedColor(PLACEHOLDER);
      expect(
        ratio(placeholder, '#faf9f6'),
        `::placeholder is ${placeholder} on #faf9f6 — placeholder text is text and needs ${AA_BODY}:1`,
      ).toBeGreaterThanOrEqual(AA_BODY);
    });

    it('::placeholder is not painted with the faint/decorative token', () => {
      expect(PLACEHOLDER).not.toMatch(/var\(\s*--color-text-faint\s*\)/);
    });
  });

  describe('A11Y-05 — footer text tokens on the dark footer background', () => {
    it('the footer scopes its own dark-surface text ramp', () => {
      const footer = block(FOOTER_SELECTOR);
      expect(footer).toMatch(/--color-surface-600\s*:/);
    });

    for (const token of ['--color-surface-400', '--color-surface-500', '--color-surface-600']) {
      it(`${token} reaches ${AA_BODY}:1 on the footer background ${FOOTER_BG}`, () => {
        const value = hexVar(block(FOOTER_SELECTOR), token);
        expect(
          ratio(value, FOOTER_BG),
          `${token} = ${value} inside the footer — copyright/legal/body copy needs ${AA_BODY}:1`,
        ).toBeGreaterThanOrEqual(AA_BODY);
      });
    }

    it('the footer ramp keeps its light-to-dim ordering', () => {
      const footer = block(FOOTER_SELECTOR);
      const l400 = relativeLuminance(hexVar(footer, '--color-surface-400'));
      const l500 = relativeLuminance(hexVar(footer, '--color-surface-500'));
      const l600 = relativeLuminance(hexVar(footer, '--color-surface-600'));
      expect(l400).toBeGreaterThan(l500);
      expect(l500).toBeGreaterThan(l600);
    });
  });

  describe('palette coherence — the neutral ramp still darkens monotonically', () => {
    it('surface 400 → 500 → 550 → 600 → 700 → 800 gets progressively darker', () => {
      const steps = ['400', '500', '550', '600', '700', '800'].map((s) => ({
        step: s,
        lum: relativeLuminance(hexVar(THEME, `--color-surface-${s}`)),
      }));
      for (let i = 1; i < steps.length; i++) {
        expect(
          steps[i].lum,
          `surface-${steps[i].step} must be darker than surface-${steps[i - 1].step}`,
        ).toBeLessThan(steps[i - 1].lum);
      }
    });

    it('the muted default stays clearly lighter than body text (#2a2520)', () => {
      const muted = relativeLuminance(hexVar(THEME, '--color-surface-500'));
      expect(muted).toBeGreaterThan(relativeLuminance('#2a2520'));
    });
  });
});
