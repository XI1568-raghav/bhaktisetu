/**
 * TC-01 (P0, trust) — the Section 80G honesty gate, for the mobile binary.
 *
 * The audit measured this claim across apps/web and gated ~28 surfaces there.
 * apps/mobile was never counted and is a fifth live copy of the same promise:
 *
 *   app/(gaushala)/profile.tsx    "80G Tax Exemption Certified"
 *   app/(devotee)/donations.tsx   "PAN (required for an 80G receipt over ₹2,000)"
 *                                 "Your 80G receipt is emailed automatically"
 *   app/(devotee)/upgrade.tsx     "20% off all puja bookings + free 80G receipts"
 *   app/(devotee)/profile.tsx     "Live darshan, puja bookings, 80G donations"
 *                                 "80G donations, monthly seva subs"
 *   app/(onboard)/list-gaushala.tsx  "80G PDF receipts auto-emailed within 60 seconds"
 *   app/(onboard)/list-temple.tsx    "80G donation receipts"
 *   app/(onboard)/waitlist.tsx       "live darshan, verified pujas, 80G donations"
 *
 * Why the claim is false, in code rather than in policy:
 *
 *   - `apps/web/lib/company.ts` `donationLegal.HAS_80G_VERIFIED` is `false`,
 *     with `pan` and `eightyGNumber` both `null`.
 *   - `apps/api/src/lib/pdf-receipt.ts` `is80GEligible()` requires BOTH a donee
 *     80G registration number and a donee PAN; otherwise the PDF prints
 *     "Proof of donation — not a tax exemption certificate".
 *   - Those two values come from `gaushala_profiles.regn_80g` / `.pan`, which
 *     are SELECTed in exactly one place (apps/api/src/routes/donations.ts) and
 *     written by no route in the repository. `is80GEligible()` is therefore
 *     false for every donation, for every donee, always.
 *
 * apps/mobile cannot import from apps/web, so the flag is mirrored here and
 * lib/__tests__/eighty-g.test.ts re-reads apps/web/lib/company.ts and fails if
 * the two ever disagree. Flip BOTH in the same change on the day the 80G(5)
 * certificate is on file, and every sentence below returns unchanged.
 */
export const HAS_80G = false;

/** "80G receipt" once registered, "donation receipt" until then. */
export const RECEIPT_NOUN = HAS_80G ? '80G receipt' : 'donation receipt';

/** Plural of {@link RECEIPT_NOUN}. */
export const RECEIPT_NOUN_PLURAL = HAS_80G ? '80G receipts' : 'donation receipts';

/** The phrase only when the registration exists, otherwise `fallback`. */
export function withEightyG(phrase: string, fallback = ''): string {
  return HAS_80G ? phrase : fallback;
}

/** The disclosure a donor is entitled to while the registration is missing. */
export const NO_80G_DISCLOSURE =
  'Every donation gets a numbered receipt PDF by email. It is proof of payment, ' +
  'not a tax-exemption certificate: Darshya holds no Section 80G registration ' +
  'yet, so nothing donated today can be claimed as an 80G deduction.';
