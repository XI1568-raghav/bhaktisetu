import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { footerDonateLink } from '../lib/footer-donate-link';
import { COMPANY } from '../lib/company';

/**
 * TC-01 (P0) — the widest 80G surface in the product was the site FOOTER.
 *
 * `app/layout.tsx` built its "Explore" column with
 *   { href: "/donations", t: "footer", key: "donate80G" }
 * and `lib/i18n/en.json` resolves `footer.donate80G` to "Donate (80G)".
 *
 * The footer is rendered by the ROOT layout, so that promise of an income-tax
 * deduction shipped on EVERY page of the site — a wider surface than every
 * page-level 80G reference in the audit combined — while
 * `COMPANY.donationLegal.HAS_80G_VERIFIED` is false and both `eightyGNumber`
 * and `pan` are null. It escaped every page-level sweep of this finding
 * because the string "80G" lives in the i18n table, not in any page's copy.
 *
 * The layout is a Server Component that pulls next/font/google and the whole
 * i18n table and cannot be rendered here — the same constraint
 * `cookie-consent-withdrawal.test.tsx` records for the same file. So the rule
 * itself lives in `lib/footer-donate-link.ts` and is exercised for real in
 * BOTH gate states below, and only the wiring is asserted on source.
 *
 * Confirmed RED before the fix: the label the layout selected resolved to
 * "Donate (80G)", and the `donate80G` occurrence in layout.tsx sat under no
 * gate at all.
 */

const WEB = path.resolve(__dirname, '..');

/**
 * Strip block and `//` line comments, preserving line structure.
 *
 * `[^:]` before `//` keeps `https://` inside string literals intact. Both this
 * file and the layout quote "donate80G" in their own prose, so a raw scan
 * would be satisfied by an explanation of the defect instead of its absence.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function locale(name: 'en' | 'hi'): Record<string, Record<string, string> | undefined> {
  return JSON.parse(fs.readFileSync(path.join(WEB, 'lib/i18n', `${name}.json`), 'utf8'));
}

/** Resolve a `{ t, key }` footer entry exactly the way the layout's `tFor` does. */
function resolve(name: 'en' | 'hi', table: string, key: string): string | undefined {
  return locale(name)[table]?.[key];
}

describe('TC-01 — the footer on every page promises no 80G deduction', () => {
  it('the comment stripper works in both directions', () => {
    expect(stripComments('// key: "donate80G"\n')).not.toMatch(/donate80G/);
    expect(stripComments('/* key: "donate80G" */')).not.toMatch(/donate80G/);
    expect(stripComments('{ key: "donate80G" }')).toMatch(/donate80G/);
    expect(stripComments("const u = 'https://x.test/a';")).toMatch(/https:\/\/x\.test\/a/);
  });

  it('the owner gate is still shut, which is what makes this a defect', () => {
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal.eightyGNumber).toBeNull();
  });

  it('the label rendered today carries no 80G claim, in every locale', () => {
    const link = footerDonateLink();
    expect(link.href).toBe('/donations');

    for (const name of ['en', 'hi'] as const) {
      const value = resolve(name, link.t, link.key);
      // A missing key renders as the raw key name in that locale, which the
      // layout's own CookieSettingsButton comment calls out as a defect class.
      expect(value, `${name}.json has no ${link.t}.${link.key}`).toBeTruthy();
      expect(value).not.toMatch(/80G/i);
    }
  });

  it('is a gate and not a deletion — the flag brings the 80G label back', () => {
    const link = footerDonateLink(true);
    const value = resolve('en', link.t, link.key);
    expect(value).toMatch(/80G/);
  });

  it('the layout takes its donate label from the gate, not from a literal', () => {
    const src = stripComments(fs.readFileSync(path.join(WEB, 'app/layout.tsx'), 'utf8'));
    expect(src).toMatch(/footerDonateLink\(\)/);
    // The hardcoded 80G key must not survive anywhere in the layout's own code.
    expect(src).not.toMatch(/donate80G/);
  });
});
