import { COMPANY } from './company';

/**
 * TC-01 (P0, trust) — one import for the Section 80G honesty gate.
 *
 * The gate itself already existed (`COMPANY.donationLegal.HAS_80G_VERIFIED`,
 * false, with `pan` and `eightyGNumber` both null). What did not exist was a
 * cheap way to apply it, so it was wired into a handful of donation pages by
 * hand and ~28 other surfaces went on promising an income-tax deduction:
 * metadata descriptions, five localised homepages, two city landing pages, the
 * UK diaspora page, /press, /pitch, /discover, /checkout/success, the category
 * tree, the ROI calculator sold to temple chains, and the `donations`
 * subtitle in `lib/i18n/en.json`.
 *
 * Why the claim is false today, in the code rather than in policy:
 *
 *   - `COMPANY.donationLegal.HAS_80G_VERIFIED` is `false` and both
 *     `donationLegal.pan` and `donationLegal.eightyGNumber` are `null`.
 *   - `apps/api/src/lib/pdf-receipt.ts` `is80GEligible()` requires BOTH
 *     `gaushala80GNumber` and `gaushalaPan`; the receipt otherwise prints
 *     "Proof of donation — not a tax exemption certificate".
 *   - Those two values come from `gaushala_profiles.regn_80g` / `.pan`, which
 *     are SELECTed in exactly one place (`apps/api/src/routes/donations.ts`,
 *     the `SELECT pan, regn_80g FROM gaushala_profiles` at the top of the
 *     receipt path) and are written by no route in the repository. So
 *     `is80GEligible()` returns false for every donation ever made, and no
 *     donee can qualify no matter what they type into /list-gaushala.
 *
 * This is a GATE, not a deletion. Every call site below is a conditional on
 * one owner-controlled boolean: the day the 80G(5) certificate is on file,
 * flip `HAS_80G_VERIFIED` in lib/company.ts and every sentence returns
 * unchanged. Nothing here needs re-writing at that point.
 */
export const HAS_80G: boolean = COMPANY.donationLegal.HAS_80G_VERIFIED;

/** "80G receipt" once registered, "donation receipt" until then. */
export const RECEIPT_NOUN = HAS_80G ? '80G receipt' : 'donation receipt';

/** Plural of {@link RECEIPT_NOUN}. */
export const RECEIPT_NOUN_PLURAL = HAS_80G ? '80G receipts' : 'donation receipts';

/**
 * The phrase only when the registration exists, otherwise `fallback`
 * (empty by default, so an unbacked clause disappears rather than softens).
 */
export function withEightyG(phrase: string, fallback = ''): string {
  return HAS_80G ? phrase : fallback;
}

/**
 * The one-sentence disclosure a donor is entitled to while the registration is
 * missing. Mirrors the string `apps/api/src/lib/pdf-receipt.ts` stamps on the
 * PDF, so the page and the document a donor downloads cannot disagree.
 */
export const NO_80G_DISCLOSURE =
  'Every donation gets a numbered receipt PDF by email. It is proof of payment, ' +
  'not a tax-exemption certificate: Darshya holds no Section 80G registration ' +
  'yet, so nothing donated today can be claimed as an 80G deduction.';
