/**
 * DU-10 — body copy ranges 12px to 18px, five different paragraph sizes.
 *
 * __tests__/design-tokens.test.ts already locks the TOKEN LAYER for this
 * finding: one scale, --type-* aliased onto --text-*, --text-xs floored at
 * 12px, --text-base floored at 16px. That work landed in an earlier wave and
 * is not re-litigated here.
 *
 * What the token layer cannot reach is a CALL SITE that opts out of the scale
 * entirely by writing an arbitrary value — `text-[15px]` resolves to exactly
 * 15px no matter what --text-* says, so every such site is a sixth, seventh,
 * eighth paragraph size that no token can correct. This guard covers those.
 *
 * SCOPE, stated plainly so nobody reads it as more than it is:
 *
 *  - BODY RANGE ONLY. An arbitrary size at or above 20px is a display/hero
 *    decision (app/about/page.tsx still sets its hero to text-[2.5rem] /
 *    sm:text-[4.5rem], a deliberate two-step that a single fluid clamp would
 *    not reproduce). Hero type is NOT migrated and DU-10 stays open for it.
 *
 *  - TWO ALLOWLISTS, both narrow and both justified below. They are asserted
 *    to be non-empty and asserted to still contain what they claim, so neither
 *    can quietly become a dumping ground for new off-scale copy.
 *
 * Comments are stripped before any assertion. A guard in this sweep must not
 * be satisfiable — nor tripped — by prose that mentions the utility it hunts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next') continue;
        walk(p);
      } else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(root('app'));
  walk(root('components'));
  return out;
}

const rel = (f: string) => path.relative(root('.'), f).split(path.sep).join('/');

/** Source with comments removed, so prose never counts as a call site. */
function code(f: string): string {
  return readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Files that render a scaled-down phone screen inside a device bezel. The type
 * inside those frames is ILLUSTRATION at mockup scale, not body copy a devotee
 * reads — the badges sit in pills with 1.5px of padding, and raising them to
 * the 12px floor would overflow the frame rather than make anything legible.
 * Asserted below to actually contain a device frame.
 */
const DEVICE_MOCKUPS = [
  'app/demo/[role]/role-demo-client.tsx',
  'app/mobile/layout.tsx',
  'app/mobile/darshan/page.tsx',
];

/**
 * The brand wordmark, at text-[15px] font-semibold tracking-tight in all four
 * places it appears. Its size is a BRAND decision, not a body-copy decision:
 * it must stay identical across these four files, it is optically paired with
 * tracking-tight/leading-none inside a fixed-height masthead, and the mobile
 * headers have little horizontal slack. Deliberately NOT migrated by the
 * mechanical sweep — listed as open for a design call, not silently converted.
 */
const BRAND_WORDMARK = [
  'components/Logo.tsx',
  'components/MobileNav.tsx',
  'components/MobileNavV2.tsx',
  'app/layout.tsx',
];

const EXEMPT = new Set([...DEVICE_MOCKUPS, ...BRAND_WORDMARK]);

/** `text-[15px]` / `text-[0.9rem]` — an arbitrary size, not a scale step. */
const ARBITRARY = /text-\[(\d+(?:\.\d+)?)(px|rem)\]/g;

/** Below this is body copy; at or above it is display type, out of scope. */
const BODY_CEILING_PX = 20;

function arbitraryBodySizes(f: string): string[] {
  const hits: string[] = [];
  for (const m of code(f).matchAll(ARBITRARY)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
    if (px < BODY_CEILING_PX) hits.push(m[0]);
  }
  return hits;
}

describe('DU-10 — body copy comes from the scale, not from arbitrary values', () => {
  it('no content surface ships an arbitrary body-range text size', () => {
    const offenders: Record<string, string[]> = {};
    for (const f of sources()) {
      const r = rel(f);
      if (EXEMPT.has(r)) continue;
      const hits = arbitraryBodySizes(f);
      if (hits.length) offenders[r] = [...new Set(hits)];
    }
    expect(
      offenders,
      'an arbitrary text-[Npx] is a paragraph size no --text-* token can correct',
    ).toEqual({});
  });

  it('the sizes those call sites moved onto are real scale steps', () => {
    const css = readFileSync(root('app/globals.css'), 'utf8');
    for (const step of ['sm', 'base']) {
      expect(css, `--text-${step} must exist for the migrated call sites to resolve`).toMatch(
        new RegExp(`--text-${step}\\s*:`),
      );
    }
  });
});

describe('DU-10 — the exemptions are narrow and stay honest', () => {
  /**
   * A file qualifies for the mockup exemption if it paints the bezel itself
   * (role-demo-client's PhoneFrame, app/mobile/layout.tsx's 390x844 shell) or
   * if a route layout above it does — app/mobile/darshan/page.tsx renders only
   * the screen contents and inherits the frame from app/mobile/layout.tsx.
   */
  const FRAME = /w-\[3(75|90)px\]|PhoneFrame/;

  function insideDeviceFrame(r: string): boolean {
    if (FRAME.test(code(root(r)))) return true;
    const parts = r.split('/');
    for (let i = parts.length - 1; i > 0; i--) {
      const layout = [...parts.slice(0, i), 'layout.tsx'].join('/');
      try {
        if (FRAME.test(code(root(layout)))) return true;
      } catch {
        /* no layout at this level */
      }
    }
    return false;
  }

  it('every device-mockup file really does render inside a device frame', () => {
    for (const r of DEVICE_MOCKUPS) {
      expect(
        insideDeviceFrame(r),
        `${r} is exempt as a device mockup but neither it nor any route layout above it paints a phone frame`,
      ).toBe(true);
    }
  });

  it('mockup files are the only place sub-12px type survives', () => {
    const tiny: Record<string, string[]> = {};
    for (const f of sources()) {
      const hits = [...code(f).matchAll(ARBITRARY)]
        .filter((m) => (m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) < 12)
        .map((m) => m[0]);
      if (hits.length) tiny[rel(f)] = [...new Set(hits)];
    }
    expect(Object.keys(tiny).sort()).toEqual(
      DEVICE_MOCKUPS.filter((r) => Object.keys(tiny).includes(r)).sort(),
    );
    expect(Object.keys(tiny).length, 'sub-12px type vanished; drop this exemption').toBeGreaterThan(0);
  });

  it('the wordmark exemption still holds exactly one size, shared by all four files', () => {
    const sizes = new Set<string>();
    for (const r of BRAND_WORDMARK) {
      for (const m of code(root(r)).matchAll(ARBITRARY)) {
        const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
        if (px < BODY_CEILING_PX) sizes.add(m[0]);
      }
    }
    expect(
      [...sizes],
      'the wordmark is exempt only because it is ONE size in four files; it is not a licence for arbitrary type',
    ).toEqual(['text-[15px]']);
  });
});
