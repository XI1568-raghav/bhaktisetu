import { COMPANY } from './company';

/**
 * TC-01 — which label the site footer's donate link carries.
 *
 * `app/layout.tsx` used to hardcode
 *   { href: "/donations", t: "footer", key: "donate80G" }
 * and `lib/i18n/en.json` resolves `footer.donate80G` to "Donate (80G)".
 *
 * The footer is rendered by the ROOT layout, so that was a promise of an
 * income-tax deduction on every page of the site — the widest 80G surface in
 * the product — while `COMPANY.donationLegal.HAS_80G_VERIFIED` is false and
 * both `eightyGNumber` and `pan` are null. It survived every page-level sweep
 * of the finding because the string "80G" lives in the i18n table rather than
 * in any page's copy.
 *
 * This lives in its own module rather than inline in the layout for one
 * reason: the layout is a Server Component that pulls next/font/google and the
 * whole i18n table and cannot be rendered under vitest, so an inline ternary
 * could only ever be checked by regex-scanning source — and a regex cannot
 * tell which branch of a ternary is the one that runs. Here the rule is
 * executable, and __tests__/tc01-footer-80g-every-page.test.ts exercises BOTH
 * gate states for real.
 *
 * A gate, not a deletion. `footer.donate80G` stays in the locale tables so
 * that flipping one flag in lib/company.ts restores the label everywhere.
 * `nav.donate` is the fallback because it is the only donate label present in
 * BOTH en and hi — a footer key missing from a locale renders as the raw key
 * name.
 */
export type FooterDonateLink = {
  href: '/donations';
  /** Which i18n table the key belongs to. */
  t: 'footer' | 'nav';
  key: 'donate80G' | 'donate';
};

export function footerDonateLink(
  has80G: boolean = COMPANY.donationLegal.HAS_80G_VERIFIED,
): FooterDonateLink {
  return has80G
    ? { href: '/donations', t: 'footer', key: 'donate80G' }
    : { href: '/donations', t: 'nav', key: 'donate' };
}
