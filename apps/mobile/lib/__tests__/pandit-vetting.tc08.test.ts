import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  HAS_PANDIT_VETTING,
  VERIFIED_ADJ,
  verifiedNoun,
  PANDIT_VETTING_CLAUSE,
} from '../pandit-vetting';

/**
 * TC-08 (P1, trust) — the mobile binary's copy of the pandit vetting claim.
 *
 * The published four-step process (Vedic credential verification, references
 * from two temples or senior pandits, a 30-day probationary video review, a
 * per-pandit trust score) was removed from `apps/web` in earlier waves and
 * pinned there by five tests. All five walk `apps/web`. `apps/mobile` was
 * never in the denominator and carried two live copies:
 *
 *   app/(devotee)/pujas.tsx          "N pujas · verified priests, video proof"
 *   app/(onboard)/become-priest.tsx  "Join 200+ verified pandits performing
 *                                     pujas for Darshya devotees."
 *
 * The second is also a headcount claim. Measured on production 2026-09-01:
 *
 *   $ curl -s 'https://api.darshya.online/api/v1/priests?limit=100' \
 *       | python -c "import sys,json;print(len(json.load(sys.stdin)['priests']))"
 *   3
 *
 * Three, and all three are seed rows — `Priest.isVerified` is written only in
 * `apps/api/prisma/seed.ts` and `apps/api/scripts/seed-demo-users.ts`, and
 * `apps/api/src/routes/priests-public.ts` filters that directory on exactly
 * that column.
 *
 * Every case below fails against the tree as it stood before this change.
 */
const MOBILE = path.resolve(__dirname, '../..');
const REPO = path.resolve(MOBILE, '../..');
const APP = path.join(MOBILE, 'app');

function code(abs: string): string {
  return fs
    .readFileSync(abs, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function screens(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '__tests__') continue;
        walk(path.join(dir, e.name));
      } else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) {
        out.push(path.join(dir, e.name));
      }
    }
  })(APP);
  return out;
}

describe('TC-08 — the mobile mirror tracks apps/api/src/lib/pandit-vetting.ts', () => {
  it('has not drifted from the API flag', () => {
    const apiSrc = fs.readFileSync(
      path.join(REPO, 'apps/api/src/lib/pandit-vetting.ts'),
      'utf8',
    );
    const match = /export const HAS_PANDIT_VETTING = (true|false);/.exec(apiSrc);
    expect(match, 'HAS_PANDIT_VETTING not found in apps/api/src/lib/pandit-vetting.ts')
      .not.toBeNull();
    expect(HAS_PANDIT_VETTING).toBe(match![1] === 'true');
  });

  it('publishes the same honest clause as apps/web and apps/api, byte for byte', () => {
    const web = fs.readFileSync(
      path.join(REPO, 'apps/web/app/temples/[slug]/pujas/page.tsx'),
      'utf8',
    );
    // The canonical sentence is pinned on the web page by
    // apps/web/__tests__/pandit-vetting-claim.tc08.test.tsx; this asserts the
    // mobile mirror says the identical thing rather than a paraphrase.
    expect(web).toContain(PANDIT_VETTING_CLAUSE);
    // The API mirror builds the same sentence by concatenation, so compare
    // after collapsing `' +\n    '` joins rather than on the raw bytes.
    const api = fs
      .readFileSync(path.join(REPO, 'apps/api/src/lib/pandit-vetting.ts'), 'utf8')
      .replace(/' \+\s*\n\s*'/g, '');
    expect(api).toContain(PANDIT_VETTING_CLAUSE);
  });

  it('the adjective follows the flag', () => {
    expect(VERIFIED_ADJ).toBe(HAS_PANDIT_VETTING ? 'verified ' : '');
    expect(verifiedNoun('priests')).toBe(HAS_PANDIT_VETTING ? 'verified priests' : 'priests');
    expect(verifiedNoun('pandits')).toBe(HAS_PANDIT_VETTING ? 'verified pandits' : 'pandits');
  });
});

describe('TC-08 — no mobile screen prints a vetting step that does not run', () => {
  const files = screens();

  it('found a real screen set to scan', () => {
    // Guards every negative below against a silently empty walk.
    expect(files.length).toBeGreaterThan(30);
    expect(files.some((f) => f.endsWith('pujas.tsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('become-priest.tsx'))).toBe(true);
  });

  const FICTIONS: Array<[string, RegExp]> = [
    ['verified pandits', /verified pandits?/i],
    ['verified priests', /verified priests?/i],
    ['certified pandits', /certified pandits?/i],
    ['Vedic certified', /vedic[-\s]certified/i],
    ['fabricated pandit headcount', /\d{2,}\+\s*(verified\s*)?(pandit|priest)/i],
  ];

  for (const [label, pattern] of FICTIONS) {
    it(`no screen publishes: ${label}`, () => {
      const offenders = files
        .filter((abs) => pattern.test(code(abs)))
        .map((abs) => path.relative(MOBILE, abs).split(path.sep).join('/'));
      expect(offenders).toEqual([]);
    });
  }

  it('the comment-stripper removes comments only', () => {
    // Otherwise the negatives above could be satisfied by text that merely
    // looks commented, and the docblocks explaining the removal would trip.
    expect(/verified pandits/i.test('<Text>verified pandits</Text>')).toBe(true);
    const stripped = code(path.join(MOBILE, 'lib/pandit-vetting.ts'));
    expect(stripped).not.toMatch(/Join 200\+ verified pandits performing/);
    expect(fs.readFileSync(path.join(MOBILE, 'lib/pandit-vetting.ts'), 'utf8')).toMatch(
      /Join 200\+ verified pandits performing/,
    );
  });
});

describe('TC-08 — the two corrected screens say what is true instead', () => {
  it('the puja catalogue header keeps video proof and drops the adjective', () => {
    const src = code(path.join(APP, '(devotee)/pujas.tsx'));
    expect(src.length).toBeGreaterThan(500);
    expect(src).toMatch(/video proof/);
    expect(src).toMatch(/verifiedNoun\('priests'\)/);
    expect(src).not.toMatch(/verified priests/i);
  });

  it('the pandit recruitment screen matches the corrected web page', () => {
    const src = code(path.join(APP, '(onboard)/become-priest.tsx'));
    expect(src.length).toBeGreaterThan(500);
    expect(src).not.toMatch(/200\+/);
    // The payout promise the web page already corrected: uniform 80% share and
    // a manual transfer, not "in your bank account every Monday".
    expect(src).toMatch(/keep 80% of every booking/);
    expect(src).not.toMatch(/60-80%/);
    expect(src).not.toMatch(/every Monday/);
    expect(src).toMatch(/transfer it manually/);
  });
});
