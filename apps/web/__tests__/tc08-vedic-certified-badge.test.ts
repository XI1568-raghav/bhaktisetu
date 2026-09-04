import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TC-08 (P1, trust) — the last "Vedic certified" badge.
 *
 * The published four-step pandit vetting process (Vedic credential
 * verification, references from two temples or senior pandits, a 30-day
 * probationary video review, and a displayed per-pandit trust score) was
 * removed from lib/faqs.ts, /why-darshya, /nri-pujas, /pujas/marriage and
 * /temples/[slug]/pujas in earlier passes. One printed badge survived all of
 * them: app/pujas/page.tsx rendered the literal words "Vedic certified" inside
 * the wedding card, one file away from app/pujas/marriage/page.tsx, where the
 * identical badge had already been corrected.
 *
 * Nothing backs the word. `Priest.isVerified`, `Priest.verificationStatus` and
 * `Priest.aadhaarVerified` have no writer outside apps/api/prisma/seed.ts, and
 * `aadhaarVerified` is read in exactly one place — payment.service.ts — as a
 * PAYOUT gate. That payout gate is the only step that runs, so it is the only
 * step the badge may name.
 *
 * The scan below strips comments first, so the many notes that quote the
 * removed phrase in order to explain its removal neither trip nor satisfy it.
 * It fails against the tree as it stood on 2026-08-31, where
 * `app/pujas/page.tsx` matched `/vedic[-\s]certified/i` in rendered JSX text.
 */
const WEB = path.resolve(__dirname, '..');
const SKIP = new Set([
  'node_modules',
  '.next',
  '.turbo',
  'coverage',
  'playwright-report',
  'test-results',
  '__tests__',
  'e2e',
]);

/** The pandit-vetting claims TC-08 names, in the shapes the product shipped. */
const VETTING_FICTIONS: Array<[string, RegExp]> = [
  ['Vedic certified badge', /vedic[-\s]certified/i],
  ['certified pandit', /certified pandits?\b/i],
  ['published credential-verification step', /vedic credential verification/i],
  ['published temple-reference step', /(references? from )?(2|two) (temples?|senior pandits?) ref/i],
  ['published probation step', /30[-\s]day (video )?probation/i],
  ['published per-pandit trust score', /trust score on every pandit|per-pandit trust score is (published|displayed)/i],
  ['pandit credentials shown on a listing', /shows? .{0,40}pandit credentials/i],
];

function sourceFiles(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        walk(path.join(dir, e.name));
        continue;
      }
      if (!/\.(tsx?|json)$/.test(e.name)) continue;
      if (e.name.includes('.test.')) continue;
      out.push(path.join(dir, e.name));
    }
  })(WEB);
  return out;
}

/** Source with block, line and JSX comments removed. */
function code(abs: string): string {
  return fs
    .readFileSync(abs, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('TC-08 — no surface under apps/web prints a vetting step that does not run', () => {
  const files = sourceFiles();

  it('found a real file set to scan', () => {
    // Guards the whole suite against a silently empty walk.
    expect(files.length).toBeGreaterThan(300);
    expect(files.some((f) => f.endsWith(`pujas${path.sep}page.tsx`))).toBe(true);
  });

  for (const [label, pattern] of VETTING_FICTIONS) {
    it(`no file publishes: ${label}`, () => {
      const offenders = files
        .filter((abs) => pattern.test(code(abs)))
        .map((abs) => path.relative(WEB, abs).split(path.sep).join('/'));
      expect(offenders).toEqual([]);
    });
  }

  it('the comment-stripper does not hide a live claim', () => {
    // Proves the stripper removes comments only, so the negatives above cannot
    // be satisfied by moving a claim into JSX that merely looks commented.
    const live = '<span>Vedic certified</span>';
    expect(/vedic[-\s]certified/i.test(live)).toBe(true);
    const commented = '{/* Vedic certified */}\n// Vedic certified\n/* Vedic certified */';
    const stripped = commented
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(/vedic[-\s]certified/i.test(stripped)).toBe(false);
  });
});

describe('TC-08 — the wedding card names the step that actually runs', () => {
  it('/pujas prints the Aadhaar payout gate where the badge used to be', () => {
    const src = code(path.join(WEB, 'app/pujas/page.tsx'));
    expect(src).toMatch(/Pandit paid only after Aadhaar KYC/);
    expect(src).not.toMatch(/vedic[-\s]certified/i);
  });

  it('/pujas/marriage says the same thing, so the two cards cannot drift again', () => {
    const src = code(path.join(WEB, 'app/pujas/marriage/page.tsx'));
    expect(src).toMatch(/Pandit paid only after Aadhaar KYC/);
  });

  /**
   * File-scoped rather than repo-wide on purpose. "verified pandit" also
   * appears across app/astrology/** (baby-name, numerology, kundli-milan),
   * which is a different provider class and a different lane; a repo-wide
   * assertion here would either fail on files this change did not touch or be
   * weakened by an allowlist. These are the catalogue surfaces TC-08 names.
   */
  const CATALOGUE_SURFACES = [
    'app/pujas/page.tsx',
    'app/pujas/[slug]/page.tsx',
    'app/pujas/marriage/page.tsx',
    'app/deity/[slug]/page.tsx',
    'app/temples/[slug]/pujas/page.tsx',
  ];

  for (const rel of CATALOGUE_SURFACES) {
    it(`${rel} claims no verified pandit or verified temple`, () => {
      const src = code(path.join(WEB, rel));
      expect(src.length).toBeGreaterThan(500);
      expect(src).not.toMatch(/verified pandits?/i);
      expect(src).not.toMatch(/verified temples?\b/i);
      expect(src).not.toMatch(/certified pandits?/i);
    });
  }

  it('the help centre no longer offers pandit credentials on a temple listing', () => {
    const src = fs.readFileSync(path.join(WEB, 'lib/help-articles.ts'), 'utf8');
    expect(src).not.toMatch(/shows trust score, location, and pandit credentials/);
    expect(src).toMatch(/We do not publish pandit credentials/);
  });
});
