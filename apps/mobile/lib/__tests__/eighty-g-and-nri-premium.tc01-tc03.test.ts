import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { HAS_80G, RECEIPT_NOUN, RECEIPT_NOUN_PLURAL, withEightyG } from '../eighty-g';
import {
  NRI_PREMIUM_IS_SELLABLE,
  NRI_PREMIUM_WITHDRAWN_NOTICE,
} from '../nri-premium-availability';

/**
 * TC-01 / TC-03 / TC-04 — the mobile binary's copy of three claims.
 *
 * The audit measured the 80G promise across apps/web and the NRI Premium
 * shopfront across apps/web. apps/mobile was never in either denominator and
 * carried both: eight 80G assertions across six screens, a "80G Tax Exemption
 * Certified" row printed on every gaushala's own profile next to an "Animal
 * Welfare Board Reg." row, and a full ₹5,000/yr NRI Premium shopfront with six
 * benefit rows and a live buy button for a plan the API answers 400 on.
 *
 * apps/mobile cannot import from apps/web or apps/api, so the two facts are
 * mirrored in lib/eighty-g.ts and lib/nri-premium-availability.ts. The drift
 * cases below re-read the authoritative sources and fail the moment a mirror
 * and its source disagree — which is the only failure mode a mirrored constant
 * has.
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

describe('TC-01 — the mobile 80G mirror tracks apps/web/lib/company.ts', () => {
  it('has not drifted from the owner flag', () => {
    const companySrc = fs.readFileSync(
      path.join(REPO, 'apps/web/lib/company.ts'),
      'utf8',
    );
    const match = /HAS_80G_VERIFIED:\s*(true|false)/.exec(companySrc);
    expect(match, 'HAS_80G_VERIFIED not found in apps/web/lib/company.ts').not.toBeNull();
    expect(HAS_80G).toBe(match![1] === 'true');
  });

  it('the nouns follow the flag', () => {
    expect(RECEIPT_NOUN).toBe(HAS_80G ? '80G receipt' : 'donation receipt');
    expect(RECEIPT_NOUN_PLURAL).toBe(HAS_80G ? '80G receipts' : 'donation receipts');
    expect(withEightyG('80G receipts, ')).toBe(HAS_80G ? '80G receipts, ' : '');
    expect(withEightyG('X', 'Y')).toBe(HAS_80G ? 'X' : 'Y');
  });

  it('every screen that names 80G imports the gate', () => {
    const ungated = screens()
      .filter((abs) => /80\s?G/i.test(fs.readFileSync(abs, 'utf8')))
      .filter((abs) => !/from ['"][^'"]*eighty-g['"]/.test(fs.readFileSync(abs, 'utf8')))
      .map((abs) => path.relative(MOBILE, abs).split(path.sep).join('/'));
    expect(ungated).toEqual([]);
  });
});

describe('TC-11 — the gaushala profile awards no registration it has not checked', () => {
  const PROFILE = path.join(APP, '(gaushala)/profile.tsx');

  it('no longer prints "80G Tax Exemption Certified" or an AWBI registration', () => {
    const src = code(PROFILE);
    expect(src).not.toMatch(/80G Tax Exemption Certified/i);
    expect(src).not.toMatch(/Animal Welfare Board Reg/i);
  });

  it('says instead that nothing has been verified', () => {
    const src = code(PROFILE);
    expect(src).toMatch(/has not verified any statutory registration/i);
  });
});

describe('TC-03 / TC-04 — the mobile upgrade screen mirrors the withdrawal', () => {
  it('the withdrawal notice matches the API string character for character', () => {
    const apiSrc = fs.readFileSync(
      path.join(REPO, 'apps/api/src/services/subscription-entitlements.ts'),
      'utf8',
    );
    const block = /NRI_PREMIUM_WITHDRAWN_MESSAGE\s*=\s*([\s\S]*?);/.exec(apiSrc);
    const body = block?.[1];
    expect(body, 'NRI_PREMIUM_WITHDRAWN_MESSAGE not found').toBeTruthy();
    const apiMessage = [...(body ?? '').matchAll(/'((?:[^'\\]|\\.)*)'/g)]
      .map((m) => m[1])
      .join('');
    expect(apiMessage.length).toBeGreaterThan(80);
    expect(NRI_PREMIUM_WITHDRAWN_NOTICE).toBe(apiMessage);
  });

  it('is sellable only while at least one benefit names an enforcement site', () => {
    const apiSrc = fs.readFileSync(
      path.join(REPO, 'apps/api/src/services/subscription-entitlements.ts'),
      'utf8',
    );
    const enforced = [...apiSrc.matchAll(/enforcedBy:\s*(null|\{)/g)].map((m) => m[1]);
    expect(enforced.length).toBeGreaterThanOrEqual(6);
    expect(NRI_PREMIUM_IS_SELLABLE).toBe(enforced.some((e) => e !== 'null'));
  });

  it('every price, benefit list and buy affordance is behind that constant', () => {
    const src = code(path.join(APP, '(devotee)/upgrade.tsx'));
    // The three places the screen behaved like a shop.
    for (const fragment of ['₹5,000', 'BENEFITS.map', 'gate.canPurchase']) {
      const idx = src.indexOf(fragment);
      expect(idx, `${fragment} missing from upgrade.tsx`).toBeGreaterThan(-1);
    }
    // Each of them sits inside a NRI_PREMIUM_IS_SELLABLE conditional: there are
    // at least as many guards as shop affordances, and the withdrawal copy is
    // reachable.
    const guards = src.match(/NRI_PREMIUM_IS_SELLABLE/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(4);
    expect(src).toMatch(/NRI_PREMIUM_WITHDRAWN_NOTICE/);
  });

  it('no longer advertises 200+ temples or GST invoices', () => {
    const src = code(path.join(APP, '(devotee)/upgrade.tsx'));
    expect(src).not.toMatch(/200\+ temples/i);
    expect(src).not.toMatch(/GST invoices/i);
    expect(src).not.toMatch(/free 80G receipts/i);
  });

  it('the fineprint no longer promises access to the end of the paid period', () => {
    const src = code(path.join(APP, '(devotee)/upgrade.tsx'));
    expect(src).not.toMatch(/Cancel anytime from the web account page/);
    expect(src.replace(/\s+/g, ' ')).toMatch(/ends access immediately/i);
  });
});
